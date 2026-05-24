using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ToolRoomAPI.Data;
using ToolRoomAPI.Models;

namespace ToolRoomAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ToolController : ControllerBase
    {
        private readonly ToolRoomDbContext _context;

        public ToolController(ToolRoomDbContext context)
        {
            _context = context;
        }

        // Tüm takımları listeler
        [HttpGet]
        public async Task<IActionResult> GetTools()
        {
            var tools = await _context.Tools.ToListAsync();

            return Ok(tools);
        }

        // ID'ye göre tek takım getirir
        [HttpGet("{id}")]
        public async Task<IActionResult> GetToolById(int id)
        {
            var tool = await _context.Tools.FindAsync(id);

            if (tool == null)
            {
                return NotFound("Takım bulunamadı.");
            }

            return Ok(tool);
        }

        // Yeni takım ekler
        [HttpPost]
        public async Task<IActionResult> CreateTool(Tool tool)
        {
            tool.RemainingLifeMinute = tool.TotalLifeMinute;

            _context.Tools.Add(tool);

            await _context.SaveChangesAsync();

            return Ok(tool);
        }

        // Takım günceller
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTool(int id, Tool updatedTool)
        {
            var tool = await _context.Tools.FindAsync(id);

            if (tool == null)
            {
                return NotFound("Güncellenecek takım bulunamadı.");
            }

            tool.ToolName = updatedTool.ToolName;
            tool.ToolType = updatedTool.ToolType;
            tool.TotalLifeMinute = updatedTool.TotalLifeMinute;
            tool.RemainingLifeMinute = updatedTool.RemainingLifeMinute;
            tool.Stock = updatedTool.Stock;
            tool.CriticalStock = updatedTool.CriticalStock;

            await _context.SaveChangesAsync();

            return Ok(tool);
        }

        // Takım siler
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTool(int id)
        {
            var tool = await _context.Tools.FindAsync(id);

            if (tool == null)
            {
                return NotFound("Silinecek takım bulunamadı.");
            }

            _context.Tools.Remove(tool);

            await _context.SaveChangesAsync();

            return Ok("Takım başarıyla silindi.");
        }
    }
}