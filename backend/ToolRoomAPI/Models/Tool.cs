namespace ToolRoomAPI.Models
{
    public class Tool
    {
        public int Id { get; set; }

        public string ToolName { get; set; }

        public string ToolType { get; set; }

        public int TotalLifeMinute { get; set; }

        public int RemainingLifeMinute { get; set; }

        public int Stock { get; set; }

        public int CriticalStock { get; set; }
    }
}