using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ToolRoomAPI.Data;
using ToolRoomAPI.Hubs;
using ToolRoomAPI.Models;

namespace ToolRoomAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MaintenancePlanController : ControllerBase
    {
        private readonly ToolRoomDbContext _context;
        private readonly IHubContext<ToolRoomHub> _hubContext;

        public MaintenancePlanController(
            ToolRoomDbContext context,
            IHubContext<ToolRoomHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Operator")]
        public async Task<IActionResult> GetMaintenancePlans()
        {
            var plans = await _context.MaintenancePlans
                .Include(x => x.Tool)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new
                {
                    x.Id,
                    x.ToolId,
                    ToolName = x.Tool != null ? x.Tool.ToolName : "",
                    ToolType = x.Tool != null ? x.Tool.ToolType : "",
                    RemainingLifeMinute = x.Tool != null ? x.Tool.RemainingLifeMinute : 0,
                    TotalLifeMinute = x.Tool != null ? x.Tool.TotalLifeMinute : 0,
                    Stock = x.Tool != null ? x.Tool.Stock : 0,
                    CriticalStock = x.Tool != null ? x.Tool.CriticalStock : 0,
                    IsRunning = x.Tool != null && x.Tool.IsRunning,
                    x.Title,
                    x.Description,
                    x.PlannedDate,
                    x.Status,
                    x.CreatedAt,
                    x.CompletedAt
                })
                .ToListAsync();

            return Ok(plans);
        }

        [HttpGet("recommendations")]
        [Authorize(Roles = "Admin,Operator")]
        public async Task<IActionResult> GetRecommendations()
        {
            var existingActivePlanToolIds = await _context.MaintenancePlans
                .Where(x =>
                    x.Status == "Planlandı" ||
                    x.Status == "Devam Ediyor")
                .Select(x => x.ToolId)
                .ToListAsync();

            var tools = await _context.Tools
                .Where(x =>
                    x.RemainingLifeMinute < 200 ||
                    x.Stock <= x.CriticalStock)
                .OrderBy(x => x.RemainingLifeMinute)
                .Select(x => new
                {
                    x.Id,
                    x.ToolName,
                    x.ToolType,
                    x.TotalLifeMinute,
                    x.RemainingLifeMinute,
                    x.Stock,
                    x.CriticalStock,
                    x.IsRunning,
                    x.IncomePerMinute,
                    x.PurchasePrice,
                    LifePercent = x.TotalLifeMinute > 0
                        ? Math.Round((decimal)x.RemainingLifeMinute / x.TotalLifeMinute * 100, 2)
                        : 0,
                    Reason =
                        x.RemainingLifeMinute < 200 && x.Stock <= x.CriticalStock
                            ? "Kritik ömür ve kritik stok"
                            : x.RemainingLifeMinute < 200
                                ? "Kritik ömür"
                                : "Kritik stok",
                    Priority =
                        x.RemainingLifeMinute < 50 || x.Stock == 0
                            ? "Yüksek"
                            : x.RemainingLifeMinute < 200 || x.Stock <= x.CriticalStock
                                ? "Orta"
                                : "Düşük",
                    HasActivePlan = existingActivePlanToolIds.Contains(x.Id),
                    SuggestedDate = DateTime.Now.AddDays(
                        x.RemainingLifeMinute < 50 || x.Stock == 0
                            ? 1
                            : 3)
                })
                .ToListAsync();

            return Ok(tools);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateMaintenancePlan(CreateMaintenancePlanRequest request)
        {
            var tool = await _context.Tools.FindAsync(request.ToolId);

            if (tool == null)
            {
                return NotFound("Takım bulunamadı.");
            }

            var hasActivePlan = await _context.MaintenancePlans.AnyAsync(x =>
                x.ToolId == request.ToolId &&
                (x.Status == "Planlandı" || x.Status == "Devam Ediyor"));

            if (hasActivePlan)
            {
                return BadRequest("Bu takım için zaten aktif bir bakım planı bulunmaktadır.");
            }

            var plan = new MaintenancePlan
            {
                ToolId = request.ToolId,
                Title = string.IsNullOrWhiteSpace(request.Title)
                    ? $"{tool.ToolName} bakım/değişim planı"
                    : request.Title.Trim(),
                Description = string.IsNullOrWhiteSpace(request.Description)
                    ? $"{tool.ToolName} için kalan ömür veya stok durumuna göre bakım planı oluşturuldu."
                    : request.Description.Trim(),
                PlannedDate = request.PlannedDate,
                Status = "Planlandı",
                CreatedAt = DateTime.Now
            };

            _context.MaintenancePlans.Add(plan);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("MaintenancePlanCreated", new
            {
                plan.Id,
                plan.ToolId,
                ToolName = tool.ToolName,
                ToolType = tool.ToolType,
                plan.Title,
                plan.Description,
                plan.PlannedDate,
                plan.Status,
                plan.CreatedAt
            });

            return Ok(new
            {
                message = "Bakım planı başarıyla oluşturuldu.",
                plan.Id,
                plan.ToolId,
                ToolName = tool.ToolName,
                ToolType = tool.ToolType,
                plan.Title,
                plan.Description,
                plan.PlannedDate,
                plan.Status,
                plan.CreatedAt
            });
        }

[HttpPut("{id}/status")]
[Authorize(Roles = "Admin,Operator")]
public async Task<IActionResult> UpdateMaintenanceStatus(int id, UpdateMaintenanceStatusRequest request)
{
    var plan = await _context.MaintenancePlans
        .Include(x => x.Tool)
        .FirstOrDefaultAsync(x => x.Id == id);

    if (plan == null)
    {
        return NotFound("Bakım planı bulunamadı.");
    }

    if (plan.Tool == null)
    {
        return NotFound("Bakım planına bağlı takım bulunamadı.");
    }

    var allowedStatuses = new List<string>
    {
        "Planlandı",
        "Devam Ediyor",
        "Tamamlandı",
        "İptal Edildi"
    };

    if (!allowedStatuses.Contains(request.Status))
    {
        return BadRequest("Geçersiz bakım durumu.");
    }

    var tool = plan.Tool;

    plan.Status = request.Status;

    if (request.Status == "Planlandı")
    {
        plan.CompletedAt = null;
    }

    if (request.Status == "Devam Ediyor")
    {
        tool.IsRunning = false;
        tool.StartedAt = null;
        plan.CompletedAt = null;
    }

    if (request.Status == "Tamamlandı")
    {
        if (tool.Stock <= 0)
        {
            return BadRequest("Bakım/değişim tamamlanamaz. Takım stoğu 0 olduğu için yedek takım kullanılamaz.");
        }

        tool.Stock -= 1;
        tool.RemainingLifeMinute = tool.TotalLifeMinute;
        tool.IsRunning = false;
        tool.StartedAt = null;

        plan.CompletedAt = DateTime.Now;
    }

    if (request.Status == "İptal Edildi")
    {
        plan.CompletedAt = null;
    }

    await _context.SaveChangesAsync();

    await _hubContext.Clients.All.SendAsync("MaintenancePlanUpdated", new
    {
        plan.Id,
        plan.ToolId,
        ToolName = tool.ToolName,
        ToolType = tool.ToolType,
        plan.Title,
        plan.Description,
        plan.PlannedDate,
        plan.Status,
        plan.CreatedAt,
        plan.CompletedAt
    });

    await _hubContext.Clients.All.SendAsync("ToolUpdated", new
    {
        tool.Id,
        tool.ToolName,
        tool.ToolType,
        tool.TotalLifeMinute,
        tool.RemainingLifeMinute,
        tool.Stock,
        tool.CriticalStock,
        tool.IsRunning,
        tool.StartedAt,
        tool.IncomePerMinute,
        tool.PurchasePrice
    });

    return Ok(new
    {
        message = request.Status == "Tamamlandı"
            ? "Bakım tamamlandı. Takım ömrü yenilendi ve stoktan 1 adet düşüldü."
            : request.Status == "Devam Ediyor"
                ? "Bakım devam ediyor. Takım çalışıyorsa otomatik durduruldu."
                : "Bakım durumu güncellendi.",
        plan.Id,
        plan.ToolId,
        ToolName = tool.ToolName,
        ToolType = tool.ToolType,
        plan.Title,
        plan.Description,
        plan.PlannedDate,
        plan.Status,
        plan.CreatedAt,
        plan.CompletedAt,
        Tool = new
        {
            tool.Id,
            tool.ToolName,
            tool.ToolType,
            tool.TotalLifeMinute,
            tool.RemainingLifeMinute,
            tool.Stock,
            tool.CriticalStock,
            tool.IsRunning,
            tool.StartedAt,
            tool.IncomePerMinute,
            tool.PurchasePrice
        }
    });
}

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteMaintenancePlan(int id)
        {
            var plan = await _context.MaintenancePlans.FindAsync(id);

            if (plan == null)
            {
                return NotFound("Bakım planı bulunamadı.");
            }

            _context.MaintenancePlans.Remove(plan);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("MaintenancePlanDeleted", new
            {
                Id = id
            });

            return Ok("Bakım planı başarıyla silindi.");
        }
    }

    public class CreateMaintenancePlanRequest
    {
        public int ToolId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public DateTime PlannedDate { get; set; } = DateTime.Now;
    }

    public class UpdateMaintenanceStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }
}