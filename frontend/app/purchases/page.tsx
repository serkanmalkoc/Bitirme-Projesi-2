"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/app/services/api";
import connection from "@/app/services/signalr";
import toast, { Toaster } from "react-hot-toast";

import {
  Activity,
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock3,
  Coins,
  History,
  Package,
  RefreshCcw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wrench,
} from "lucide-react";

type WalletInfo = {
  id: number;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  updatedAt: string;
};

type RunningTool = {
  id: number;
  toolName: string;
  toolType: string;
  remainingLifeMinute: number;
  incomePerMinute: number;
  startedAt?: string | null;
};

type CriticalStockTool = {
  id: number;
  toolName: string;
  toolType: string;
  stock: number;
  criticalStock: number;
  neededQuantity: number;
  purchasePrice: number;
  totalNeededPrice: number;
  incomePerMinute: number;
  canPurchase: boolean;
};

type PurchaseLog = {
  id: number;
  toolId: number;
  toolName: string;
  toolType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  purchaseDate: string;
};

type FinanceSummary = {
  wallet: WalletInfo;
  runningTools: RunningTool[];
  criticalStockTools: CriticalStockTool[];
  purchaseLogs: PurchaseLog[];
};

type User = {
  id: number;
  fullName: string;
  username: string;
  role: string;
};

type FinanceUpdatedEvent = {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  earnedThisTick?: number;
  updatedAt?: string;
};

export default function PurchasesPage() {
  const router = useRouter();

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState<number | null>(null);
  const [isAddingBalance, setIsAddingBalance] = useState(false);
  const [isBulkPurchasing, setIsBulkPurchasing] = useState(false);

  const [manualBalance, setManualBalance] = useState("");
  const [lastUpdate, setLastUpdate] = useState("");

  const getStoredUser = () => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser);
  };

  const checkAuth = () => {
    const storedUser = getStoredUser();

    if (!storedUser) {
      router.push("/login");
      return null;
    }

    const token =
      storedUser.token ||
      storedUser.Token ||
      storedUser.accessToken ||
      storedUser.AccessToken;

    if (!token) {
      localStorage.removeItem("user");
      router.push("/login");
      return null;
    }

    setUser(storedUser);
    return storedUser;
  };

  const fetchFinanceSummary = async () => {
    try {
      const authUser = checkAuth();

      if (!authUser) {
        return;
      }

      const response = await api.get("/Finance/summary");

      setSummary(response.data);
      setLastUpdate(new Date().toLocaleTimeString("tr-TR"));
    } catch (error: any) {
      console.error(error);

      if (error.response?.status === 401) {
        localStorage.removeItem("user");
        toast.error("Oturum süresi doldu. Tekrar giriş yapınız.");

        setTimeout(() => {
          router.push("/login");
        }, 800);

        return;
      }

      toast.error("Finans bilgileri yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceSummary();
  }, []);

  useEffect(() => {
    const startSignalR = async () => {
      try {
        if (connection.state === "Disconnected") {
          await connection.start();
          console.log("Purchases SignalR bağlantısı kuruldu.");
        }
      } catch (error) {
        console.error("SignalR bağlantı hatası:", error);
      }
    };

    startSignalR();

    connection.on("FinanceUpdated", (eventData: FinanceUpdatedEvent) => {
      setSummary((prevSummary) => {
        if (!prevSummary) {
          return prevSummary;
        }

        return {
          ...prevSummary,
          wallet: {
            ...prevSummary.wallet,
            balance: eventData.balance,
            totalEarned: eventData.totalEarned,
            totalSpent: eventData.totalSpent,
            updatedAt: eventData.updatedAt || new Date().toISOString(),
          },
        };
      });

      setLastUpdate(new Date().toLocaleTimeString("tr-TR"));

      if (eventData.earnedThisTick && eventData.earnedThisTick > 0) {
        toast.success(
          `Çalışan takımlardan ${formatCurrency(
            eventData.earnedThisTick
          )} gelir elde edildi.`
        );
      }
    });

    connection.on("ToolUpdated", () => {
      fetchFinanceSummary();
    });

    connection.on("BulkPurchaseCompleted", () => {
      fetchFinanceSummary();
    });

    return () => {
      connection.off("FinanceUpdated");
      connection.off("ToolUpdated");
      connection.off("BulkPurchaseCompleted");
    };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAddBalance = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!manualBalance || Number(manualBalance) <= 0) {
      toast.error("Eklenecek bakiye 0'dan büyük olmalıdır.");
      return;
    }

    try {
      setIsAddingBalance(true);

      await api.post("/Finance/add-balance", {
        amount: Number(manualBalance),
      });

      setManualBalance("");
      toast.success("Bakiye başarıyla eklendi.");

      await fetchFinanceSummary();
    } catch (error: any) {
      console.error(error);

      if (error.response?.data) {
        toast.error(error.response.data);
      } else {
        toast.error("Bakiye eklenemedi.");
      }
    } finally {
      setIsAddingBalance(false);
    }
  };

  const handlePurchase = async (tool: CriticalStockTool) => {
    if (!summary) {
      return;
    }

    if (summary.wallet.balance < tool.totalNeededPrice) {
      toast.error("Bu satın alma için bakiye yetersiz.");
      return;
    }

    try {
      setIsPurchasing(tool.id);

      await api.post("/Finance/purchase", {
        toolId: tool.id,
        quantity: tool.neededQuantity,
      });

      toast.success(`${tool.toolName} için satın alma tamamlandı.`);

      await fetchFinanceSummary();
    } catch (error: any) {
      console.error(error);

      if (error.response?.data) {
        toast.error(error.response.data);
      } else {
        toast.error("Satın alma işlemi başarısız oldu.");
      }
    } finally {
      setIsPurchasing(null);
    }
  };

  const totalNeededBudget = useMemo(() => {
    if (!summary) {
      return 0;
    }

    return summary.criticalStockTools.reduce(
      (total, tool) => total + tool.totalNeededPrice,
      0
    );
  }, [summary]);

  const purchasableCount = useMemo(() => {
    if (!summary) {
      return 0;
    }

    return summary.criticalStockTools.filter(
      (tool) => summary.wallet.balance >= tool.totalNeededPrice
    ).length;
  }, [summary]);

  const notPurchasableCount = useMemo(() => {
    if (!summary) {
      return 0;
    }

    return summary.criticalStockTools.length - purchasableCount;
  }, [summary, purchasableCount]);

  const missingBudget = useMemo(() => {
    if (!summary) {
      return 0;
    }

    const balance = summary.wallet.balance;

    if (balance >= totalNeededBudget) {
      return 0;
    }

    return totalNeededBudget - balance;
  }, [summary, totalNeededBudget]);

  const roleIsAdmin = user?.role?.toLowerCase() === "admin";

  const handleBulkPurchase = async () => {
    if (!summary) {
      return;
    }

    if (!roleIsAdmin) {
      toast.error("Toplu satın alma için Admin yetkisi gerekir.");
      return;
    }

    if (purchasableCount <= 0) {
      toast.error("Mevcut bakiye ile satın alınabilecek kritik takım yok.");
      return;
    }

    const confirmPurchase = window.confirm(
      `${purchasableCount} kritik takım grubu satın alınacak. Devam etmek istiyor musunuz?`
    );

    if (!confirmPurchase) {
      return;
    }

    try {
      setIsBulkPurchasing(true);

      const response = await api.post("/Finance/purchase-all-available");

      toast.success(response.data?.message || "Toplu satın alma tamamlandı.");

      await fetchFinanceSummary();
    } catch (error: any) {
      console.error(error);

      if (error.response?.data) {
        toast.error(error.response.data);
      } else {
        toast.error("Toplu satın alma işlemi başarısız oldu.");
      }
    } finally {
      setIsBulkPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Toaster position="top-right" />

        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="bg-white px-10 py-8 rounded-3xl shadow text-center">
            <h1 className="text-2xl font-black text-slate-900 mb-2">
              Satın alma sistemi yükleniyor...
            </h1>

            <p className="text-slate-600 font-medium">
              Finans verileri hazırlanıyor.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-screen bg-slate-100 p-10">
        <div className="mb-8">
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 rounded-3xl p-10 shadow-lg text-white overflow-hidden relative">
            <div className="absolute -right-24 -top-24 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
            <div className="absolute right-40 bottom-0 w-52 h-52 bg-cyan-500/10 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
              <div>
                <p className="text-emerald-300 font-semibold mb-3">
                  CNC Takım Yönetim Sistemi
                </p>

                <h1 className="text-5xl font-black tracking-tight mb-4">
                  Satın Alma ve Gelir Yönetimi
                </h1>

                <p className="text-slate-300 text-lg max-w-3xl leading-8">
                  Çalışan takımlar dakika başına gelir üretir. Elde edilen
                  gelir sistem bakiyesine eklenir ve kritik stoktaki takımlar bu
                  bakiye ile satın alınabilir.
                </p>
              </div>

              <div className="bg-white/10 border border-white/10 rounded-3xl p-6 min-w-[330px]">
                <p className="text-slate-300 font-semibold">
                  Kullanılabilir Bakiye
                </p>

                <h2 className="text-5xl font-black mt-3 text-emerald-300">
                  {formatCurrency(summary?.wallet.balance || 0)}
                </h2>

                <p className="text-slate-400 font-semibold mt-4">
                  Son güncelleme:{" "}
                  <span className="text-white font-black">
                    {lastUpdate || "Henüz yok"}
                  </span>
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t border-white/10 pt-6">
              <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 text-green-300 px-5 py-3 rounded-2xl font-black">
                <span className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-500/50" />
                Finans takibi aktif
              </div>

              <button
                onClick={fetchFinanceSummary}
                className="bg-white/10 hover:bg-white/15 border border-white/10 px-5 py-3 rounded-2xl font-black flex items-center gap-2 transition"
              >
                <RefreshCcw size={19} />
                Yenile
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-7 shadow-sm border border-emerald-200">
            <div className="flex items-center justify-between mb-5">
              <p className="text-emerald-700 font-bold">Bakiye</p>

              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                <Wallet size={24} />
              </div>
            </div>

            <h2 className="text-4xl font-black text-emerald-700">
              {formatCurrency(summary?.wallet.balance || 0)}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Satın alma için kullanılabilir sistem kasası.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-green-200">
            <div className="flex items-center justify-between mb-5">
              <p className="text-green-700 font-bold">Toplam Kazanç</p>

              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-700">
                <TrendingUp size={24} />
              </div>
            </div>

            <h2 className="text-4xl font-black text-green-700">
              {formatCurrency(summary?.wallet.totalEarned || 0)}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Çalışan takımlardan elde edilen gelir.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-red-200">
            <div className="flex items-center justify-between mb-5">
              <p className="text-red-600 font-bold">Toplam Harcama</p>

              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                <TrendingDown size={24} />
              </div>
            </div>

            <h2 className="text-4xl font-black text-red-600">
              {formatCurrency(summary?.wallet.totalSpent || 0)}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Satın alınan takımlar için harcanan tutar.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-blue-200">
            <div className="flex items-center justify-between mb-5">
              <p className="text-blue-700 font-bold">Çalışan Takım</p>

              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700">
                <Activity size={24} />
              </div>
            </div>

            <h2 className="text-5xl font-black text-blue-700">
              {summary?.runningTools.length || 0}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Dakika başı gelir üreten aktif takım.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-yellow-200">
            <div className="flex items-center justify-between mb-5">
              <p className="text-yellow-700 font-bold">İhtiyaç Bütçesi</p>

              <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-700">
                <ShoppingCart size={24} />
              </div>
            </div>

            <h2 className="text-4xl font-black text-yellow-700">
              {formatCurrency(totalNeededBudget)}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Kritik stokları tamamlamak için gereken tutar.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-red-200">
            <div className="flex items-center justify-between mb-5">
              <p className="text-red-600 font-bold">Eksik Bütçe</p>

              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                <AlertTriangle size={24} />
              </div>
            </div>

            <h2 className="text-4xl font-black text-red-600">
              {formatCurrency(missingBudget)}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Tüm kritik stokları tamamlamak için gereken ek tutar.
            </p>
          </div>
        </div>

        {roleIsAdmin && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div className="p-6 border-b border-slate-200 flex items-center gap-3">
              <Coins size={25} className="text-emerald-700" />

              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Manuel Bakiye Ekle
                </h2>

                <p className="text-slate-600 font-medium mt-1">
                  Test veya başlangıç bakiyesi için sisteme para ekleyebilirsin.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleAddBalance}
              className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5"
            >
              <input
                type="number"
                min="1"
                value={manualBalance}
                onChange={(event) => setManualBalance(event.target.value)}
                placeholder="Örn: 2000"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 font-bold text-slate-800"
              />

              <button
                type="submit"
                disabled={isAddingBalance}
                className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white rounded-2xl px-8 py-4 font-black transition flex items-center justify-center gap-2"
              >
                <Banknote size={21} />
                {isAddingBalance ? "Ekleniyor..." : "Bakiye Ekle"}
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle size={26} className="text-yellow-700" />

                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Kritik Stok Satın Alma Listesi
                  </h2>

                  <p className="text-slate-600 font-medium mt-1">
                    Stoku kritik seviyede olan takımlar için otomatik ihtiyaç
                    listesi.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="bg-yellow-50 text-yellow-700 px-5 py-3 rounded-2xl font-black text-center">
                  {summary?.criticalStockTools.length || 0} kritik takım
                </div>

                <button
                  onClick={handleBulkPurchase}
                  disabled={
                    !roleIsAdmin || purchasableCount <= 0 || isBulkPurchasing
                  }
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white px-5 py-3 rounded-2xl font-black transition flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={19} />

                  {isBulkPurchasing
                    ? "Toplu satın alınıyor..."
                    : "Satın Alınabilirlerin Tümünü Al"}
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {summary?.criticalStockTools.map((tool) => {
                const canPurchase =
                  (summary?.wallet.balance || 0) >= tool.totalNeededPrice;

                const missingForThisTool = canPurchase
                  ? 0
                  : tool.totalNeededPrice - (summary?.wallet.balance || 0);

                return (
                  <div
                    key={tool.id}
                    className="bg-slate-50 border border-slate-200 rounded-3xl p-6"
                  >
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-yellow-100 text-yellow-700 flex items-center justify-center shrink-0">
                          <Wrench size={27} />
                        </div>

                        <div>
                          <h3 className="text-2xl font-black text-slate-900">
                            {tool.toolName}
                          </h3>

                          <p className="text-slate-600 font-semibold mt-1">
                            {tool.toolType} • Mevcut stok:{" "}
                            <span className="text-red-600 font-black">
                              {tool.stock}
                            </span>{" "}
                            • Kritik seviye:{" "}
                            <span className="font-black">
                              {tool.criticalStock}
                            </span>
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
                            <div className="bg-white border border-slate-200 rounded-2xl p-4">
                              <p className="text-xs text-slate-500 font-black uppercase">
                                Alınacak Adet
                              </p>

                              <p className="text-2xl font-black text-slate-900 mt-1">
                                {tool.neededQuantity}
                              </p>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl p-4">
                              <p className="text-xs text-slate-500 font-black uppercase">
                                Birim Fiyat
                              </p>

                              <p className="text-2xl font-black text-slate-900 mt-1">
                                {formatCurrency(tool.purchasePrice)}
                              </p>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl p-4">
                              <p className="text-xs text-slate-500 font-black uppercase">
                                Toplam Tutar
                              </p>

                              <p className="text-2xl font-black text-red-600 mt-1">
                                {formatCurrency(tool.totalNeededPrice)}
                              </p>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl p-4">
                              <p className="text-xs text-slate-500 font-black uppercase">
                                Dakika Geliri
                              </p>

                              <p className="text-2xl font-black text-green-700 mt-1">
                                {formatCurrency(tool.incomePerMinute)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="xl:w-[230px]">
                        {canPurchase ? (
                          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-4">
                            <p className="text-green-700 font-black flex items-center gap-2">
                              <CheckCircle2 size={19} />
                              Bakiye yeterli
                            </p>
                          </div>
                        ) : (
                          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4">
                            <p className="text-red-600 font-black">
                              Bakiye yetersiz
                            </p>

                            <p className="text-red-500 text-sm font-bold mt-1">
                              Eksik: {formatCurrency(missingForThisTool)}
                            </p>
                          </div>
                        )}

                        <button
                          onClick={() => handlePurchase(tool)}
                          disabled={
                            !roleIsAdmin ||
                            !canPurchase ||
                            isPurchasing === tool.id
                          }
                          className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white rounded-2xl py-4 font-black transition flex items-center justify-center gap-2"
                        >
                          <ShoppingCart size={20} />

                          {isPurchasing === tool.id
                            ? "Satın alınıyor..."
                            : "Satın Al"}
                        </button>

                        {!roleIsAdmin && (
                          <p className="text-slate-500 text-xs font-bold mt-3 text-center">
                            Satın alma için Admin yetkisi gerekir.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {summary?.criticalStockTools.length === 0 && (
                <div className="bg-green-50 border border-green-100 rounded-3xl p-10 text-center">
                  <CheckCircle2
                    size={44}
                    className="text-green-700 mx-auto mb-4"
                  />

                  <h3 className="text-2xl font-black text-slate-900 mb-2">
                    Kritik stokta takım bulunmuyor
                  </h3>

                  <p className="text-slate-600 font-medium">
                    Tüm takımların stok seviyesi yeterli durumda.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex items-center gap-3">
                <Activity size={25} className="text-blue-700" />

                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Gelir Üreten Takımlar
                  </h2>

                  <p className="text-slate-600 font-medium mt-1">
                    Şu anda çalışan takımlar.
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {summary?.runningTools.map((tool) => (
                  <div
                    key={tool.id}
                    className="bg-blue-50 border border-blue-100 rounded-3xl p-5"
                  >
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div>
                        <p className="font-black text-slate-900">
                          {tool.toolName}
                        </p>

                        <p className="text-slate-600 text-sm font-bold mt-1">
                          {tool.toolType}
                        </p>
                      </div>

                      <span className="bg-green-100 text-green-700 px-3 py-2 rounded-xl text-sm font-black">
                        Çalışıyor
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-2xl p-4 border border-blue-100">
                        <p className="text-xs text-slate-500 font-black uppercase">
                          Dakika Geliri
                        </p>

                        <p className="text-xl font-black text-green-700 mt-1">
                          {formatCurrency(tool.incomePerMinute)}
                        </p>
                      </div>

                      <div className="bg-white rounded-2xl p-4 border border-blue-100">
                        <p className="text-xs text-slate-500 font-black uppercase">
                          Kalan Ömür
                        </p>

                        <p className="text-xl font-black text-blue-700 mt-1">
                          {tool.remainingLifeMinute} dk
                        </p>
                      </div>
                    </div>

                    {tool.startedAt && (
                      <p className="text-slate-500 text-xs font-bold mt-3 flex items-center gap-2">
                        <Clock3 size={15} />
                        Başlangıç:{" "}
                        {new Date(tool.startedAt).toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                ))}

                {summary?.runningTools.length === 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center">
                    <p className="text-slate-700 font-black">
                      Şu anda gelir üreten takım yok.
                    </p>

                    <p className="text-slate-500 font-medium mt-2">
                      Takımlar sayfasından bir takımı başlatınca burada görünür.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-2xl font-black text-slate-900 mb-5">
                Satın Alma Durumu
              </h2>

              <div className="space-y-4">
                <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
                  <p className="text-green-700 font-bold">Satın alınabilir</p>

                  <p className="text-4xl font-black text-green-700 mt-2">
                    {purchasableCount}
                  </p>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                  <p className="text-red-600 font-bold">Bakiye yetersiz</p>

                  <p className="text-4xl font-black text-red-600 mt-2">
                    {notPurchasableCount}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <p className="text-slate-600 font-bold">
                    Toplam ihtiyaç bütçesi
                  </p>

                  <p className="text-3xl font-black text-slate-900 mt-2">
                    {formatCurrency(totalNeededBudget)}
                  </p>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                  <p className="text-red-600 font-bold">Eksik bütçe</p>

                  <p className="text-3xl font-black text-red-600 mt-2">
                    {formatCurrency(missingBudget)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center gap-3">
            <History size={25} className="text-slate-700" />

            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Satın Alma Geçmişi
              </h2>

              <p className="text-slate-600 font-medium mt-1">
                Yapılan son satın alma işlemleri.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-slate-950 text-white">
                <tr>
                  <th className="px-5 py-4 text-left text-xs uppercase">ID</th>

                  <th className="px-5 py-4 text-left text-xs uppercase">
                    Takım
                  </th>

                  <th className="px-5 py-4 text-left text-xs uppercase">
                    Tip
                  </th>

                  <th className="px-5 py-4 text-left text-xs uppercase">
                    Adet
                  </th>

                  <th className="px-5 py-4 text-left text-xs uppercase">
                    Birim Fiyat
                  </th>

                  <th className="px-5 py-4 text-left text-xs uppercase">
                    Toplam
                  </th>

                  <th className="px-5 py-4 text-left text-xs uppercase">
                    Tarih
                  </th>
                </tr>
              </thead>

              <tbody>
                {summary?.purchaseLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition"
                  >
                    <td className="px-5 py-5 font-black text-slate-500">
                      #{log.id}
                    </td>

                    <td className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                          <Package size={22} />
                        </div>

                        <div>
                          <p className="font-black text-slate-900">
                            {log.toolName}
                          </p>

                          <p className="text-slate-500 text-sm font-bold">
                            Takım ID: {log.toolId}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-5">
                      <span className="bg-slate-100 text-slate-700 px-3 py-2 rounded-xl font-black text-sm">
                        {log.toolType}
                      </span>
                    </td>

                    <td className="px-5 py-5 font-black text-slate-900">
                      {log.quantity}
                    </td>

                    <td className="px-5 py-5 font-black text-slate-900">
                      {formatCurrency(log.unitPrice)}
                    </td>

                    <td className="px-5 py-5">
                      <span className="bg-red-100 text-red-600 px-4 py-2 rounded-xl font-black">
                        {formatCurrency(log.totalPrice)}
                      </span>
                    </td>

                    <td className="px-5 py-5 font-semibold text-slate-700">
                      {formatDateTime(log.purchaseDate)}
                    </td>
                  </tr>
                ))}

                {summary?.purchaseLogs.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-600 font-black"
                    >
                      Henüz satın alma işlemi yapılmadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}