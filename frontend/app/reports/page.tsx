"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/app/services/api";
import connection from "@/app/services/signalr";
import toast, { Toaster } from "react-hot-toast";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  FileText,
  Package,
  Printer,
  RefreshCcw,
  ShoppingCart,
  Timer,
  XCircle,
} from "lucide-react";

type Tool = {
  id: number;
  toolName: string;
  toolType: string;
  totalLifeMinute: number;
  remainingLifeMinute: number;
  stock: number;
  criticalStock: number;
  isRunning: boolean;
  startedAt?: string | null;
  incomePerMinute: number;
  purchasePrice: number;
};

type UsageLog = {
  id: number;
  toolId: number;
  usedMinute: number;
  usageDate: string;
  tool?: Tool;
};

type User = {
  id: number;
  fullName: string;
  username: string;
  role: string;
};

type WalletInfo = {
  id: number;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  updatedAt: string;
};

type RunningToolFinance = {
  id: number;
  toolName: string;
  toolType: string;
  remainingLifeMinute: number;
  incomePerMinute: number;
  startedAt?: string | null;
};

type CriticalStockFinanceTool = {
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
  runningTools: RunningToolFinance[];
  criticalStockTools: CriticalStockFinanceTool[];
  purchaseLogs: PurchaseLog[];
};

type MaintenancePlan = {
  id: number;
  toolId: number;
  toolName: string;
  toolType: string;
  remainingLifeMinute: number;
  totalLifeMinute: number;
  stock: number;
  criticalStock: number;
  isRunning: boolean;
  title: string;
  description: string;
  plannedDate: string;
  status: string;
  createdAt: string;
  completedAt?: string | null;
};

type MaintenanceRecommendation = {
  id: number;
  toolName: string;
  toolType: string;
  totalLifeMinute: number;
  remainingLifeMinute: number;
  stock: number;
  criticalStock: number;
  isRunning: boolean;
  incomePerMinute: number;
  purchasePrice: number;
  lifePercent: number;
  reason: string;
  priority: string;
  hasActivePlan: boolean;
  suggestedDate: string;
};

type ToolLifeTickEvent = {
  toolId: number;
  toolName: string;
  toolType: string;
  remainingLifeMinute: number;
  totalLifeMinute: number;
  stock: number;
  criticalStock: number;
  isRunning: boolean;
  incomePerMinute?: number;
  purchasePrice?: number;
};

type ToolRunningChangedEvent = {
  toolId: number;
  toolName: string;
  isRunning: boolean;
  startedAt?: string | null;
  remainingLifeMinute: number;
  incomePerMinute?: number;
  purchasePrice?: number;
};

type FinanceUpdatedEvent = {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  earnedThisTick?: number;
  updatedAt?: string;
};

export default function ReportsPage() {
  const router = useRouter();

  const [tools, setTools] = useState<Tool[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [financeSummary, setFinanceSummary] =
    useState<FinanceSummary | null>(null);

  const [maintenancePlans, setMaintenancePlans] = useState<MaintenancePlan[]>(
    []
  );
  const [maintenanceRecommendations, setMaintenanceRecommendations] = useState<
    MaintenanceRecommendation[]
  >([]);

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  const fetchReportData = async () => {
    try {
      const authUser = checkAuth();

      if (!authUser) {
        return;
      }

      const [
        toolsResponse,
        logsResponse,
        financeResponse,
        maintenancePlansResponse,
        maintenanceRecommendationsResponse,
      ] = await Promise.all([
        api.get("/Tool"),
        api.get("/ToolUsageLog"),
        api.get("/Finance/summary"),
        api.get("/MaintenancePlan"),
        api.get("/MaintenancePlan/recommendations"),
      ]);

      setTools(toolsResponse.data);
      setLogs(logsResponse.data);
      setFinanceSummary(financeResponse.data);
      setMaintenancePlans(maintenancePlansResponse.data);
      setMaintenanceRecommendations(maintenanceRecommendationsResponse.data);
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

      toast.error("Rapor verileri yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  useEffect(() => {
    const startSignalR = async () => {
      try {
        if (connection.state === "Disconnected") {
          await connection.start();
          console.log("Reports SignalR bağlantısı kuruldu.");
        }
      } catch (error) {
        console.error("SignalR bağlantı hatası:", error);
      }
    };

    startSignalR();

    connection.on("ToolLifeTick", (eventData: ToolLifeTickEvent) => {
      setTools((prevTools) =>
        prevTools.map((tool) =>
          tool.id === eventData.toolId
            ? {
                ...tool,
                remainingLifeMinute: eventData.remainingLifeMinute,
                totalLifeMinute: eventData.totalLifeMinute,
                stock: eventData.stock,
                criticalStock: eventData.criticalStock,
                isRunning: eventData.isRunning,
                incomePerMinute:
                  eventData.incomePerMinute ?? tool.incomePerMinute,
                purchasePrice: eventData.purchasePrice ?? tool.purchasePrice,
              }
            : tool
        )
      );

      setLastUpdate(new Date().toLocaleTimeString("tr-TR"));
    });

    connection.on("ToolRunningChanged", (eventData: ToolRunningChangedEvent) => {
      setTools((prevTools) =>
        prevTools.map((tool) =>
          tool.id === eventData.toolId
            ? {
                ...tool,
                isRunning: eventData.isRunning,
                startedAt: eventData.startedAt ?? null,
                remainingLifeMinute: eventData.remainingLifeMinute,
                incomePerMinute:
                  eventData.incomePerMinute ?? tool.incomePerMinute,
                purchasePrice: eventData.purchasePrice ?? tool.purchasePrice,
              }
            : tool
        )
      );

      setLastUpdate(new Date().toLocaleTimeString("tr-TR"));
    });

    connection.on("FinanceUpdated", (eventData: FinanceUpdatedEvent) => {
      setFinanceSummary((prevSummary) => {
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
    });

    connection.on("ToolUpdated", () => {
      fetchReportData();
    });

    connection.on("ToolCreated", () => {
      fetchReportData();
    });

    connection.on("ToolDeleted", () => {
      fetchReportData();
    });

    connection.on("BulkPurchaseCompleted", () => {
      fetchReportData();
    });

    connection.on("MaintenancePlanCreated", () => {
      fetchReportData();
    });

    connection.on("MaintenancePlanUpdated", () => {
      fetchReportData();
    });

    connection.on("MaintenancePlanDeleted", () => {
      fetchReportData();
    });

    return () => {
      connection.off("ToolLifeTick");
      connection.off("ToolRunningChanged");
      connection.off("FinanceUpdated");
      connection.off("ToolUpdated");
      connection.off("ToolCreated");
      connection.off("ToolDeleted");
      connection.off("BulkPurchaseCompleted");
      connection.off("MaintenancePlanCreated");
      connection.off("MaintenancePlanUpdated");
      connection.off("MaintenancePlanDeleted");
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    weekday: "long",
  });

  const criticalStockTools = tools.filter(
    (tool) => tool.stock <= tool.criticalStock
  );

  const lowLifeTools = tools.filter((tool) => tool.remainingLifeMinute < 200);

  const runningTools = tools.filter((tool) => tool.isRunning);

  const totalRemainingLife = tools.reduce(
    (total, tool) => total + tool.remainingLifeMinute,
    0
  );

  const totalLife = tools.reduce(
    (total, tool) => total + tool.totalLifeMinute,
    0
  );

  const averageLifePercent =
    totalLife > 0 ? Math.round((totalRemainingLife / totalLife) * 100) : 0;

  const totalUsedMinute = logs.reduce(
    (total, log) => total + log.usedMinute,
    0
  );

  const totalActiveIncomePerMinute = runningTools.reduce(
    (total, tool) => total + Number(tool.incomePerMinute || 0),
    0
  );

  const totalNeededBudget =
    financeSummary?.criticalStockTools.reduce(
      (total, tool) => total + tool.totalNeededPrice,
      0
    ) || 0;

  const purchasableCriticalTools =
    financeSummary?.criticalStockTools.filter(
      (tool) => (financeSummary?.wallet.balance || 0) >= tool.totalNeededPrice
    ).length || 0;

  const notPurchasableCriticalTools =
    (financeSummary?.criticalStockTools.length || 0) -
    purchasableCriticalTools;

  const activeMaintenancePlans = maintenancePlans.filter(
    (plan) => plan.status === "Planlandı" || plan.status === "Devam Ediyor"
  );

  const completedMaintenancePlans = maintenancePlans.filter(
    (plan) => plan.status === "Tamamlandı"
  );

  const cancelledMaintenancePlans = maintenancePlans.filter(
    (plan) => plan.status === "İptal Edildi"
  );

  const highPriorityMaintenanceRecommendations =
    maintenanceRecommendations.filter((item) => item.priority === "Yüksek");

  const systemStatus =
    criticalStockTools.length === 0 &&
    lowLifeTools.length === 0 &&
    highPriorityMaintenanceRecommendations.length === 0
      ? "İyi"
      : criticalStockTools.length <= 2 &&
        lowLifeTools.length <= 2 &&
        highPriorityMaintenanceRecommendations.length <= 1
      ? "Dikkat"
      : "Kritik";

  const reportNo = `TR-${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}`;

  if (isLoading) {
    return (
      <>
        <Toaster position="top-right" />

        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="bg-white px-10 py-8 rounded-3xl shadow text-center">
            <h1 className="text-2xl font-black text-slate-900 mb-2">
              Rapor hazırlanıyor...
            </h1>

            <p className="text-slate-600 font-medium">
              Sistem verileri yükleniyor.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-screen bg-slate-100 p-10 print:bg-white print:p-0">
        <div className="print:hidden mb-8">
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 rounded-3xl p-10 shadow-lg text-white overflow-hidden relative">
            <div className="absolute -right-24 -top-24 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
            <div className="absolute right-40 bottom-0 w-52 h-52 bg-cyan-500/10 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
              <div>
                <p className="text-blue-300 font-semibold mb-3">
                  CNC Takım Yönetim Sistemi
                </p>

                <h1 className="text-5xl font-black tracking-tight mb-4">
                  Raporlar
                </h1>

                <p className="text-slate-300 text-lg max-w-3xl leading-8">
                  Takım stok, takım ömür, çalışan takım, kullanım geçmişi,
                  finans, satın alma ve bakım planı durumlarını resmi rapor
                  formatında görüntüleyebilirsiniz.
                </p>

                <p className="text-slate-400 font-semibold mt-5">
                  Son güncelleme:{" "}
                  <span className="text-white font-black">
                    {lastUpdate || "Henüz yok"}
                  </span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={fetchReportData}
                  className="bg-white/10 hover:bg-white/15 border border-white/10 text-white px-6 py-4 rounded-2xl font-black transition flex items-center justify-center gap-2"
                >
                  <RefreshCcw size={20} />
                  Yenile
                </button>

                <button
                  onClick={handlePrint}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black transition flex items-center justify-center gap-2"
                >
                  <Printer size={20} />
                  Yazdır / PDF Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden print:rounded-none print:shadow-none print:border-0">
          <div className="p-10 border-b border-slate-200 print:p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
              <div>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-16 h-16 rounded-3xl bg-slate-950 text-white flex items-center justify-center print:w-12 print:h-12">
                    <FileText size={32} />
                  </div>

                  <div>
                    <h1 className="text-4xl font-black text-slate-900 print:text-2xl">
                      CNC Takım Yönetim Sistemi Raporu
                    </h1>

                    <p className="text-slate-600 font-semibold mt-1">
                      Tool Room Management / Stok - Ömür - Finans - Bakım
                      Analizi
                    </p>
                  </div>
                </div>

                <p className="text-slate-600 leading-8 max-w-4xl">
                  Bu rapor; sistemde kayıtlı CNC takımlarının stok durumunu,
                  kalan takım ömürlerini, çalışan takımları, kullanım
                  hareketlerini, gelir durumunu, satın alma ihtiyaçlarını ve
                  bakım/değişim planlarını özetler.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 min-w-[300px] print:p-4">
                <div className="space-y-3">
                  <div className="flex justify-between gap-6">
                    <span className="text-slate-500 font-bold">Rapor No:</span>
                    <span className="text-slate-900 font-black">
                      {reportNo}
                    </span>
                  </div>

                  <div className="flex justify-between gap-6">
                    <span className="text-slate-500 font-bold">Tarih:</span>
                    <span className="text-slate-900 font-black">{today}</span>
                  </div>

                  <div className="flex justify-between gap-6">
                    <span className="text-slate-500 font-bold">
                      Hazırlayan:
                    </span>
                    <span className="text-slate-900 font-black">
                      {user?.fullName || user?.username || "Kullanıcı"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-6">
                    <span className="text-slate-500 font-bold">Rol:</span>
                    <span className="text-slate-900 font-black">
                      {user?.role || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-6">
                    <span className="text-slate-500 font-bold">Sistem:</span>
                    <span
                      className={`font-black ${
                        systemStatus === "İyi"
                          ? "text-green-700"
                          : systemStatus === "Dikkat"
                          ? "text-yellow-700"
                          : "text-red-600"
                      }`}
                    >
                      {systemStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-10 print:p-6">
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <BarChart3 size={26} className="text-blue-700" />

                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Genel Sistem Özeti
                  </h2>

                  <p className="text-slate-600 font-medium">
                    Sistemdeki takım, stok ve ömür durumlarının genel görünümü.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 print:grid-cols-5 print:gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 print:p-4">
                  <p className="text-slate-600 font-bold">Toplam Takım</p>

                  <h4 className="text-5xl font-black text-slate-900 mt-2 print:text-3xl">
                    {tools.length}
                  </h4>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 print:p-4">
                  <p className="text-blue-700 font-bold">Çalışan Takım</p>

                  <h4 className="text-5xl font-black text-blue-700 mt-2 print:text-3xl">
                    {runningTools.length}
                  </h4>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-3xl p-6 print:p-4">
                  <p className="text-red-600 font-bold">Kritik Stok</p>

                  <h4 className="text-5xl font-black text-red-600 mt-2 print:text-3xl">
                    {criticalStockTools.length}
                  </h4>
                </div>

                <div className="bg-yellow-50 border border-yellow-100 rounded-3xl p-6 print:p-4">
                  <p className="text-yellow-700 font-bold">Kritik Ömür</p>

                  <h4 className="text-5xl font-black text-yellow-700 mt-2 print:text-3xl">
                    {lowLifeTools.length}
                  </h4>
                </div>

                <div className="bg-green-50 border border-green-100 rounded-3xl p-6 print:p-4">
                  <p className="text-green-700 font-bold">Ortalama Ömür</p>

                  <h4 className="text-5xl font-black text-green-700 mt-2 print:text-3xl">
                    %{averageLifePercent}
                  </h4>
                </div>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <Coins size={26} className="text-emerald-700" />

                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Finans ve Satın Alma Raporu
                  </h2>

                  <p className="text-slate-600 font-medium">
                    Takımların çalışmasından elde edilen gelir ve kritik stok
                    satın alma durumu.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 print:grid-cols-4 print:gap-3 mb-6">
                <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 print:p-4">
                  <p className="text-emerald-700 font-bold">
                    Sistem Bakiyesi
                  </p>

                  <h4 className="text-4xl font-black text-emerald-700 mt-2 print:text-2xl">
                    {formatCurrency(financeSummary?.wallet.balance || 0)}
                  </h4>
                </div>

                <div className="bg-green-50 border border-green-100 rounded-3xl p-6 print:p-4">
                  <p className="text-green-700 font-bold">Toplam Kazanç</p>

                  <h4 className="text-4xl font-black text-green-700 mt-2 print:text-2xl">
                    {formatCurrency(financeSummary?.wallet.totalEarned || 0)}
                  </h4>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-3xl p-6 print:p-4">
                  <p className="text-red-600 font-bold">Toplam Harcama</p>

                  <h4 className="text-4xl font-black text-red-600 mt-2 print:text-2xl">
                    {formatCurrency(financeSummary?.wallet.totalSpent || 0)}
                  </h4>
                </div>

                <div className="bg-yellow-50 border border-yellow-100 rounded-3xl p-6 print:p-4">
                  <p className="text-yellow-700 font-bold">Gerekli Bütçe</p>

                  <h4 className="text-4xl font-black text-yellow-700 mt-2 print:text-2xl">
                    {formatCurrency(totalNeededBudget)}
                  </h4>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 print:grid-cols-4 print:gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 print:p-4">
                  <p className="text-blue-700 font-bold">
                    Gelir Üreten Takım
                  </p>

                  <h4 className="text-4xl font-black text-blue-700 mt-2 print:text-2xl">
                    {financeSummary?.runningTools.length || 0}
                  </h4>
                </div>

                <div className="bg-green-50 border border-green-100 rounded-3xl p-6 print:p-4">
                  <p className="text-green-700 font-bold">
                    Aktif Dakika Geliri
                  </p>

                  <h4 className="text-4xl font-black text-green-700 mt-2 print:text-2xl">
                    {formatCurrency(totalActiveIncomePerMinute)}
                  </h4>
                </div>

                <div className="bg-green-50 border border-green-100 rounded-3xl p-6 print:p-4">
                  <p className="text-green-700 font-bold">Satın Alınabilir</p>

                  <h4 className="text-4xl font-black text-green-700 mt-2 print:text-2xl">
                    {purchasableCriticalTools}
                  </h4>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-3xl p-6 print:p-4">
                  <p className="text-red-600 font-bold">Bakiye Yetersiz</p>

                  <h4 className="text-4xl font-black text-red-600 mt-2 print:text-2xl">
                    {notPurchasableCriticalTools}
                  </h4>
                </div>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <ClipboardCheck size={26} className="text-emerald-700" />

                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Bakım ve Değişim Planları Raporu
                  </h2>

                  <p className="text-slate-600 font-medium">
                    Kritik ömür veya kritik stok nedeniyle oluşturulan bakım ve
                    değişim planları.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 print:grid-cols-5 print:gap-3 mb-6">
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 print:p-4">
                  <p className="text-slate-600 font-bold">Toplam Plan</p>

                  <h4 className="text-4xl font-black text-slate-900 mt-2 print:text-2xl">
                    {maintenancePlans.length}
                  </h4>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 print:p-4">
                  <p className="text-blue-700 font-bold">Aktif Plan</p>

                  <h4 className="text-4xl font-black text-blue-700 mt-2 print:text-2xl">
                    {activeMaintenancePlans.length}
                  </h4>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 print:p-4">
                  <p className="text-emerald-700 font-bold">Tamamlanan</p>

                  <h4 className="text-4xl font-black text-emerald-700 mt-2 print:text-2xl">
                    {completedMaintenancePlans.length}
                  </h4>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-3xl p-6 print:p-4">
                  <p className="text-red-600 font-bold">İptal Edilen</p>

                  <h4 className="text-4xl font-black text-red-600 mt-2 print:text-2xl">
                    {cancelledMaintenancePlans.length}
                  </h4>
                </div>

                <div className="bg-yellow-50 border border-yellow-100 rounded-3xl p-6 print:p-4">
                  <p className="text-yellow-700 font-bold">Bakım Önerisi</p>

                  <h4 className="text-4xl font-black text-yellow-700 mt-2 print:text-2xl">
                    {maintenanceRecommendations.length}
                  </h4>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 print:grid-cols-3 print:gap-3 mb-6">
                <div className="bg-red-50 border border-red-100 rounded-3xl p-6 print:p-4">
                  <p className="text-red-600 font-bold">Yüksek Öncelik</p>

                  <h4 className="text-4xl font-black text-red-600 mt-2 print:text-2xl">
                    {highPriorityMaintenanceRecommendations.length}
                  </h4>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 print:p-4">
                  <p className="text-blue-700 font-bold">Planlandı</p>

                  <h4 className="text-4xl font-black text-blue-700 mt-2 print:text-2xl">
                    {
                      maintenancePlans.filter(
                        (plan) => plan.status === "Planlandı"
                      ).length
                    }
                  </h4>
                </div>

                <div className="bg-yellow-50 border border-yellow-100 rounded-3xl p-6 print:p-4">
                  <p className="text-yellow-700 font-bold">Devam Ediyor</p>

                  <h4 className="text-4xl font-black text-yellow-700 mt-2 print:text-2xl">
                    {
                      maintenancePlans.filter(
                        (plan) => plan.status === "Devam Ediyor"
                      ).length
                    }
                  </h4>
                </div>
              </div>
            </div>

            <div className="mb-10">
              <h3 className="text-xl font-black text-slate-900 mb-4">
                Bakım Planı Listesi
              </h3>

              <div className="overflow-x-auto border border-slate-200 rounded-3xl">
                <table className="w-full min-w-[1150px]">
                  <thead className="bg-slate-950 text-white">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        ID
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Takım
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Plan
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Plan Tarihi
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Durum
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Kalan Ömür
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Stok
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Oluşturma
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {maintenancePlans.map((plan) => (
                      <tr key={plan.id} className="border-b border-slate-100">
                        <td className="px-4 py-4 font-black text-slate-500">
                          #{plan.id}
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-black text-slate-900">
                            {plan.toolName}
                          </p>

                          <p className="text-slate-500 text-sm font-bold">
                            {plan.toolType} • ID #{plan.toolId}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-black text-slate-900">
                            {plan.title}
                          </p>

                          <p className="text-slate-500 text-sm font-semibold">
                            {plan.description}
                          </p>
                        </td>

                        <td className="px-4 py-4 font-black text-blue-700">
                          {formatDate(plan.plannedDate)}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`px-3 py-2 rounded-xl font-black text-sm ${
                              plan.status === "Tamamlandı"
                                ? "bg-emerald-100 text-emerald-700"
                                : plan.status === "Devam Ediyor"
                                ? "bg-yellow-100 text-yellow-700"
                                : plan.status === "İptal Edildi"
                                ? "bg-red-100 text-red-600"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {plan.status}
                          </span>
                        </td>

                        <td className="px-4 py-4 font-black text-slate-900">
                          {plan.remainingLifeMinute} dk
                        </td>

                        <td className="px-4 py-4 font-black text-slate-900">
                          {plan.stock} / Kritik {plan.criticalStock}
                        </td>

                        <td className="px-4 py-4 text-slate-700 font-semibold">
                          {formatDateTime(plan.createdAt)}
                        </td>
                      </tr>
                    ))}

                    {maintenancePlans.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-8 text-center text-slate-600 font-black"
                        >
                          Henüz bakım planı bulunmamaktadır.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <Activity size={26} className="text-blue-700" />

                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Çalışan Takımlar Raporu
                  </h2>

                  <p className="text-slate-600 font-medium">
                    Gerçek zamanlı çalışan, ömrü azalan ve gelir üreten
                    takımlar.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-3xl">
                <table className="w-full min-w-[1000px]">
                  <thead className="bg-slate-950 text-white">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        ID
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Takım
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Tip
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Kalan Ömür
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Dakika Geliri
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Başlangıç
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Durum
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {runningTools.map((tool) => (
                      <tr key={tool.id} className="border-b border-slate-100">
                        <td className="px-4 py-4 font-black text-slate-500">
                          #{tool.id}
                        </td>

                        <td className="px-4 py-4 font-black text-slate-900">
                          {tool.toolName}
                        </td>

                        <td className="px-4 py-4 text-slate-700 font-semibold">
                          {tool.toolType}
                        </td>

                        <td className="px-4 py-4 font-black text-blue-700">
                          {tool.remainingLifeMinute} dk
                        </td>

                        <td className="px-4 py-4 font-black text-green-700">
                          {formatCurrency(tool.incomePerMinute)}
                        </td>

                        <td className="px-4 py-4 text-slate-700 font-semibold">
                          {tool.startedAt
                            ? new Date(tool.startedAt).toLocaleTimeString(
                                "tr-TR",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "-"}
                        </td>

                        <td className="px-4 py-4">
                          <span className="bg-green-100 text-green-700 px-3 py-2 rounded-xl font-black text-sm">
                            Çalışıyor
                          </span>
                        </td>
                      </tr>
                    ))}

                    {runningTools.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-slate-600 font-black"
                        >
                          Şu anda çalışan takım bulunmamaktadır.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <ShoppingCart size={26} className="text-yellow-700" />

                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Kritik Stok Satın Alma İhtiyaçları
                  </h2>

                  <p className="text-slate-600 font-medium">
                    Kritik stokta bulunan takımlar için satın alma durumu.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-3xl">
                <table className="w-full min-w-[1100px]">
                  <thead className="bg-slate-950 text-white">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Takım
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Tip
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Stok
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Kritik
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Alınacak
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Birim Fiyat
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Toplam Tutar
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Durum
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {financeSummary?.criticalStockTools.map((tool) => {
                      const canPurchase =
                        (financeSummary?.wallet.balance || 0) >=
                        tool.totalNeededPrice;

                      return (
                        <tr key={tool.id} className="border-b border-slate-100">
                          <td className="px-4 py-4 font-black text-slate-900">
                            {tool.toolName}
                          </td>

                          <td className="px-4 py-4 text-slate-700 font-semibold">
                            {tool.toolType}
                          </td>

                          <td className="px-4 py-4 font-black text-red-600">
                            {tool.stock}
                          </td>

                          <td className="px-4 py-4 font-black text-slate-800">
                            {tool.criticalStock}
                          </td>

                          <td className="px-4 py-4 font-black text-blue-700">
                            {tool.neededQuantity}
                          </td>

                          <td className="px-4 py-4 font-black text-slate-800">
                            {formatCurrency(tool.purchasePrice)}
                          </td>

                          <td className="px-4 py-4 font-black text-red-600">
                            {formatCurrency(tool.totalNeededPrice)}
                          </td>

                          <td className="px-4 py-4">
                            {canPurchase ? (
                              <span className="bg-green-100 text-green-700 px-3 py-2 rounded-xl font-black text-sm">
                                Satın alınabilir
                              </span>
                            ) : (
                              <span className="bg-red-100 text-red-600 px-3 py-2 rounded-xl font-black text-sm">
                                Bakiye yetersiz
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {(financeSummary?.criticalStockTools.length || 0) === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-8 text-center text-slate-600 font-black"
                        >
                          Kritik stokta satın alma ihtiyacı bulunmamaktadır.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <Package size={26} className="text-red-600" />

                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Kritik Stok Raporu
                  </h2>

                  <p className="text-slate-600 font-medium">
                    Stok seviyesi kritik stok seviyesine eşit veya altında olan
                    takımlar.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-3xl">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-950 text-white">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        ID
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Takım
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Tip
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Stok
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Kritik Stok
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Alış Fiyatı
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {criticalStockTools.map((tool) => (
                      <tr key={tool.id} className="border-b border-slate-100">
                        <td className="px-4 py-4 font-black text-slate-500">
                          #{tool.id}
                        </td>

                        <td className="px-4 py-4 font-black text-slate-900">
                          {tool.toolName}
                        </td>

                        <td className="px-4 py-4 text-slate-700 font-semibold">
                          {tool.toolType}
                        </td>

                        <td className="px-4 py-4 font-black text-red-600">
                          {tool.stock}
                        </td>

                        <td className="px-4 py-4 font-black text-slate-800">
                          {tool.criticalStock}
                        </td>

                        <td className="px-4 py-4 font-black text-emerald-700">
                          {formatCurrency(tool.purchasePrice)}
                        </td>
                      </tr>
                    ))}

                    {criticalStockTools.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-slate-600 font-black"
                        >
                          Kritik stokta takım bulunmamaktadır.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <Timer size={26} className="text-yellow-700" />

                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Kritik Ömür Raporu
                  </h2>

                  <p className="text-slate-600 font-medium">
                    Kalan ömrü 200 dakikanın altında olan takımlar.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-3xl">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-950 text-white">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        ID
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Takım
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Tip
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Kalan Ömür
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Toplam Ömür
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Oran
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {lowLifeTools.map((tool) => {
                      const lifePercent =
                        tool.totalLifeMinute > 0
                          ? Math.round(
                              (tool.remainingLifeMinute /
                                tool.totalLifeMinute) *
                                100
                            )
                          : 0;

                      return (
                        <tr key={tool.id} className="border-b border-slate-100">
                          <td className="px-4 py-4 font-black text-slate-500">
                            #{tool.id}
                          </td>

                          <td className="px-4 py-4 font-black text-slate-900">
                            {tool.toolName}
                          </td>

                          <td className="px-4 py-4 text-slate-700 font-semibold">
                            {tool.toolType}
                          </td>

                          <td className="px-4 py-4 font-black text-yellow-700">
                            {tool.remainingLifeMinute} dk
                          </td>

                          <td className="px-4 py-4 font-black text-slate-800">
                            {tool.totalLifeMinute} dk
                          </td>

                          <td className="px-4 py-4">
                            <span className="bg-yellow-100 text-yellow-700 px-3 py-2 rounded-xl font-black text-sm">
                              %{lifePercent}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {lowLifeTools.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-slate-600 font-black"
                        >
                          Kritik ömür seviyesinde takım bulunmamaktadır.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <Coins size={26} className="text-green-700" />

                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Satın Alma Geçmişi
                  </h2>

                  <p className="text-slate-600 font-medium">
                    Yapılan satın alma işlemlerinin geçmişi.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-3xl">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-950 text-white">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        ID
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Takım
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Tip
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Adet
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Birim Fiyat
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Toplam
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Tarih
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {financeSummary?.purchaseLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100">
                        <td className="px-4 py-4 font-black text-slate-500">
                          #{log.id}
                        </td>

                        <td className="px-4 py-4 font-black text-slate-900">
                          {log.toolName}
                        </td>

                        <td className="px-4 py-4 text-slate-700 font-semibold">
                          {log.toolType}
                        </td>

                        <td className="px-4 py-4 font-black text-blue-700">
                          {log.quantity}
                        </td>

                        <td className="px-4 py-4 font-black text-slate-800">
                          {formatCurrency(log.unitPrice)}
                        </td>

                        <td className="px-4 py-4 font-black text-red-600">
                          {formatCurrency(log.totalPrice)}
                        </td>

                        <td className="px-4 py-4 text-slate-700 font-semibold">
                          {formatDateTime(log.purchaseDate)}
                        </td>
                      </tr>
                    ))}

                    {(financeSummary?.purchaseLogs.length || 0) === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-slate-600 font-black"
                        >
                          Henüz satın alma kaydı bulunmamaktadır.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <CalendarDays size={26} className="text-blue-700" />

                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Son Kullanım Kayıtları
                  </h2>

                  <p className="text-slate-600 font-medium">
                    Sistemdeki son kullanım hareketleri.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-3xl">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-950 text-white">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        ID
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Takım
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Kullanım Süresi
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Tarih
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {logs.slice(0, 10).map((log) => (
                      <tr key={log.id} className="border-b border-slate-100">
                        <td className="px-4 py-4 font-black text-slate-500">
                          #{log.id}
                        </td>

                        <td className="px-4 py-4 font-black text-slate-900">
                          {log.tool?.toolName || `Takım #${log.toolId}`}
                        </td>

                        <td className="px-4 py-4 font-black text-blue-700">
                          {log.usedMinute} dk
                        </td>

                        <td className="px-4 py-4 text-slate-700 font-semibold">
                          {formatDateTime(log.usageDate)}
                        </td>
                      </tr>
                    ))}

                    {logs.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-slate-600 font-black"
                        >
                          Henüz kullanım kaydı bulunmamaktadır.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 print:p-5">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 size={26} className="text-green-700" />

                <h2 className="text-2xl font-black text-slate-900">
                  Rapor Değerlendirmesi
                </h2>
              </div>

              <p className="text-slate-700 leading-8 font-medium">
                Sistemde toplam <b>{tools.length}</b> takım kayıtlıdır. Şu anda{" "}
                <b>{runningTools.length}</b> takım çalışır durumdadır. Kritik
                stokta <b>{criticalStockTools.length}</b> takım, kritik ömür
                seviyesinde ise <b>{lowLifeTools.length}</b> takım
                bulunmaktadır. Sistem bakiyesi{" "}
                <b>{formatCurrency(financeSummary?.wallet.balance || 0)}</b>,
                toplam kazanç{" "}
                <b>{formatCurrency(financeSummary?.wallet.totalEarned || 0)}</b>
                , toplam harcama ise{" "}
                <b>{formatCurrency(financeSummary?.wallet.totalSpent || 0)}</b>
                olarak hesaplanmıştır. Kritik stok ihtiyaçlarını karşılamak için
                gereken toplam bütçe <b>{formatCurrency(totalNeededBudget)}</b>
                değerindedir. Mevcut bakiye ile{" "}
                <b>{purchasableCriticalTools}</b> kritik takım grubu satın
                alınabilir durumdadır. Aktif bakım planı sayısı{" "}
                <b>{activeMaintenancePlans.length}</b>, tamamlanan bakım sayısı
                ise <b>{completedMaintenancePlans.length}</b> olarak kayıt
                altına alınmıştır. Sistem tarafından önerilen bakım/değişim
                ihtiyacı <b>{maintenanceRecommendations.length}</b> adettir.
              </p>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
              <div>
                <p className="text-slate-500 font-bold">Hazırlayan</p>

                <p className="text-slate-900 font-black mt-2">
                  {user?.fullName || user?.username || "Kullanıcı"}
                </p>
              </div>

              <div>
                <p className="text-slate-500 font-bold">Rapor Tarihi</p>

                <p className="text-slate-900 font-black mt-2">{today}</p>
              </div>

              <div>
                <p className="text-slate-500 font-bold">Rapor Durumu</p>

                <p className="text-green-700 font-black mt-2">
                  Sistemden otomatik oluşturuldu
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}