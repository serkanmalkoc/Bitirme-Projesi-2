using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolRoomAPI.Data;

namespace ToolRoomAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly ToolRoomDbContext _context;

        public DashboardController(ToolRoomDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetDashboard()
        {
            var totalTools = _context.Tools.Count();

            var criticalStockTools = _context.Tools
                .Count(x => x.Stock <= x.CriticalStock);

            var lowLifeTools = _context.Tools
                .Count(x => x.RemainingLifeMinute < 200);

            return Ok(new
            {
                totalTools,
                criticalStockTools,
                lowLifeTools
            });
        }

        [HttpGet("critical-stock")]
        public IActionResult GetCriticalStockTools()
        {
            var tools = _context.Tools
                .Where(x => x.Stock <= x.CriticalStock)
                .Select(x => new
                {
                    x.Id,
                    x.ToolName,
                    x.Stock,
                    x.CriticalStock
                })
                .ToList();

            return Ok(tools);
        }
    }
}