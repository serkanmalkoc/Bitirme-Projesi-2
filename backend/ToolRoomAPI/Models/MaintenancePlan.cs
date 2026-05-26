namespace ToolRoomAPI.Models
{
    public class MaintenancePlan
    {
        public int Id { get; set; }

        public int ToolId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public DateTime PlannedDate { get; set; } = DateTime.Now;

        public string Status { get; set; } = "Planlandı";

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime? CompletedAt { get; set; }

        public Tool? Tool { get; set; }
    }
}