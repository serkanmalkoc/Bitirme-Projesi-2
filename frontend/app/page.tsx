"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "./services/api";
import connection from "@/app/services/signalr";
import toast, { Toaster } from "react-hot-toast";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

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

type ToolUsageAddedEvent = {
  toolId: number;
  toolName: string;
  toolType: string;
  usedMinute: number;
  remainingLifeMinute: number;
  totalLifeMinute: number;
  stock: number;
  criticalStock: number;
  usageDate: string;
};

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>();
  const [tools, setTools] = useState<Tool[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");

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

    const [dashboardResponse, toolsResponse, logsResponse] =
      await Promise.all([
        api.get("/Dashboard"),
        api.get("/Tool"),
        api.get("/ToolUsageLog"),
      ]);

    setData(dashboardResponse.data);
    setTools(toolsResponse.data);
    setLogs(logsResponse.data);
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

    toast.error("Dashboard verileri yüklenemedi!");
  } finally {
    setIsLoading(false);
  }
};

 useEffect(() => {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) {
    router.push("/login");
    setIsLoading(false);
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
    setIsLoading(false);
    return;
  }

  setUser(parsedUser);
  fetchDashboardData();
}, [router]);

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

    connection.on("ToolUsageAdded", (eventData: ToolUsageAddedEvent) => {
      setTools((prevTools) =>
        prevTools.map((tool) =>
          tool.id === eventData.toolId
            ? {
                ...tool,
                remainingLifeMinute: eventData.remainingLifeMinute,
                stock: eventData.stock,
                criticalStock: eventData.criticalStock,
                totalLifeMinute: eventData.totalLifeMinute,
              }
            : tool
        )
      );

      setLastUpdate(new Date().toLocaleTimeString("tr-TR"));

      toast.success(
        `${eventData.toolName} için ${eventData.usedMinute} dk kullanım işlendi.`
      );

      fetchDashboardData();
    });

    return () => {
      connection.off("ToolUsageAdded");
    };
  }, []);

  const today = new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    weekday: "long",
  });

  const normalStockCount = tools.filter(
    (tool) => tool.stock > tool.criticalStock
  ).length;

  const criticalStockCount = tools.filter(
    (tool) => tool.stock <= tool.criticalStock
  ).length;

  const lowLifeCount = tools.filter(
    (tool) => tool.remainingLifeMinute < 200
  ).length;

  const totalRemainingLife = tools.reduce(
    (total, tool) => total + tool.remainingLifeMinute,
    0
  );

  const totalLife = tools.reduce(
    (total, tool) => total + tool.totalLifeMinute,
    0
  );

  const averageLifePercent =
    totalLife > 0
      ? Math.round((totalRemainingLife / totalLife) * 100)
      : 0;

  const totalUsedMinute =
    totalLife > totalRemainingLife ? totalLife - totalRemainingLife : 0;

  const systemHealth =
    criticalStockCount === 0 && lowLifeCount === 0
      ? "İyi"
      : criticalStockCount <= 2 && lowLifeCount <= 2
      ? "Dikkat"
      : "Kritik";

  const systemHealthStyle =
    systemHealth === "İyi"
      ? "bg-green-100 text-green-700 border-green-200"
      : systemHealth === "Dikkat"
      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : "bg-red-100 text-red-700 border-red-200";

  const criticalTools = tools.filter(
    (tool) => tool.stock <= tool.criticalStock
  );

  const lowLifeTools = tools.filter(
    (tool) => tool.remainingLifeMinute < 200
  );

  const lastLogs = logs.slice(0, 5);

  const stockChartData = {
    labels: tools.map((tool) => tool.toolName),
    datasets: [
      {
        label: "Mevcut Stok",
        data: tools.map((tool) => tool.stock),
        backgroundColor: "rgba(37, 99, 235, 0.75)",
        borderRadius: 10,
      },
      {
        label: "Kritik Stok",
        data: tools.map((tool) => tool.criticalStock),
        backgroundColor: "rgba(239, 68, 68, 0.75)",
        borderRadius: 10,
      },
    ],
  };

  const lifeChartData = {
    labels: tools.map((tool) => tool.toolName),
    datasets: [
      {
        label: "Kalan Ömür",
        data: tools.map((tool) => tool.remainingLifeMinute),
        backgroundColor: "rgba(34, 197, 94, 0.75)",
        borderRadius: 10,
      },
      {
        label: "Toplam Ömür",
        data: tools.map((tool) => tool.totalLifeMinute),
        backgroundColor: "rgba(250, 204, 21, 0.75)",
        borderRadius: 10,
      },
    ],
  };

  const stockRatioData = {
    labels: ["Normal Stok", "Kritik Stok"],
    datasets: [
      {
        data: [normalStockCount, criticalStockCount],
        backgroundColor: [
          "rgba(34, 197, 94, 0.85)",
          "rgba(239, 68, 68, 0.85)",
        ],
        borderWidth: 0,
      },
    ],
  };

  const lifeRatioData = {
    labels: ["Kalan Ömür", "Kullanılan Ömür"],
    datasets: [
      {
        data: [totalRemainingLife, totalUsedMinute],
        backgroundColor: [
          "rgba(59, 130, 246, 0.85)",
          "rgba(148, 163, 184, 0.45)",
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          font: {
            weight: "bold" as const,
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(148, 163, 184, 0.2)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          font: {
            weight: "bold" as const,
          },
        },
      },
    },
  };

  if (isLoading) {
    return (
      <>
        <Toaster position="top-right" />

        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="bg-white px-10 py-8 rounded-3xl shadow text-center">
            <h1 className="text-2xl font-black text-slate-900 mb-2">
              Dashboard yükleniyor...
            </h1>

            <p className="text-slate-600 font-medium">
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

      <div className="min-h-screen bg-slate-100 p-10">
        <div className="mb-8">
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 rounded-3xl p-10 shadow-lg text-white overflow-hidden relative">
            <div className="absolute -right-24 -top-24 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
            <div className="absolute right-40 bottom-0 w-52 h-52 bg-cyan-500/10 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
              <div>
                <p className="text-blue-300 font-semibold mb-3">
                  CNC Takım Yönetim Sistemi
                </p>

                <h1 className="text-5xl font-black tracking-tight mb-4">
                  Hoş geldiniz, {user?.fullName || user?.username || "Kullanıcı"}
                </h1>

                <p className="text-slate-300 text-lg max-w-3xl leading-8">
                  Bugünkü takım stok durumu, kritik ömür uyarıları ve kullanım
                  hareketleri aşağıda özetlenmiştir.
                </p>

                <p className="text-slate-400 font-semibold mt-5">
                  {today}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-[380px]">
                <div className="bg-white/10 border border-white/10 rounded-3xl p-6">
                  <p className="text-slate-300 font-semibold">
                    Sistem Sağlığı
                  </p>

                  <div
                    className={`mt-3 border rounded-2xl px-4 py-2 text-lg font-black w-fit ${systemHealthStyle}`}
                  >
                    {systemHealth}
                  </div>
                </div>

                <div className="bg-white/10 border border-white/10 rounded-3xl p-6">
                  <p className="text-slate-300 font-semibold">
                    Ortalama Ömür
                  </p>

                  <p className="text-5xl font-black text-green-400 mt-2">
                    %{averageLifePercent}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t border-white/10 pt-6">
              <p className="text-slate-300 font-medium">
                Son güncelleme:{" "}
                <span className="font-black text-white">
                  {lastUpdate || "Henüz yok"}
                </span>
              </p>

              <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 text-green-300 px-5 py-3 rounded-2xl font-black">
                <span className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-500/50" />
                Canlı takip aktif
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-200 hover:shadow-md transition">
            <p className="text-slate-600 font-bold">
              Toplam Takım
            </p>

            <h2 className="text-5xl font-black text-slate-900 mt-2">
              {data?.totalTools ?? tools.length}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Sisteme kayıtlı aktif takım sayısı.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-red-200 hover:shadow-md transition">
            <p className="text-red-600 font-bold">
              Kritik Stok
            </p>

            <h2 className="text-5xl font-black text-red-600 mt-2">
              {data?.criticalStockTools ?? criticalStockCount}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Stok seviyesi kritik olan takımlar.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-yellow-200 hover:shadow-md transition">
            <p className="text-yellow-700 font-bold">
              Kritik Ömür
            </p>

            <h2 className="text-5xl font-black text-yellow-700 mt-2">
              {data?.lowLifeTools ?? lowLifeCount}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Kalan ömrü 200 dakikanın altında olanlar.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-blue-200 hover:shadow-md transition">
            <p className="text-blue-700 font-bold">
              Toplam Kalan Ömür
            </p>

            <h2 className="text-5xl font-black text-blue-700 mt-2">
              {totalRemainingLife}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Dakika cinsinden kullanılabilir ömür.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          <div className="xl:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Stok Durumu Analizi
                </h2>

                <p className="text-slate-600 mt-1 font-medium">
                  Mevcut stok ve kritik stok seviyelerinin karşılaştırması.
                </p>
              </div>

              <div className="bg-blue-50 text-blue-700 px-5 py-3 rounded-2xl font-black">
                {tools.length} takım
              </div>
            </div>

            <div className="h-[360px]">
              <Bar data={stockChartData} options={chartOptions} />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              Stok Dağılımı
            </h2>

            <p className="text-slate-600 mb-6 font-medium">
              Normal ve kritik stok oranı.
            </p>

            <div className="h-[260px]">
              <Doughnut data={stockRatioData} options={doughnutOptions} />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
                <p className="text-green-700 font-bold">
                  Normal
                </p>

                <p className="text-green-900 text-3xl font-black mt-1">
                  {normalStockCount}
                </p>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
                <p className="text-red-700 font-bold">
                  Kritik
                </p>

                <p className="text-red-900 text-3xl font-black mt-1">
                  {criticalStockCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          <div className="xl:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Takım Ömür Analizi
                </h2>

                <p className="text-slate-600 mt-1 font-medium">
                  Toplam ömür ve kalan ömür değerleri.
                </p>
              </div>

              <div className="bg-green-50 text-green-700 px-5 py-3 rounded-2xl font-black">
                Ortalama %{averageLifePercent}
              </div>
            </div>

            <div className="h-[360px]">
              <Bar data={lifeChartData} options={chartOptions} />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              Ömür Kullanımı
            </h2>

            <p className="text-slate-600 mb-6 font-medium">
              Toplam takım ömrüne göre kalan ve tüketilen oran.
            </p>

            <div className="h-[260px]">
              <Doughnut data={lifeRatioData} options={doughnutOptions} />
            </div>

            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <p className="text-slate-600 font-bold">
                Kullanılan toplam süre
              </p>

              <p className="text-slate-900 text-4xl font-black mt-2">
                {totalUsedMinute} dk
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-black text-slate-900">
                Son Kullanım Kayıtları
              </h2>

              <p className="text-slate-600 mt-1 font-medium">
                Sisteme girilen son 5 kullanım hareketi.
              </p>
            </div>

            <div className="p-6 space-y-4">
              {lastLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-black text-slate-900">
                        {log.tool?.toolName || `Takım #${log.toolId}`}
                      </p>

                      <p className="text-slate-600 text-sm font-medium mt-1">
                        {new Date(log.usageDate).toLocaleString("tr-TR")}
                      </p>
                    </div>

                    <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-black">
                      {log.usedMinute} dk
                    </div>
                  </div>
                </div>
              ))}

              {lastLogs.length === 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                  <p className="text-slate-600 font-bold">
                    Henüz kullanım kaydı yok.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-black text-slate-900">
                Kritik Stok Uyarıları
              </h2>

              <p className="text-slate-600 mt-1 font-medium">
                Stok miktarı kritik seviyede olan takımlar.
              </p>
            </div>

            <div className="p-6 space-y-4">
              {criticalTools.slice(0, 5).map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between bg-red-50 border border-red-100 rounded-2xl p-5"
                >
                  <div>
                    <p className="font-black text-slate-900">
                      {tool.toolName}
                    </p>

                    <p className="text-slate-600 text-sm font-medium mt-1">
                      {tool.toolType} • Kritik: {tool.criticalStock}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-red-600 text-3xl font-black">
                      {tool.stock}
                    </p>

                    <p className="text-red-700 text-sm font-bold">
                      stok
                    </p>
                  </div>
                </div>
              ))}

              {criticalTools.length === 0 && (
                <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center">
                  <p className="text-green-700 font-black">
                    Kritik stokta takım bulunmuyor.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-black text-slate-900">
                Kritik Ömür Uyarıları
              </h2>

              <p className="text-slate-600 mt-1 font-medium">
                Kalan ömrü düşük olan takımlar.
              </p>
            </div>

            <div className="p-6 space-y-4">
              {lowLifeTools.slice(0, 5).map((tool) => {
                const lifePercent =
                  tool.totalLifeMinute > 0
                    ? Math.round(
                        (tool.remainingLifeMinute /
                          tool.totalLifeMinute) *
                          100
                      )
                    : 0;

                return (
                  <div
                    key={tool.id}
                    className="bg-yellow-50 border border-yellow-100 rounded-2xl p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-black text-slate-900">
                          {tool.toolName}
                        </p>

                        <p className="text-slate-600 text-sm font-medium mt-1">
                          {tool.toolType}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-yellow-700 text-3xl font-black">
                          {tool.remainingLifeMinute}
                        </p>

                        <p className="text-yellow-700 text-sm font-bold">
                          dk
                        </p>
                      </div>
                    </div>

                    <div className="w-full bg-yellow-200 rounded-full h-3">
                      <div
                        className="h-3 rounded-full bg-yellow-600"
                        style={{ width: `${lifePercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {lowLifeTools.length === 0 && (
                <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center">
                  <p className="text-green-700 font-black">
                    Kritik ömürlü takım bulunmuyor.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}