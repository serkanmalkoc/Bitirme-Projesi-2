"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType, ReactNode } from "react";
import { useRouter } from "next/navigation";
import api from "./services/api";
import connection from "@/app/services/signalr";
import toast, { Toaster } from "react-hot-toast";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Gauge,
  History,
  Package,
  RefreshCcw,
  ShieldAlert,
  ShoppingCart,
  Table2,
  Timer,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wrench,
} from "lucide-react";

type DashboardData = {
  totalTools: number;
  criticalStockTools: number;
  lowLifeTools: number;
};

type Tool = {
  id: number;
  toolName: string;
  toolType: string;
  stock: number;
  criticalStock: number;
  totalLifeMinute: number;
  remainingLifeMinute: number;
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

type FinanceSummary = {
  wallet: WalletInfo;
  runningTools: {
    id: number;
    toolName: string;
    toolType: string;
    remainingLifeMinute: number;
    incomePerMinute: number;
    startedAt?: string | null;
  }[];
  criticalStockTools: {
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
  }[];
  purchaseLogs: {
    id: number;
    toolId: number;
    toolName: string;
    toolType: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    purchaseDate: string;
  }[];
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

type DashboardTab =
  | "overview"
  | "tools"
  | "usage"
  | "finance"
  | "maintenance"
  | "alerts";

type CardColor =
  | "slate"
  | "blue"
  | "red"
  | "yellow"
  | "emerald"
  | "green"
  | "purple";

export default function HomePage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  const [data, setData] = useState<DashboardData>();
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

  const getLifePercent = (tool: Tool) => {
    if (tool.totalLifeMinute <= 0) {
      return 0;
    }

    return Math.min(
      Math.max(
        Math.round((tool.remainingLifeMinute / tool.totalLifeMinute) * 100),
        0
      ),
      100
    );
  };

  const getLifeStatus = (tool: Tool) => {
    const percent = getLifePercent(tool);

    if (percent < 20) {
      return "Kritik";
    }

    if (percent < 50) {
      return "Dikkat";
    }

    return "İyi";
  };

  const fetchDashboardData = async () => {
    try {
      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        router.push("/login");
        return;
      }

      const parsedUser = JSON.parse(storedUser);

      const token =
        parsedUser.token ||
        parsedUser.Token ||
        parsedUser.accessToken ||
        parsedUser.AccessToken;

      if (!token) {
        localStorage.removeItem("user");
        router.push("/login");
        return;
      }

      setUser(parsedUser);

      const [
        dashboardResponse,
        toolsResponse,
        logsResponse,
        financeResponse,
        maintenancePlansResponse,
        maintenanceRecommendationsResponse,
      ] = await Promise.all([
        api.get("/Dashboard"),
        api.get("/Tool"),
        api.get("/ToolUsageLog"),
        api.get("/Finance/summary"),
        api.get("/MaintenancePlan"),
        api.get("/MaintenancePlan/recommendations"),
      ]);

      setData(dashboardResponse.data);
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

      toast.error("Dashboard verileri yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const startSignalR = async () => {
      try {
        if (connection.state === "Disconnected") {
          await connection.start();
          console.log("Dashboard SignalR bağlantısı kuruldu.");
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
      fetchDashboardData();
    });

    connection.on("ToolCreated", () => {
      fetchDashboardData();
    });

    connection.on("ToolDeleted", () => {
      fetchDashboardData();
    });

    connection.on("BulkPurchaseCompleted", () => {
      fetchDashboardData();
    });

    connection.on("MaintenancePlanCreated", () => {
      fetchDashboardData();
    });

    connection.on("MaintenancePlanUpdated", () => {
      fetchDashboardData();
    });

    connection.on("MaintenancePlanDeleted", () => {
      fetchDashboardData();
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

  const today = new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    weekday: "long",
  });

  const runningTools = useMemo(
    () => tools.filter((tool) => tool.isRunning),
    [tools]
  );

  const stoppedTools = useMemo(
    () => tools.filter((tool) => !tool.isRunning),
    [tools]
  );

  const criticalStockTools = useMemo(
    () => tools.filter((tool) => tool.stock <= tool.criticalStock),
    [tools]
  );

  const lowLifeTools = useMemo(
    () => tools.filter((tool) => tool.remainingLifeMinute < 200),
    [tools]
  );

  const activeMaintenancePlans = useMemo(
    () =>
      maintenancePlans.filter(
        (plan) => plan.status === "Planlandı" || plan.status === "Devam Ediyor"
      ),
    [maintenancePlans]
  );

  const completedMaintenancePlans = useMemo(
    () => maintenancePlans.filter((plan) => plan.status === "Tamamlandı"),
    [maintenancePlans]
  );

  const highPriorityMaintenanceRecommendations = useMemo(
    () => maintenanceRecommendations.filter((item) => item.priority === "Yüksek"),
    [maintenanceRecommendations]
  );

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

  const totalStockValue = tools.reduce(
    (total, tool) =>
      total + Number(tool.stock || 0) * Number(tool.purchasePrice || 0),
    0
  );

  const totalNeededBudget =
    financeSummary?.criticalStockTools.reduce(
      (total, tool) => total + tool.totalNeededPrice,
      0
    ) || 0;

  const alertCount =
    criticalStockTools.length +
    lowLifeTools.length +
    highPriorityMaintenanceRecommendations.length;

  const systemStatus =
    alertCount === 0 ? "Normal" : alertCount <= 3 ? "Dikkat" : "Kritik";

  const sortedTools = tools
    .slice()
    .sort((a, b) => a.remainingLifeMinute - b.remainingLifeMinute);

  const recentLogs = logs.slice(0, 10);
  const recentPurchases = financeSummary?.purchaseLogs.slice(0, 10) || [];
  const recentMaintenance = maintenancePlans.slice(0, 10);

  if (isLoading) {
    return (
      <>
        <Toaster position="top-right" />

        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="bg-white px-8 py-7 rounded-3xl shadow-sm border border-slate-200 text-center">
            <h1 className="text-xl font-black text-slate-900">
              Dashboard yükleniyor...
            </h1>

            <p className="text-slate-500 font-semibold mt-2">
              Sistem verileri hazırlanıyor.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-screen bg-slate-100 p-6">
        <div className="bg-slate-950 rounded-3xl p-6 text-white shadow-sm mb-6 overflow-hidden relative">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-600/20 blur-3xl rounded-full" />
          <div className="absolute right-44 bottom-0 w-56 h-56 bg-emerald-500/10 blur-3xl rounded-full" />

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="bg-blue-500/15 border border-blue-400/20 text-blue-200 px-3 py-1.5 rounded-full text-xs font-black">
                  CNC ToolRoom
                </span>

                <span className="bg-white/10 border border-white/10 text-slate-300 px-3 py-1.5 rounded-full text-xs font-bold">
                  {today}
                </span>

                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-black border ${
                    systemStatus === "Normal"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : systemStatus === "Dikkat"
                      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                      : "bg-red-100 text-red-600 border-red-200"
                  }`}
                >
                  Sistem: {systemStatus}
                </span>
              </div>

<h1 className="text-3xl xl:text-4xl font-black tracking-tight">
  CNC Takım Yönetim Paneli
</h1>

<p className="text-slate-400 font-medium mt-2 max-w-3xl leading-7">
  Hoş geldiniz,{" "}
  <span className="text-white font-black">
    {user?.fullName || user?.username || "Kullanıcı"}
  </span>
  . Bu panel üzerinden takım ömrü, stok durumu, bakım planları,
  satın alma ihtiyaçları ve üretim süreçleri anlık olarak takip edilir.
</p>
            </div>

            <div className="grid grid-cols-2 gap-3 min-w-[330px]">
              <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                <p className="text-xs text-slate-400 font-bold">
                  Son Güncelleme
                </p>

                <p className="text-xl font-black mt-1">
                  {lastUpdate || "Henüz yok"}
                </p>
              </div>

              <button
                onClick={fetchDashboardData}
                className="bg-blue-600 hover:bg-blue-700 rounded-2xl p-4 text-left transition"
              >
                <RefreshCcw size={20} className="mb-2" />

                <p className="text-sm font-black">Verileri Yenile</p>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-3 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              icon={BarChart3}
              title="Genel"
            />

            <TabButton
              active={activeTab === "tools"}
              onClick={() => setActiveTab("tools")}
              icon={Table2}
              title="Takımlar"
            />

            <TabButton
              active={activeTab === "usage"}
              onClick={() => setActiveTab("usage")}
              icon={History}
              title="Kullanım"
            />

            <TabButton
              active={activeTab === "finance"}
              onClick={() => setActiveTab("finance")}
              icon={Wallet}
              title="Finans"
            />

            <TabButton
              active={activeTab === "maintenance"}
              onClick={() => setActiveTab("maintenance")}
              icon={ClipboardCheck}
              title="Bakım"
            />

            <TabButton
              active={activeTab === "alerts"}
              onClick={() => setActiveTab("alerts")}
              icon={ShieldAlert}
              title="Uyarılar"
            />
          </div>
        </div>

        {activeTab === "overview" && (
          <SlideCard
            title="Genel Bakış"
            description="Sistemin ana durumu kartlar ve kısa tablolarla özetlenir."
            icon={BarChart3}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              <MetricCard
                title="Toplam Takım"
                value={data?.totalTools ?? tools.length}
                icon={Wrench}
                color="slate"
                subText="Kayıtlı takım"
              />

              <MetricCard
                title="Çalışan"
                value={runningTools.length}
                icon={Activity}
                color="blue"
                subText="Aktif takım"
              />

              <MetricCard
                title="Duran"
                value={stoppedTools.length}
                icon={Clock3}
                color="purple"
                subText="Pasif takım"
              />

              <MetricCard
                title="Kritik Stok"
                value={criticalStockTools.length}
                icon={AlertTriangle}
                color="red"
                subText="Stok uyarısı"
              />

              <MetricCard
                title="Kritik Ömür"
                value={lowLifeTools.length}
                icon={Timer}
                color="yellow"
                subText="< 200 dk"
              />

              <MetricCard
                title="Ortalama Ömür"
                value={`%${averageLifePercent}`}
                icon={Gauge}
                color="emerald"
                subText="Genel oran"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <ProTable
                title="En Kritik Takımlar"
                icon={Timer}
                description="Kalan ömrü en düşük takımlar."
              >
                <table className="w-full min-w-[720px]">
                  <TableHead
                    columns={[
                      "Takım",
                      "Tip",
                      "Kalan Ömür",
                      "Ömür Oranı",
                      "Durum",
                    ]}
                  />

                  <tbody>
                    {sortedTools.slice(0, 6).map((tool) => {
                      const percent = getLifePercent(tool);

                      return (
                        <tr
                          key={tool.id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <TableCell strong>{tool.toolName}</TableCell>
                          <TableCell>{tool.toolType}</TableCell>
                          <TableCell strong>{tool.remainingLifeMinute} dk</TableCell>
                          <TableCell>
                            <LifeBar percent={percent} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={getLifeStatus(tool)} />
                          </TableCell>
                        </tr>
                      );
                    })}

                    {sortedTools.length === 0 && (
                      <EmptyTableRow colSpan={5} text="Takım kaydı yok." />
                    )}
                  </tbody>
                </table>
              </ProTable>

              <ProTable
                title="Son İşlemler"
                icon={History}
                description="Son kullanım kayıtları."
              >
                <table className="w-full min-w-[650px]">
                  <TableHead
                    columns={["ID", "Takım", "Kullanım", "Tarih"]}
                  />

                  <tbody>
                    {recentLogs.slice(0, 6).map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <TableCell strong>#{log.id}</TableCell>
                        <TableCell strong>
                          {log.tool?.toolName || `Takım #${log.toolId}`}
                        </TableCell>
                        <TableCell>{log.usedMinute} dk</TableCell>
                        <TableCell>{formatDateTime(log.usageDate)}</TableCell>
                      </tr>
                    ))}

                    {recentLogs.length === 0 && (
                      <EmptyTableRow colSpan={4} text="Kullanım kaydı yok." />
                    )}
                  </tbody>
                </table>
              </ProTable>
            </div>
          </SlideCard>
        )}

        {activeTab === "tools" && (
          <SlideCard
            title="Takımlar Tablosu"
            description="Tüm takımların stok, ömür, çalışma ve maliyet bilgileri."
            icon={Table2}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="Toplam"
                value={tools.length}
                icon={Wrench}
                color="slate"
                subText="Takım"
              />

              <MetricCard
                title="Çalışıyor"
                value={runningTools.length}
                icon={Activity}
                color="blue"
                subText="Aktif"
              />

              <MetricCard
                title="Kritik Stok"
                value={criticalStockTools.length}
                icon={Package}
                color="red"
                subText="Riskli"
              />

              <MetricCard
                title="Stok Değeri"
                value={formatCurrency(totalStockValue)}
                icon={CircleDollarSign}
                color="green"
                subText="Toplam"
                small
              />
            </div>

            <ProTable
              title="Takım Envanteri"
              icon={Wrench}
              description="Takımlar profesyonel tablo görünümünde listelenir."
            >
              <table className="w-full min-w-[1200px]">
                <TableHead
                  columns={[
                    "ID",
                    "Takım",
                    "Tip",
                    "Çalışma",
                    "Kalan Ömür",
                    "Ömür Oranı",
                    "Stok",
                    "Kritik",
                    "Gelir / dk",
                    "Alış Fiyatı",
                  ]}
                />

                <tbody>
                  {tools.map((tool) => {
                    const percent = getLifePercent(tool);

                    return (
                      <tr
                        key={tool.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <TableCell strong>#{tool.id}</TableCell>
                        <TableCell strong>{tool.toolName}</TableCell>
                        <TableCell>{tool.toolType}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={tool.isRunning ? "Çalışıyor" : "Duruyor"}
                          />
                        </TableCell>
                        <TableCell strong>{tool.remainingLifeMinute} dk</TableCell>
                        <TableCell>
                          <LifeBar percent={percent} />
                        </TableCell>
                        <TableCell strong>{tool.stock}</TableCell>
                        <TableCell>{tool.criticalStock}</TableCell>
                        <TableCell>{formatCurrency(tool.incomePerMinute)}</TableCell>
                        <TableCell>{formatCurrency(tool.purchasePrice)}</TableCell>
                      </tr>
                    );
                  })}

                  {tools.length === 0 && (
                    <EmptyTableRow colSpan={10} text="Takım kaydı yok." />
                  )}
                </tbody>
              </table>
            </ProTable>
          </SlideCard>
        )}

        {activeTab === "usage" && (
          <SlideCard
            title="Kullanım Kayıtları"
            description="Takımların kullanım geçmişi ve toplam çalışma süresi."
            icon={History}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="Toplam Kayıt"
                value={logs.length}
                icon={History}
                color="slate"
                subText="Log"
              />

              <MetricCard
                title="Toplam Kullanım"
                value={`${totalUsedMinute} dk`}
                icon={Timer}
                color="blue"
                subText="Dakika"
              />

              <MetricCard
                title="Çalışan Takım"
                value={runningTools.length}
                icon={Activity}
                color="emerald"
                subText="Anlık"
              />

              <MetricCard
                title="Aktif Gelir"
                value={formatCurrency(totalActiveIncomePerMinute)}
                icon={TrendingUp}
                color="green"
                subText="Dakika başı"
                small
              />
            </div>

            <ProTable
              title="Kullanım Geçmişi"
              icon={History}
              description="Son kullanım kayıtları listelenir."
            >
              <table className="w-full min-w-[850px]">
                <TableHead
                  columns={["ID", "Takım ID", "Takım", "Tip", "Süre", "Tarih"]}
                />

                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <TableCell strong>#{log.id}</TableCell>
                      <TableCell>#{log.toolId}</TableCell>
                      <TableCell strong>
                        {log.tool?.toolName || `Takım #${log.toolId}`}
                      </TableCell>
                      <TableCell>{log.tool?.toolType || "-"}</TableCell>
                      <TableCell strong>{log.usedMinute} dk</TableCell>
                      <TableCell>{formatDateTime(log.usageDate)}</TableCell>
                    </tr>
                  ))}

                  {logs.length === 0 && (
                    <EmptyTableRow colSpan={6} text="Kullanım kaydı yok." />
                  )}
                </tbody>
              </table>
            </ProTable>
          </SlideCard>
        )}

        {activeTab === "finance" && (
          <SlideCard
            title="Finans Tablosu"
            description="Bakiye, gelir, harcama ve satın alma kayıtları."
            icon={Wallet}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="Bakiye"
                value={formatCurrency(financeSummary?.wallet.balance || 0)}
                icon={Wallet}
                color="emerald"
                subText="Kullanılabilir"
                small
              />

              <MetricCard
                title="Toplam Kazanç"
                value={formatCurrency(financeSummary?.wallet.totalEarned || 0)}
                icon={TrendingUp}
                color="green"
                subText="Gelir"
                small
              />

              <MetricCard
                title="Toplam Harcama"
                value={formatCurrency(financeSummary?.wallet.totalSpent || 0)}
                icon={TrendingDown}
                color="red"
                subText="Gider"
                small
              />

              <MetricCard
                title="Gerekli Bütçe"
                value={formatCurrency(totalNeededBudget)}
                icon={ShoppingCart}
                color="yellow"
                subText="Kritik stok"
                small
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
              <ProTable
                title="Satın Alma İhtiyacı"
                icon={ShoppingCart}
                description="Kritik stokta satın alma gereken takımlar."
              >
                <table className="w-full min-w-[900px]">
                  <TableHead
                    columns={[
                      "Takım",
                      "Stok",
                      "Kritik",
                      "Alınacak",
                      "Birim Fiyat",
                      "Toplam",
                      "Durum",
                    ]}
                  />

                  <tbody>
                    {financeSummary?.criticalStockTools.map((tool) => (
                      <tr
                        key={tool.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <TableCell strong>{tool.toolName}</TableCell>
                        <TableCell strong>{tool.stock}</TableCell>
                        <TableCell>{tool.criticalStock}</TableCell>
                        <TableCell>{tool.neededQuantity}</TableCell>
                        <TableCell>{formatCurrency(tool.purchasePrice)}</TableCell>
                        <TableCell strong>
                          {formatCurrency(tool.totalNeededPrice)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={
                              tool.canPurchase
                                ? "Satın Alınabilir"
                                : "Bakiye Yetersiz"
                            }
                          />
                        </TableCell>
                      </tr>
                    ))}

                    {(financeSummary?.criticalStockTools.length || 0) === 0 && (
                      <EmptyTableRow
                        colSpan={7}
                        text="Satın alma ihtiyacı yok."
                      />
                    )}
                  </tbody>
                </table>
              </ProTable>

              <ProTable
                title="Gelir Üreten Takımlar"
                icon={TrendingUp}
                description="Çalışan ve gelir oluşturan takımlar."
              >
                <table className="w-full min-w-[700px]">
                  <TableHead
                    columns={["Takım", "Tip", "Kalan Ömür", "Gelir / dk"]}
                  />

                  <tbody>
                    {financeSummary?.runningTools.map((tool) => (
                      <tr
                        key={tool.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <TableCell strong>{tool.toolName}</TableCell>
                        <TableCell>{tool.toolType}</TableCell>
                        <TableCell strong>{tool.remainingLifeMinute} dk</TableCell>
                        <TableCell>{formatCurrency(tool.incomePerMinute)}</TableCell>
                      </tr>
                    ))}

                    {(financeSummary?.runningTools.length || 0) === 0 && (
                      <EmptyTableRow
                        colSpan={4}
                        text="Gelir üreten aktif takım yok."
                      />
                    )}
                  </tbody>
                </table>
              </ProTable>
            </div>

            <ProTable
              title="Satın Alma Geçmişi"
              icon={History}
              description="Yapılan satın alma hareketleri."
            >
              <table className="w-full min-w-[1000px]">
                <TableHead
                  columns={[
                    "ID",
                    "Takım",
                    "Tip",
                    "Adet",
                    "Birim Fiyat",
                    "Toplam",
                    "Tarih",
                  ]}
                />

                <tbody>
                  {recentPurchases.map((purchase) => (
                    <tr
                      key={purchase.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <TableCell strong>#{purchase.id}</TableCell>
                      <TableCell strong>{purchase.toolName}</TableCell>
                      <TableCell>{purchase.toolType}</TableCell>
                      <TableCell>{purchase.quantity}</TableCell>
                      <TableCell>{formatCurrency(purchase.unitPrice)}</TableCell>
                      <TableCell strong>
                        {formatCurrency(purchase.totalPrice)}
                      </TableCell>
                      <TableCell>{formatDateTime(purchase.purchaseDate)}</TableCell>
                    </tr>
                  ))}

                  {recentPurchases.length === 0 && (
                    <EmptyTableRow
                      colSpan={7}
                      text="Satın alma kaydı yok."
                    />
                  )}
                </tbody>
              </table>
            </ProTable>
          </SlideCard>
        )}

        {activeTab === "maintenance" && (
          <SlideCard
            title="Bakım ve Değişim Tabloları"
            description="Bakım planları, öneriler ve tamamlanan bakım işlemleri."
            icon={ClipboardCheck}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="Aktif Plan"
                value={activeMaintenancePlans.length}
                icon={ClipboardCheck}
                color="blue"
                subText="Planlandı/devam"
              />

              <MetricCard
                title="Tamamlandı"
                value={completedMaintenancePlans.length}
                icon={CheckCircle2}
                color="emerald"
                subText="Bakımı bitti"
              />

              <MetricCard
                title="Öneri"
                value={maintenanceRecommendations.length}
                icon={Wrench}
                color="yellow"
                subText="Sistem önerisi"
              />

              <MetricCard
                title="Yüksek Öncelik"
                value={highPriorityMaintenanceRecommendations.length}
                icon={ShieldAlert}
                color="red"
                subText="Acil"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
              <ProTable
                title="Bakım Planları"
                icon={ClipboardCheck}
                description="Planlanan, devam eden ve tamamlanan bakım kayıtları."
              >
                <table className="w-full min-w-[1000px]">
                  <TableHead
                    columns={[
                      "ID",
                      "Takım",
                      "Plan",
                      "Tarih",
                      "Durum",
                      "Kalan Ömür",
                      "Stok",
                    ]}
                  />

                  <tbody>
                    {recentMaintenance.map((plan) => (
                      <tr
                        key={plan.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <TableCell strong>#{plan.id}</TableCell>
                        <TableCell strong>{plan.toolName}</TableCell>
                        <TableCell>{plan.title}</TableCell>
                        <TableCell>{formatDate(plan.plannedDate)}</TableCell>
                        <TableCell>
                          <StatusBadge status={plan.status} />
                        </TableCell>
                        <TableCell strong>{plan.remainingLifeMinute} dk</TableCell>
                        <TableCell>{plan.stock}</TableCell>
                      </tr>
                    ))}

                    {recentMaintenance.length === 0 && (
                      <EmptyTableRow
                        colSpan={7}
                        text="Bakım planı kaydı yok."
                      />
                    )}
                  </tbody>
                </table>
              </ProTable>

              <ProTable
                title="Bakım Önerileri"
                icon={ShieldAlert}
                description="Sistemin kritik takım önerileri."
              >
                <table className="w-full min-w-[850px]">
                  <TableHead
                    columns={[
                      "Takım",
                      "Sebep",
                      "Öncelik",
                      "Kalan Ömür",
                      "Stok",
                      "Plan",
                    ]}
                  />

                  <tbody>
                    {maintenanceRecommendations.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <TableCell strong>{item.toolName}</TableCell>
                        <TableCell>{item.reason}</TableCell>
                        <TableCell>
                          <StatusBadge status={item.priority} />
                        </TableCell>
                        <TableCell strong>
                          {item.remainingLifeMinute} dk
                        </TableCell>
                        <TableCell>{item.stock}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={item.hasActivePlan ? "Var" : "Yok"}
                          />
                        </TableCell>
                      </tr>
                    ))}

                    {maintenanceRecommendations.length === 0 && (
                      <EmptyTableRow
                        colSpan={6}
                        text="Bakım önerisi yok."
                      />
                    )}
                  </tbody>
                </table>
              </ProTable>
            </div>
          </SlideCard>
        )}

        {activeTab === "alerts" && (
          <SlideCard
            title="Uyarı Tabloları"
            description="Kritik stok, kritik ömür ve yüksek öncelikli bakım uyarıları."
            icon={ShieldAlert}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="Toplam Uyarı"
                value={alertCount}
                icon={ShieldAlert}
                color={alertCount > 0 ? "red" : "emerald"}
                subText={systemStatus}
              />

              <MetricCard
                title="Kritik Stok"
                value={criticalStockTools.length}
                icon={Package}
                color="red"
                subText="Stok riski"
              />

              <MetricCard
                title="Kritik Ömür"
                value={lowLifeTools.length}
                icon={Timer}
                color="yellow"
                subText="Ömür riski"
              />

              <MetricCard
                title="Acil Bakım"
                value={highPriorityMaintenanceRecommendations.length}
                icon={ClipboardCheck}
                color="purple"
                subText="Öncelik"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <ProTable
                title="Kritik Stok Uyarıları"
                icon={Package}
                description="Stok seviyesi kritik seviyeye düşen takımlar."
              >
                <table className="w-full min-w-[700px]">
                  <TableHead
                    columns={["Takım", "Tip", "Mevcut Stok", "Kritik Stok"]}
                  />

                  <tbody>
                    {criticalStockTools.map((tool) => (
                      <tr
                        key={tool.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <TableCell strong>{tool.toolName}</TableCell>
                        <TableCell>{tool.toolType}</TableCell>
                        <TableCell strong>{tool.stock}</TableCell>
                        <TableCell>{tool.criticalStock}</TableCell>
                      </tr>
                    ))}

                    {criticalStockTools.length === 0 && (
                      <EmptyTableRow
                        colSpan={4}
                        text="Kritik stok uyarısı yok."
                      />
                    )}
                  </tbody>
                </table>
              </ProTable>

              <ProTable
                title="Kritik Ömür Uyarıları"
                icon={Timer}
                description="Kalan ömrü düşük olan takımlar."
              >
                <table className="w-full min-w-[750px]">
                  <TableHead
                    columns={["Takım", "Tip", "Kalan Ömür", "Toplam Ömür", "Oran"]}
                  />

                  <tbody>
                    {lowLifeTools.map((tool) => (
                      <tr
                        key={tool.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <TableCell strong>{tool.toolName}</TableCell>
                        <TableCell>{tool.toolType}</TableCell>
                        <TableCell strong>{tool.remainingLifeMinute} dk</TableCell>
                        <TableCell>{tool.totalLifeMinute} dk</TableCell>
                        <TableCell>
                          <LifeBar percent={getLifePercent(tool)} />
                        </TableCell>
                      </tr>
                    ))}

                    {lowLifeTools.length === 0 && (
                      <EmptyTableRow
                        colSpan={5}
                        text="Kritik ömür uyarısı yok."
                      />
                    )}
                  </tbody>
                </table>
              </ProTable>
            </div>
          </SlideCard>
        )}
      </div>
    </>
  );
}

function colorClasses(color: CardColor) {
  const colors = {
    slate: {
      border: "border-slate-200",
      bg: "bg-slate-50",
      text: "text-slate-900",
      icon: "text-slate-700",
    },
    blue: {
      border: "border-blue-200",
      bg: "bg-blue-50",
      text: "text-blue-700",
      icon: "text-blue-700",
    },
    red: {
      border: "border-red-200",
      bg: "bg-red-50",
      text: "text-red-600",
      icon: "text-red-600",
    },
    yellow: {
      border: "border-yellow-200",
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      icon: "text-yellow-700",
    },
    emerald: {
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      icon: "text-emerald-700",
    },
    green: {
      border: "border-green-200",
      bg: "bg-green-50",
      text: "text-green-700",
      icon: "text-green-700",
    },
    purple: {
      border: "border-purple-200",
      bg: "bg-purple-50",
      text: "text-purple-700",
      icon: "text-purple-700",
    },
  };

  return colors[color];
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: ElementType;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-4 py-4 font-black transition flex items-center justify-center gap-2 ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Icon size={20} />
      <span className="text-sm">{title}</span>
    </button>
  );
}

function SlideCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: ElementType;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center">
          <Icon size={24} />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900">{title}</h2>

          <p className="text-slate-500 font-semibold">{description}</p>
        </div>
      </div>

      <div className="p-5">{children}</div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  subText,
  small = false,
}: {
  title: string;
  value: string | number;
  icon: ElementType;
  color: CardColor;
  subText: string;
  small?: boolean;
}) {
  const classes = colorClasses(color);

  return (
    <div
      className={`bg-white rounded-3xl p-5 shadow-sm border ${classes.border}`}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-500 text-sm font-black">{title}</p>

        <div
          className={`w-10 h-10 rounded-2xl ${classes.bg} ${classes.icon} flex items-center justify-center`}
        >
          <Icon size={20} />
        </div>
      </div>

      <h2
        className={`font-black ${classes.text} ${
          small ? "text-2xl" : "text-3xl"
        }`}
      >
        {value}
      </h2>

      <p className="text-slate-500 text-xs font-bold mt-2">{subText}</p>
    </div>
  );
}

function ProTable({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: ElementType;
  children: ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center">
            <Icon size={20} />
          </div>

          <div>
            <h3 className="font-black text-slate-900">{title}</h3>

            <p className="text-sm text-slate-500 font-semibold">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function TableHead({ columns }: { columns: string[] }) {
  return (
    <thead className="bg-slate-950 text-white">
      <tr>
        {columns.map((column) => (
          <th
            key={column}
            className="px-4 py-4 text-left text-xs uppercase tracking-wide whitespace-nowrap"
          >
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function TableCell({
  children,
  strong = false,
}: {
  children: ReactNode;
  strong?: boolean;
}) {
  return (
    <td
      className={`px-4 py-4 text-sm whitespace-nowrap ${
        strong ? "font-black text-slate-900" : "font-semibold text-slate-600"
      }`}
    >
      {children}
    </td>
  );
}

function EmptyTableRow({
  colSpan,
  text,
}: {
  colSpan: number;
  text: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-10 text-center text-slate-500 font-black"
      >
        {text}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  let className = "bg-slate-100 text-slate-700";

  if (
    normalized.includes("çalışıyor") ||
    normalized.includes("iyi") ||
    normalized.includes("tamamlandı") ||
    normalized.includes("satın alınabilir") ||
    normalized === "var"
  ) {
    className = "bg-emerald-100 text-emerald-700";
  }

  if (
    normalized.includes("duruyor") ||
    normalized.includes("planlandı") ||
    normalized === "yok"
  ) {
    className = "bg-blue-100 text-blue-700";
  }

  if (
    normalized.includes("dikkat") ||
    normalized.includes("devam") ||
    normalized.includes("orta")
  ) {
    className = "bg-yellow-100 text-yellow-700";
  }

  if (
    normalized.includes("kritik") ||
    normalized.includes("yüksek") ||
    normalized.includes("yetersiz") ||
    normalized.includes("iptal")
  ) {
    className = "bg-red-100 text-red-600";
  }

  return (
    <span
      className={`px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap ${className}`}
    >
      {status}
    </span>
  );
}

function LifeBar({ percent }: { percent: number }) {
  let color = "bg-emerald-500";

  if (percent < 20) {
    color = "bg-red-500";
  } else if (percent < 50) {
    color = "bg-yellow-500";
  }

  return (
    <div className="min-w-[150px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500 font-black">Ömür</span>

        <span className="text-xs text-slate-900 font-black">%{percent}</span>
      </div>

      <div className="w-full bg-slate-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}