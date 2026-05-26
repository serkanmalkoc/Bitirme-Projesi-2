namespace ToolRoomAPI.Models
{
    public class Wallet
    {
        public int Id { get; set; }

        public decimal Balance { get; set; } = 0;

        public decimal TotalEarned { get; set; } = 0;

        public decimal TotalSpent { get; set; } = 0;

        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }
}