namespace ToolRoomAPI.Models
{
    public class ToolUsageLog
    {
        public int Id { get; set; }

        public int ToolId { get; set; }

        public int UsedMinute { get; set; }

        public DateTime UsageDate { get; set; }

        public Tool? Tool { get; set; }
    }
}