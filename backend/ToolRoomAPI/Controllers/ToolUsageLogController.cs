using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ToolRoomAPI.Data;
using ToolRoomAPI.Models;

namespace ToolRoomAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ToolUsageLogController : ControllerBase
    {
        private readonly ToolRoomDbContext _context;

        public ToolUsageLogController(ToolRoomDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsageLogs()
        {
            var logs = await _context.ToolUsageLogs
                .Include(x => x.Tool)
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

            log.UsageDate = DateTime.Now;

            _context.ToolUsageLogs.Add(log);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Kullanım kaydı eklendi ve takım ömrü güncellendi.",
                ToolName = tool.ToolName,
                UsedMinute = log.UsedMinute,
                RemainingLifeMinute = tool.RemainingLifeMinute,
                StockWarning = tool.Stock <= tool.CriticalStock
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
                .ToListAsync();

            return Ok(logs);
        }
    }
}