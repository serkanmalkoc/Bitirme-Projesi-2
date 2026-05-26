using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ToolRoomAPI.Data;
using ToolRoomAPI.Hubs;
using ToolRoomAPI.Models;

namespace ToolRoomAPI.Services
{
    public class ToolLifeBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHubContext<ToolRoomHub> _hubContext;

        public ToolLifeBackgroundService(
            IServiceScopeFactory scopeFactory,
            IHubContext<ToolRoomHub> hubContext)
        {
            _scopeFactory = scopeFactory;
            _hubContext = hubContext;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);

                using var scope = _scopeFactory.CreateScope();

                var context = scope.ServiceProvider
                    .GetRequiredService<ToolRoomDbContext>();

                var runningTools = await context.Tools
                    .Where(tool =>
                        tool.IsRunning &&
                        tool.RemainingLifeMinute > 0)
                    .ToListAsync(stoppingToken);

                if (runningTools.Count == 0)
                {
                    continue;
                }

                var wallet = await context.Wallets.FirstOrDefaultAsync(stoppingToken);

                if (wallet == null)
                {
                    wallet = new Wallet
                    {
                        Balance = 0,
                        TotalEarned = 0,
                        TotalSpent = 0,
                        UpdatedAt = DateTime.Now
                    };

                    context.Wallets.Add(wallet);
                    await context.SaveChangesAsync(stoppingToken);
                }

                decimal earnedThisTick = 0;

                foreach (var tool in runningTools)
                {
                    tool.RemainingLifeMinute -= 1;

                    if (tool.IncomePerMinute > 0)
                    {
                        wallet.Balance += tool.IncomePerMinute;
                        wallet.TotalEarned += tool.IncomePerMinute;
                        earnedThisTick += tool.IncomePerMinute;
                    }

                    if (tool.RemainingLifeMinute <= 0)
                    {
                        tool.RemainingLifeMinute = 0;
                        tool.IsRunning = false;
                        tool.StartedAt = null;
                    }

                    await _hubContext.Clients.All.SendAsync(
                        "ToolLifeTick",
                        new
                        {
                            ToolId = tool.Id,
                            ToolName = tool.ToolName,
                            ToolType = tool.ToolType,
                            RemainingLifeMinute = tool.RemainingLifeMinute,
                            TotalLifeMinute = tool.TotalLifeMinute,
                            Stock = tool.Stock,
                            CriticalStock = tool.CriticalStock,
                            IsRunning = tool.IsRunning,
                            IncomePerMinute = tool.IncomePerMinute,
                            PurchasePrice = tool.PurchasePrice
                        },
                        stoppingToken
                    );
                }

                wallet.UpdatedAt = DateTime.Now;

                await context.SaveChangesAsync(stoppingToken);

                await _hubContext.Clients.All.SendAsync(
                    "FinanceUpdated",
                    new
                    {
                        Balance = wallet.Balance,
                        TotalEarned = wallet.TotalEarned,
                        TotalSpent = wallet.TotalSpent,
                        EarnedThisTick = earnedThisTick,
                        UpdatedAt = wallet.UpdatedAt
                    },
                    stoppingToken
                );
            }
        }
    }
}