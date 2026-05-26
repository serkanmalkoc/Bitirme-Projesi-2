using Microsoft.EntityFrameworkCore;
using ToolRoomAPI.Models;

namespace ToolRoomAPI.Data
{
    public class ToolRoomDbContext : DbContext
    {
        public ToolRoomDbContext(DbContextOptions<ToolRoomDbContext> options)
            : base(options)
        {
        }

        public DbSet<Tool> Tools { get; set; }

        public DbSet<ToolUsageLog> ToolUsageLogs { get; set; }

        public DbSet<User> Users { get; set; }

        public DbSet<Wallet> Wallets { get; set; }

        public DbSet<PurchaseLog> PurchaseLogs { get; set; }

        public DbSet<MaintenancePlan> MaintenancePlans { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Tool>()
                .Property(x => x.IncomePerMinute)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Tool>()
                .Property(x => x.PurchasePrice)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Wallet>()
                .Property(x => x.Balance)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Wallet>()
                .Property(x => x.TotalEarned)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Wallet>()
                .Property(x => x.TotalSpent)
                .HasPrecision(18, 2);

            modelBuilder.Entity<PurchaseLog>()
                .Property(x => x.UnitPrice)
                .HasPrecision(18, 2);

            modelBuilder.Entity<PurchaseLog>()
                .Property(x => x.TotalPrice)
                .HasPrecision(18, 2);

            modelBuilder.Entity<ToolUsageLog>()
                .HasOne(x => x.Tool)
                .WithMany(x => x.ToolUsageLogs)
                .HasForeignKey(x => x.ToolId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PurchaseLog>()
                .HasOne(x => x.Tool)
                .WithMany(x => x.PurchaseLogs)
                .HasForeignKey(x => x.ToolId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MaintenancePlan>()
                .HasOne(x => x.Tool)
                .WithMany()
                .HasForeignKey(x => x.ToolId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}