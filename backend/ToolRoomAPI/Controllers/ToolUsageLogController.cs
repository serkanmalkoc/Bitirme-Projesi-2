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
    public class ToolUsageLogController : ControllerBase
    {
        private readonly ToolRoomDbContext _context;
        private readonly IHubContext<ToolRoomHub> _hubContext;

        public ToolUsageLogController(
            ToolRoomDbContext context,
            IHubContext<ToolRoomHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsageLogs()
        {
            var logs = await _context.ToolUsageLogs
                .Include(x => x.Tool)
                .OrderByDescending(x => x.UsageDate)
                .Select(x => new
                {
                    id = x.Id,
                    toolId = x.ToolId,
                    usedMinute = x.UsedMinute,
                    usageDate = x.UsageDate,
                    tool = new
                    {
                        id = x.Tool.Id,
                        toolName = x.Tool.ToolName,
                        toolType = x.Tool.ToolType,
                        totalLifeMinute = x.Tool.TotalLifeMinute,
                        remainingLifeMinute = x.Tool.RemainingLifeMinute,
                        stock = x.Tool.Stock,
                        criticalStock = x.Tool.CriticalStock,
                        isRunning = x.Tool.IsRunning,
                        startedAt = x.Tool.StartedAt
                    }
                })
                .ToListAsync();

            return Ok(logs);
        }

        [HttpPost]
        public async Task<IActionResult> CreateUsageLog(ToolUsageLog log)
        {
            var tool = await _context.Tools.FindAsync(log.ToolId);

            if (tool == null)
            {
                return NotFound("Takım bulunamadı.");
            }

            if (log.UsedMinute <= 0)
            {
                return BadRequest("Kullanım süresi 0'dan büyük olmalıdır.");
            }

            if (tool.RemainingLifeMinute < log.UsedMinute)
            {
                return BadRequest("Kullanım süresi kalan takım ömründen fazla olamaz.");
            }

            tool.RemainingLifeMinute -= log.UsedMinute;

            if (tool.RemainingLifeMinute <= 0)
            {
                tool.RemainingLifeMinute = 0;
                tool.IsRunning = false;
                tool.StartedAt = null;
            }

            log.UsageDate = DateTime.Now;

            _context.ToolUsageLogs.Add(log);

            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ToolUsageAdded", new
            {
                ToolId = tool.Id,
                ToolName = tool.ToolName,
                ToolType = tool.ToolType,
                UsedMinute = log.UsedMinute,
                RemainingLifeMinute = tool.RemainingLifeMinute,
                TotalLifeMinute = tool.TotalLifeMinute,
                Stock = tool.Stock,
                CriticalStock = tool.CriticalStock,
                IsRunning = tool.IsRunning,
                StartedAt = tool.StartedAt,
                UsageDate = log.UsageDate
            });

            return Ok(new
            {
                message = "Kullanım kaydı eklendi ve takım ömrü güncellendi.",
                toolId = tool.Id,
                toolName = tool.ToolName,
                usedMinute = log.UsedMinute,
                remainingLifeMinute = tool.RemainingLifeMinute,
                isRunning = tool.IsRunning,
                stockWarning = tool.Stock <= tool.CriticalStock
                    ? "Kritik stok seviyesi!"
                    : "Stok durumu normal"
            });
        }

        [HttpGet("tool/{toolId}")]
        public async Task<IActionResult> GetLogsByTool(int toolId)
        {
            var logs = await _context.ToolUsageLogs
                .Include(x => x.Tool)
                .Where(x => x.ToolId == toolId)
                .OrderByDescending(x => x.UsageDate)
                .Select(x => new
                {
                    id = x.Id,
                    toolId = x.ToolId,
                    usedMinute = x.UsedMinute,
                    usageDate = x.UsageDate,
                    tool = new
                    {
                        id = x.Tool.Id,
                        toolName = x.Tool.ToolName,
                        toolType = x.Tool.ToolType,
                        totalLifeMinute = x.Tool.TotalLifeMinute,
                        remainingLifeMinute = x.Tool.RemainingLifeMinute,
                        stock = x.Tool.Stock,
                        criticalStock = x.Tool.CriticalStock,
                        isRunning = x.Tool.IsRunning,
                        startedAt = x.Tool.StartedAt
                    }
                })
                .ToListAsync();

            return Ok(logs);
        }
    }
}