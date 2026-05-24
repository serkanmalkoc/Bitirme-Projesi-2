using Microsoft.EntityFrameworkCore;
using ToolRoomAPI.Models;

namespace ToolRoomAPI.Data
{
    public class ToolRoomDbContext : DbContext
    {
        public ToolRoomDbContext(
            DbContextOptions<ToolRoomDbContext> options)
            : base(options)
        {
        }

        public DbSet<Tool> Tools { get; set; }
        public DbSet<ToolUsageLog> ToolUsageLogs { get; set; }
        public DbSet<User> Users { get; set; }
    }
}