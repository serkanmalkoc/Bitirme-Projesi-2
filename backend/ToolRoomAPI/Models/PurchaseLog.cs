namespace ToolRoomAPI.Models
{
    public class PurchaseLog
    {
        public int Id { get; set; }

        public int ToolId { get; set; }

        public int Quantity { get; set; }

        public decimal UnitPrice { get; set; }

        public decimal TotalPrice { get; set; }

        public DateTime PurchaseDate { get; set; } = DateTime.Now;

        public Tool? Tool { get; set; }
    }
}