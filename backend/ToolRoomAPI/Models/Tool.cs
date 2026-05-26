using System.ComponentModel.DataAnnotations;

namespace ToolRoomAPI.Models
{
    public class Tool
    {
        public int Id { get; set; }

        [Required]
        public string ToolName { get; set; } = string.Empty;

        [Required]
        public string ToolType { get; set; } = string.Empty;

        public int TotalLifeMinute { get; set; }

        public int RemainingLifeMinute { get; set; }

        public int Stock { get; set; }

        public int CriticalStock { get; set; }

        public bool IsRunning { get; set; } = false;

        public DateTime? StartedAt { get; set; }

        public decimal IncomePerMinute { get; set; } = 0;

        public decimal PurchasePrice { get; set; } = 0;

        public List<ToolUsageLog>? ToolUsageLogs { get; set; }

        public List<PurchaseLog>? PurchaseLogs { get; set; }
    }
}