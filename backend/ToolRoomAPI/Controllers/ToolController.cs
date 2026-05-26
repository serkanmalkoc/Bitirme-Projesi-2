using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ToolRoomAPI.Data;
using ToolRoomAPI.Hubs;
using ToolRoomAPI.Models;

namespace ToolRoomAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ToolController : ControllerBase
    {
        private readonly ToolRoomDbContext _context;
        private readonly IHubContext<ToolRoomHub> _hubContext;

        public ToolController(
            ToolRoomDbContext context,
            IHubContext<ToolRoomHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetTools()
        {
            var tools = await _context.Tools
                .OrderBy(x => x.Id)
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
                    x.StartedAt,
                    x.IncomePerMinute,
                    x.PurchasePrice
                })
                .ToListAsync();

            return Ok(tools);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetToolById(int id)
        {
            var tool = await _context.Tools
                .Where(x => x.Id == id)
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
                    x.StartedAt,
                    x.IncomePerMinute,
                    x.PurchasePrice
                })
                .FirstOrDefaultAsync();

            if (tool == null)
            {
                return NotFound("Takım bulunamadı.");
            }

            return Ok(tool);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateTool(Tool tool)
        {
            if (tool.TotalLifeMinute <= 0)
            {
                return BadRequest("Toplam ömür 0'dan büyük olmalıdır.");
            }

            if (tool.RemainingLifeMinute < 0)
            {
                return BadRequest("Kalan ömür negatif olamaz.");
            }

            if (tool.RemainingLifeMinute > tool.TotalLifeMinute)
            {
                return BadRequest("Kalan ömür toplam ömürden büyük olamaz.");
            }

            if (tool.Stock < 0)
            {
                return BadRequest("Stok negatif olamaz.");
            }

            if (tool.CriticalStock < 0)
            {
                return BadRequest("Kritik stok negatif olamaz.");
            }

            if (tool.IncomePerMinute < 0)
            {
                return BadRequest("Dakika başı gelir negatif olamaz.");
            }

            if (tool.PurchasePrice < 0)
            {
                return BadRequest("Satın alma fiyatı negatif olamaz.");
            }

            tool.IsRunning = false;
            tool.StartedAt = null;

            _context.Tools.Add(tool);

            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ToolCreated", new
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

            return Ok(tool);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateTool(int id, Tool updatedTool)
        {
            var tool = await _context.Tools.FindAsync(id);

            if (tool == null)
            {
                return NotFound("Takım bulunamadı.");
            }

            if (updatedTool.TotalLifeMinute <= 0)
            {
                return BadRequest("Toplam ömür 0'dan büyük olmalıdır.");
            }

            if (updatedTool.RemainingLifeMinute < 0)
            {
                return BadRequest("Kalan ömür negatif olamaz.");
            }

            if (updatedTool.RemainingLifeMinute > updatedTool.TotalLifeMinute)
            {
                return BadRequest("Kalan ömür toplam ömürden büyük olamaz.");
            }

            if (updatedTool.Stock < 0)
            {
                return BadRequest("Stok negatif olamaz.");
            }

            if (updatedTool.CriticalStock < 0)
            {
                return BadRequest("Kritik stok negatif olamaz.");
            }

            if (updatedTool.IncomePerMinute < 0)
            {
                return BadRequest("Dakika başı gelir negatif olamaz.");
            }

            if (updatedTool.PurchasePrice < 0)
            {
                return BadRequest("Satın alma fiyatı negatif olamaz.");
            }

            tool.ToolName = updatedTool.ToolName;
            tool.ToolType = updatedTool.ToolType;
            tool.TotalLifeMinute = updatedTool.TotalLifeMinute;
            tool.RemainingLifeMinute = updatedTool.RemainingLifeMinute;
            tool.Stock = updatedTool.Stock;
            tool.CriticalStock = updatedTool.CriticalStock;
            tool.IncomePerMinute = updatedTool.IncomePerMinute;
            tool.PurchasePrice = updatedTool.PurchasePrice;

            await _context.SaveChangesAsync();

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

            return Ok(tool);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteTool(int id)
        {
            var tool = await _context.Tools.FindAsync(id);

            if (tool == null)
            {
                return NotFound("Takım bulunamadı.");
            }

            _context.Tools.Remove(tool);

            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ToolDeleted", new
            {
                ToolId = id
            });

            return Ok("Takım başarıyla silindi.");
        }



        [HttpPut("{id}/start")]
        [Authorize(Roles = "Admin,Operator")]
        public async Task<IActionResult> StartTool(int id)
        {
            var tool = await _context.Tools.FindAsync(id);

            if (tool == null)
            {
                return NotFound("Takım bulunamadı.");
            }

            if (tool.RemainingLifeMinute <= 0)
            {
                return BadRequest("Bu takımın kalan ömrü yok. Çalıştırılamaz.");
            }

            if (tool.IsRunning)
            {
                return BadRequest("Bu takım zaten çalışıyor.");
            }

            tool.IsRunning = true;
            tool.StartedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ToolRunningChanged", new
            {
                ToolId = tool.Id,
                ToolName = tool.ToolName,
                IsRunning = tool.IsRunning,
                StartedAt = tool.StartedAt,
                RemainingLifeMinute = tool.RemainingLifeMinute,
                IncomePerMinute = tool.IncomePerMinute,
                PurchasePrice = tool.PurchasePrice
            });

            return Ok(new
            {
                Message = "Takım çalıştırıldı.",
                ToolId = tool.Id,
                ToolName = tool.ToolName,
                IsRunning = tool.IsRunning,
                StartedAt = tool.StartedAt,
                RemainingLifeMinute = tool.RemainingLifeMinute,
                IncomePerMinute = tool.IncomePerMinute,
                PurchasePrice = tool.PurchasePrice
            });
        }

        [HttpPut("{id}/stop")]
        [Authorize(Roles = "Admin,Operator")]
        public async Task<IActionResult> StopTool(int id)
        {
            var tool = await _context.Tools.FindAsync(id);

            if (tool == null)
            {
                return NotFound("Takım bulunamadı.");
            }

            if (!tool.IsRunning)
            {
                return BadRequest("Bu takım zaten duruyor.");
            }

            tool.IsRunning = false;
            tool.StartedAt = null;

            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ToolRunningChanged", new
            {
                ToolId = tool.Id,
                ToolName = tool.ToolName,
                IsRunning = tool.IsRunning,
                StartedAt = tool.StartedAt,
                RemainingLifeMinute = tool.RemainingLifeMinute,
                IncomePerMinute = tool.IncomePerMinute,
                PurchasePrice = tool.PurchasePrice
            });

            return Ok(new
            {
                Message = "Takım durduruldu.",
                ToolId = tool.Id,
                ToolName = tool.ToolName,
                IsRunning = tool.IsRunning,
                RemainingLifeMinute = tool.RemainingLifeMinute,
                IncomePerMinute = tool.IncomePerMinute,
                PurchasePrice = tool.PurchasePrice
            });
        }
    }
}
