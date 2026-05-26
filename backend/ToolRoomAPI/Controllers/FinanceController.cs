using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ToolRoomAPI.Data;
using ToolRoomAPI.Hubs;
using ToolRoomAPI.Models;

namespace ToolRoomAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FinanceController : ControllerBase
    {
        private readonly ToolRoomDbContext _context;
        private readonly IHubContext<ToolRoomHub> _hubContext;

        public FinanceController(
            ToolRoomDbContext context,
            IHubContext<ToolRoomHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        private async Task<Wallet> GetOrCreateWallet()
        {
            var wallet = await _context.Wallets.FirstOrDefaultAsync();

            if (wallet == null)
            {
                wallet = new Wallet
                {
                    Balance = 0,
                    TotalEarned = 0,
                    TotalSpent = 0,
                    UpdatedAt = DateTime.Now
                };

                _context.Wallets.Add(wallet);
                await _context.SaveChangesAsync();
            }

            return wallet;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetFinanceSummary()
        {
            var wallet = await GetOrCreateWallet();

            var tools = await _context.Tools
                .OrderBy(x => x.Id)
                .ToListAsync();

            var criticalStockTools = tools
                .Where(x => x.Stock <= x.CriticalStock)
                .Select(x => new
                {
                    id = x.Id,
                    toolName = x.ToolName,
                    toolType = x.ToolType,
                    stock = x.Stock,
                    criticalStock = x.CriticalStock,
                    neededQuantity = x.CriticalStock - x.Stock + 1,
                    purchasePrice = x.PurchasePrice,
                    totalNeededPrice = (x.CriticalStock - x.Stock + 1) * x.PurchasePrice,
                    incomePerMinute = x.IncomePerMinute,
                    canPurchase = wallet.Balance >= ((x.CriticalStock - x.Stock + 1) * x.PurchasePrice)
                })
                .ToList();

            var runningTools = tools
                .Where(x => x.IsRunning)
                .Select(x => new
                {
                    id = x.Id,
                    toolName = x.ToolName,
                    toolType = x.ToolType,
                    remainingLifeMinute = x.RemainingLifeMinute,
                    incomePerMinute = x.IncomePerMinute,
                    startedAt = x.StartedAt
                })
                .ToList();

            var purchaseLogs = await _context.PurchaseLogs
                .Include(x => x.Tool)
                .OrderByDescending(x => x.PurchaseDate)
                .Select(x => new
                {
                    id = x.Id,
                    toolId = x.ToolId,
                    toolName = x.Tool != null ? x.Tool.ToolName : "",
                    toolType = x.Tool != null ? x.Tool.ToolType : "",
                    quantity = x.Quantity,
                    unitPrice = x.UnitPrice,
                    totalPrice = x.TotalPrice,
                    purchaseDate = x.PurchaseDate
                })
                .Take(20)
                .ToListAsync();

            return Ok(new
            {
                wallet = new
                {
                    id = wallet.Id,
                    balance = wallet.Balance,
                    totalEarned = wallet.TotalEarned,
                    totalSpent = wallet.TotalSpent,
                    updatedAt = wallet.UpdatedAt
                },
                runningTools,
                criticalStockTools,
                purchaseLogs
            });
        }

        [HttpPost("purchase")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> PurchaseTool(PurchaseRequest request)
        {
            if (request.ToolId <= 0)
            {
                return BadRequest("Geçerli bir takım seçiniz.");
            }

            if (request.Quantity <= 0)
            {
                return BadRequest("Satın alma adedi 0'dan büyük olmalıdır.");
            }

            var tool = await _context.Tools.FindAsync(request.ToolId);

            if (tool == null)
            {
                return NotFound("Takım bulunamadı.");
            }

            if (tool.PurchasePrice <= 0)
            {
                return BadRequest("Bu takım için satın alma fiyatı tanımlanmamış.");
            }

            var wallet = await GetOrCreateWallet();

            var totalPrice = request.Quantity * tool.PurchasePrice;

            if (wallet.Balance < totalPrice)
            {
                return BadRequest(
                    $"Yetersiz bakiye. Gerekli tutar: {totalPrice} TL, mevcut bakiye: {wallet.Balance} TL."
                );
            }

            wallet.Balance -= totalPrice;
            wallet.TotalSpent += totalPrice;
            wallet.UpdatedAt = DateTime.Now;

            tool.Stock += request.Quantity;

            var purchaseLog = new PurchaseLog
            {
                ToolId = tool.Id,
                Quantity = request.Quantity,
                UnitPrice = tool.PurchasePrice,
                TotalPrice = totalPrice,
                PurchaseDate = DateTime.Now
            };

            _context.PurchaseLogs.Add(purchaseLog);

            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("FinanceUpdated", new
            {
                Balance = wallet.Balance,
                TotalEarned = wallet.TotalEarned,
                TotalSpent = wallet.TotalSpent,
                ToolId = tool.Id,
                ToolName = tool.ToolName,
                Stock = tool.Stock,
                CriticalStock = tool.CriticalStock
            });

            await _hubContext.Clients.All.SendAsync("ToolUpdated", new
            {
                tool.Id,
                tool.ToolName,
                tool.ToolType,
                tool.TotalLifeMinute,
                tool.RemainingLifeMinute,
                tool.Stock,
                tool.CriticalStock,
                tool.IsRunning,
                tool.StartedAt,
                tool.IncomePerMinute,
                tool.PurchasePrice
            });

            return Ok(new
            {
                message = "Satın alma işlemi başarıyla tamamlandı.",
                toolId = tool.Id,
                toolName = tool.ToolName,
                quantity = request.Quantity,
                unitPrice = tool.PurchasePrice,
                totalPrice,
                newStock = tool.Stock,
                balance = wallet.Balance
            });
        }

        [HttpPost("purchase-all-available")]
[Authorize(Roles = "Admin")]
public async Task<IActionResult> PurchaseAllAvailable()
{
    var wallet = await GetOrCreateWallet();

    var criticalTools = await _context.Tools
        .Where(x =>
            x.Stock <= x.CriticalStock &&
            x.PurchasePrice > 0)
        .OrderBy(x => x.Id)
        .ToListAsync();

    if (criticalTools.Count == 0)
    {
        return BadRequest("Kritik stokta satın alınacak takım bulunamadı.");
    }

    var purchasedItems = new List<object>();
    var skippedItems = new List<object>();

    foreach (var tool in criticalTools)
    {
        var neededQuantity = tool.CriticalStock - tool.Stock + 1;

        if (neededQuantity <= 0)
        {
            continue;
        }

        var totalPrice = neededQuantity * tool.PurchasePrice;

        if (wallet.Balance >= totalPrice)
        {
            wallet.Balance -= totalPrice;
            wallet.TotalSpent += totalPrice;
            wallet.UpdatedAt = DateTime.Now;

            tool.Stock += neededQuantity;

            var purchaseLog = new PurchaseLog
            {
                ToolId = tool.Id,
                Quantity = neededQuantity,
                UnitPrice = tool.PurchasePrice,
                TotalPrice = totalPrice,
                PurchaseDate = DateTime.Now
            };

            _context.PurchaseLogs.Add(purchaseLog);

            purchasedItems.Add(new
            {
                toolId = tool.Id,
                toolName = tool.ToolName,
                quantity = neededQuantity,
                unitPrice = tool.PurchasePrice,
                totalPrice = totalPrice,
                newStock = tool.Stock
            });
        }
        else
        {
            skippedItems.Add(new
            {
                toolId = tool.Id,
                toolName = tool.ToolName,
                neededQuantity = neededQuantity,
                totalPrice = totalPrice,
                currentBalance = wallet.Balance,
                missingBalance = totalPrice - wallet.Balance
            });
        }
    }

    if (purchasedItems.Count == 0)
    {
        return BadRequest("Mevcut bakiye ile satın alınabilecek kritik takım bulunamadı.");
    }

    await _context.SaveChangesAsync();

    await _hubContext.Clients.All.SendAsync("FinanceUpdated", new
    {
        Balance = wallet.Balance,
        TotalEarned = wallet.TotalEarned,
        TotalSpent = wallet.TotalSpent,
        UpdatedAt = wallet.UpdatedAt
    });

    await _hubContext.Clients.All.SendAsync("BulkPurchaseCompleted", new
    {
        PurchasedCount = purchasedItems.Count,
        SkippedCount = skippedItems.Count,
        Balance = wallet.Balance
    });

    return Ok(new
    {
        message = "Toplu satın alma işlemi tamamlandı.",
        purchasedCount = purchasedItems.Count,
        skippedCount = skippedItems.Count,
        balance = wallet.Balance,
        purchasedItems,
        skippedItems
    });
}

        [HttpPost("add-balance")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AddBalance(AddBalanceRequest request)
        {
            if (request.Amount <= 0)
            {
                return BadRequest("Eklenecek bakiye 0'dan büyük olmalıdır.");
            }

            var wallet = await GetOrCreateWallet();

            wallet.Balance += request.Amount;
            wallet.TotalEarned += request.Amount;
            wallet.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("FinanceUpdated", new
            {
                Balance = wallet.Balance,
                TotalEarned = wallet.TotalEarned,
                TotalSpent = wallet.TotalSpent
            });

            return Ok(new
            {
                message = "Bakiye başarıyla eklendi.",
                amount = request.Amount,
                balance = wallet.Balance
            });
        }
    }

    public class PurchaseRequest
    {
        public int ToolId { get; set; }

        public int Quantity { get; set; }
    }

    public class AddBalanceRequest
    {
        public decimal Amount { get; set; }
    }
}