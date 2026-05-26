"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/app/services/api";
import connection from "@/app/services/signalr";
import toast, { Toaster } from "react-hot-toast";

import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileClock,
  Filter,
  Gauge,
  History,
  Package,
  Search,
  Timer,
  Wrench,
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
  isRunning?: boolean;
  startedAt?: string | null;
  usageDate: string;
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
};

type ToolRunningChangedEvent = {
  toolId: number;
  toolName: string;
  isRunning: boolean;
  startedAt?: string | null;
  remainingLifeMinute: number;
};

export default function UsageLogsPage() {
  const router = useRouter();

  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [user, setUser] = useState<User | null>(null);

  const [selectedToolId, setSelectedToolId] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [toolId, setToolId] = useState("");
  const [usedMinute, setUsedMinute] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  const fetchData = async () => {
    try {
      const authUser = checkAuth();

      if (!authUser) {
        return;
      }

      const [logsResponse, toolsResponse] = await Promise.all([
        api.get("/ToolUsageLog"),
        api.get("/Tool"),
      ]);

      setLogs(logsResponse.data);
      setTools(toolsResponse.data);
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

      toast.error("Kullanım geçmişi yüklenemedi!");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const startSignalR = async () => {
      try {
        if (connection.state === "Disconnected") {
          await connection.start();
          console.log("Usage Logs SignalR bağlantısı kuruldu.");
        }
      } catch (error) {
        console.error("SignalR bağlantı hatası:", error);
      }
    };

    startSignalR();

    connection.on("ToolUsageAdded", (eventData: ToolUsageAddedEvent) => {
      setLogs((prevLogs) => [
        {
          id: Date.now(),
          toolId: eventData.toolId,
          usedMinute: eventData.usedMinute,
          usageDate: eventData.usageDate,
          tool: {
            id: eventData.toolId,
            toolName: eventData.toolName,
            toolType: eventData.toolType,
            totalLifeMinute: eventData.totalLifeMinute,
            remainingLifeMinute: eventData.remainingLifeMinute,
            stock: eventData.stock,
            criticalStock: eventData.criticalStock,
            isRunning: eventData.isRunning ?? false,
            startedAt: eventData.startedAt ?? null,
          },
        },
        ...prevLogs,
      ]);

      setTools((prevTools) =>
        prevTools.map((tool) =>
          tool.id === eventData.toolId
            ? {
                ...tool,
                remainingLifeMinute: eventData.remainingLifeMinute,
                totalLifeMinute: eventData.totalLifeMinute,
                stock: eventData.stock,
                criticalStock: eventData.criticalStock,
                isRunning: eventData.isRunning ?? tool.isRunning,
                startedAt: eventData.startedAt ?? tool.startedAt,
              }
            : tool
        )
      );

      setLastUpdate(new Date().toLocaleTimeString("tr-TR"));

      toast.success(
        `${eventData.toolName} için ${eventData.usedMinute} dk kullanım işlendi.`
      );
    });

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
              }
            : tool
        )
      );

      setLogs((prevLogs) =>
        prevLogs.map((log) =>
          log.toolId === eventData.toolId
            ? {
                ...log,
                tool: log.tool
                  ? {
                      ...log.tool,
                      remainingLifeMinute: eventData.remainingLifeMinute,
                      totalLifeMinute: eventData.totalLifeMinute,
                      stock: eventData.stock,
                      criticalStock: eventData.criticalStock,
                      isRunning: eventData.isRunning,
                    }
                  : {
                      id: eventData.toolId,
                      toolName: eventData.toolName,
                      toolType: eventData.toolType,
                      remainingLifeMinute: eventData.remainingLifeMinute,
                      totalLifeMinute: eventData.totalLifeMinute,
                      stock: eventData.stock,
                      criticalStock: eventData.criticalStock,
                      isRunning: eventData.isRunning,
                      startedAt: null,
                    },
              }
            : log
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
              }
            : tool
        )
      );

      setLogs((prevLogs) =>
        prevLogs.map((log) =>
          log.toolId === eventData.toolId
            ? {
                ...log,
                tool: log.tool
                  ? {
                      ...log.tool,
                      isRunning: eventData.isRunning,
                      startedAt: eventData.startedAt ?? null,
                      remainingLifeMinute: eventData.remainingLifeMinute,
                    }
                  : log.tool,
              }
            : log
        )
      );

      setLastUpdate(new Date().toLocaleTimeString("tr-TR"));

      if (eventData.isRunning) {
        toast.success(`${eventData.toolName} çalıştırıldı.`);
      } else {
        toast.success(`${eventData.toolName} durduruldu.`);
      }
    });

    return () => {
      connection.off("ToolUsageAdded");
      connection.off("ToolLifeTick");
      connection.off("ToolRunningChanged");
    };
  }, []);

  const handleCreateUsageLog = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!toolId || !usedMinute) {
      toast.error("Takım ve kullanım süresi giriniz.");
      return;
    }

    const selectedTool = tools.find((tool) => tool.id === Number(toolId));

    if (!selectedTool) {
      toast.error("Seçilen takım bulunamadı.");
      return;
    }

    if (Number(usedMinute) <= 0) {
      toast.error("Kullanım süresi 0'dan büyük olmalıdır.");
      return;
    }

    if (Number(usedMinute) > selectedTool.remainingLifeMinute) {
      toast.error("Kullanım süresi kalan ömürden fazla olamaz.");
      return;
    }

    try {
      setIsSaving(true);

      await api.post("/ToolUsageLog", {
        toolId: Number(toolId),
        usedMinute: Number(usedMinute),
      });

      setToolId("");
      setUsedMinute("");

      toast.success("Kullanım kaydı başarıyla eklendi.");
      await fetchData();
    } catch (error: any) {
      console.error(error);

      if (error.response?.data) {
        toast.error(error.response.data);
      } else {
        toast.error("Kullanım kaydı eklenemedi.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const toolName = log.tool?.toolName?.toLowerCase() || "";
      const toolType = log.tool?.toolType?.toLowerCase() || "";
      const searchValue = searchText.toLowerCase();

      const matchesSearch =
        toolName.includes(searchValue) ||
        toolType.includes(searchValue) ||
        String(log.toolId).includes(searchValue);

      const matchesTool =
        selectedToolId === "all" || log.toolId === Number(selectedToolId);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "running" && log.tool?.isRunning) ||
        (statusFilter === "stopped" && !log.tool?.isRunning) ||
        (statusFilter === "criticalLife" &&
          log.tool &&
          log.tool.remainingLifeMinute < 200) ||
        (statusFilter === "criticalStock" &&
          log.tool &&
          log.tool.stock <= log.tool.criticalStock);

      return matchesSearch && matchesTool && matchesStatus;
    });
  }, [logs, searchText, selectedToolId, statusFilter]);

  const totalUsedMinute = logs.reduce(
    (total, log) => total + log.usedMinute,
    0
  );

  const runningToolCount = tools.filter((tool) => tool.isRunning).length;

  const criticalStockCount = tools.filter(
    (tool) => tool.stock <= tool.criticalStock
  ).length;

  const lowLifeCount = tools.filter(
    (tool) => tool.remainingLifeMinute < 200
  ).length;

  const todayLogCount = logs.filter((log) => {
    const logDate = new Date(log.usageDate).toLocaleDateString("tr-TR");
    const todayDate = new Date().toLocaleDateString("tr-TR");

    return logDate === todayDate;
  }).length;

  const selectedToolForForm = tools.find((tool) => tool.id === Number(toolId));

  const getLifePercent = (tool?: Tool) => {
    if (!tool || tool.totalLifeMinute <= 0) {
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

  const getLifeBarColor = (percent: number) => {
    if (percent < 20) {
      return "bg-red-500";
    }

    if (percent < 50) {
      return "bg-yellow-500";
    }

    return "bg-green-500";
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

  if (isLoading) {
    return (
      <>
        <Toaster position="top-right" />

        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="bg-white px-10 py-8 rounded-3xl shadow text-center">
            <h1 className="text-2xl font-black text-slate-900 mb-2">
              Kullanım geçmişi yükleniyor...
            </h1>

            <p className="text-slate-600 font-medium">
              Kayıtlar hazırlanıyor.
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
                  Kullanım Geçmişi
                </h1>

                <p className="text-slate-300 text-lg max-w-3xl leading-8">
                  Takımların kullanım kayıtlarını, kalan ömür durumlarını,
                  çalışan/duran durumlarını ve stok uyarılarını buradan takip
                  edebilirsiniz.
                </p>
              </div>

              <div className="bg-white/10 border border-white/10 rounded-3xl p-6 min-w-[300px]">
                <p className="text-slate-300 font-semibold">
                  Oturum Kullanıcısı
                </p>

                <h2 className="text-2xl font-black mt-2">
                  {user?.fullName || user?.username || "Kullanıcı"}
                </h2>

                <p className="text-blue-300 font-bold mt-1">{user?.role}</p>

                <div className="mt-5 flex items-center gap-3 bg-green-500/10 border border-green-500/20 text-green-300 px-5 py-3 rounded-2xl font-black">
                  <span className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-500/50" />
                  Canlı takip aktif
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8 border-t border-white/10 pt-6">
              <p className="text-slate-300 font-medium">
                Son güncelleme:{" "}
                <span className="font-black text-white">
                  {lastUpdate || "Henüz yok"}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-5">
              <p className="text-slate-600 font-bold">Toplam Kayıt</p>

              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
                <History size={24} />
              </div>
            </div>

            <h2 className="text-5xl font-black text-slate-900">
              {logs.length}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Sistemdeki toplam kullanım kaydı.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-blue-200">
            <div className="flex items-center justify-between mb-5">
              <p className="text-blue-700 font-bold">Toplam Kullanım</p>

              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700">
                <Clock3 size={24} />
              </div>
            </div>

            <h2 className="text-5xl font-black text-blue-700">
              {totalUsedMinute}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Dakika cinsinden toplam kullanım.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-green-200">
            <div className="flex items-center justify-between mb-5">
              <p className="text-green-700 font-bold">Bugünkü Kayıt</p>

              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-700">
                <CalendarDays size={24} />
              </div>
            </div>

            <h2 className="text-5xl font-black text-green-700">
              {todayLogCount}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Bugün eklenen kullanım kayıtları.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-cyan-200">
            <div className="flex items-center justify-between mb-5">
              <p className="text-cyan-700 font-bold">Çalışan Takım</p>

              <div className="w-12 h-12 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-700">
                <Activity size={24} />
              </div>
            </div>

            <h2 className="text-5xl font-black text-cyan-700">
              {runningToolCount}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Ömrü anlık azalan takım sayısı.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-red-200">
            <div className="flex items-center justify-between mb-5">
              <p className="text-red-600 font-bold">Uyarılar</p>

              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                <AlertTriangle size={24} />
              </div>
            </div>

            <h2 className="text-5xl font-black text-red-600">
              {criticalStockCount + lowLifeCount}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Kritik stok ve kritik ömür toplamı.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          <div className="xl:col-span-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-black text-slate-900">
                Yeni Kullanım Kaydı
              </h2>

              <p className="text-slate-600 mt-1 font-medium">
                Bir takım için manuel kullanım süresi gir.
              </p>
            </div>

            <form onSubmit={handleCreateUsageLog} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">
                  Takım Seç
                </label>

                <select
                  value={toolId}
                  onChange={(event) => setToolId(event.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-800"
                >
                  <option value="">Takım seçiniz</option>

                  {tools.map((tool) => (
                    <option key={tool.id} value={tool.id}>
                      {tool.toolName} - {tool.toolType}
                    </option>
                  ))}
                </select>
              </div>

              {selectedToolForForm && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-black text-slate-900">
                      {selectedToolForForm.toolName}
                    </p>

                    {selectedToolForForm.isRunning ? (
                      <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-xl text-xs font-black">
                        Çalışıyor
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-black">
                        Duruyor
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white border border-blue-100 rounded-xl p-3">
                      <p className="text-xs text-slate-500 font-black uppercase">
                        Kalan Ömür
                      </p>

                      <p className="text-xl font-black text-blue-700">
                        {selectedToolForForm.remainingLifeMinute} dk
                      </p>
                    </div>

                    <div className="bg-white border border-blue-100 rounded-xl p-3">
                      <p className="text-xs text-slate-500 font-black uppercase">
                        Stok
                      </p>

                      <p className="text-xl font-black text-slate-900">
                        {selectedToolForForm.stock}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">
                  Kullanım Süresi
                </label>

                <input
                  type="number"
                  min="1"
                  value={usedMinute}
                  onChange={(event) => setUsedMinute(event.target.value)}
                  placeholder="Örn: 60"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white rounded-2xl py-4 font-black transition flex items-center justify-center gap-2"
              >
                <FileClock size={20} />

                {isSaving ? "Kaydediliyor..." : "Kullanım Kaydı Ekle"}
              </button>
            </form>
          </div>

          <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-black text-slate-900">
                Filtreleme
              </h2>

              <p className="text-slate-600 mt-1 font-medium">
                Kayıtları takım, durum veya arama metnine göre filtrele.
              </p>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">
                  Arama
                </label>

                <div className="relative">
                  <Search
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Takım adı, tip veya ID"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">
                  Takım
                </label>

                <select
                  value={selectedToolId}
                  onChange={(event) => setSelectedToolId(event.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-800"
                >
                  <option value="all">Tüm takımlar</option>

                  {tools.map((tool) => (
                    <option key={tool.id} value={tool.id}>
                      {tool.toolName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">
                  Durum
                </label>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-800"
                >
                  <option value="all">Tüm durumlar</option>
                  <option value="running">Çalışıyor</option>
                  <option value="stopped">Duruyor</option>
                  <option value="criticalLife">Kritik ömür</option>
                  <option value="criticalStock">Kritik stok</option>
                </select>
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-3 text-slate-700 font-bold">
                <Filter size={20} />
                Gösterilen kayıt: {filteredLogs.length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Kullanım Kayıtları
              </h2>

              <p className="text-slate-600 mt-1 font-medium">
                Her kayıtta takımın güncel ömür, stok ve çalışma durumu
                görüntülenir.
              </p>
            </div>

            <div className="bg-blue-50 text-blue-700 px-5 py-3 rounded-2xl font-black">
              {filteredLogs.length} kayıt
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px]">
              <thead className="bg-slate-950 text-white">
                <tr>
                  <th className="px-5 py-4 text-left text-xs uppercase tracking-wider">
                    ID
                  </th>

                  <th className="px-5 py-4 text-left text-xs uppercase tracking-wider">
                    Takım
                  </th>

                  <th className="px-5 py-4 text-left text-xs uppercase tracking-wider">
                    Tip
                  </th>

                  <th className="px-5 py-4 text-left text-xs uppercase tracking-wider">
                    Kullanım Süresi
                  </th>

                  <th className="px-5 py-4 text-left text-xs uppercase tracking-wider">
                    Kalan Ömür
                  </th>

                  <th className="px-5 py-4 text-left text-xs uppercase tracking-wider">
                    Stok
                  </th>

                  <th className="px-5 py-4 text-left text-xs uppercase tracking-wider">
                    Durum
                  </th>

                  <th className="px-5 py-4 text-left text-xs uppercase tracking-wider">
                    Tarih
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredLogs.map((log) => {
                  const lifePercent = getLifePercent(log.tool);
                  const lifeBarColor = getLifeBarColor(lifePercent);
                  const isCriticalStock =
                    log.tool && log.tool.stock <= log.tool.criticalStock;

                  return (
                    <tr
                      key={log.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-5 py-5 font-black text-slate-500">
                        #{log.id}
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                            <Wrench size={22} />
                          </div>

                          <div>
                            <p className="font-black text-slate-900">
                              {log.tool?.toolName || `Takım #${log.toolId}`}
                            </p>

                            <p className="text-slate-500 text-sm font-semibold">
                              Takım ID: {log.toolId}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <span className="bg-slate-100 text-slate-700 px-3 py-2 rounded-xl font-black text-sm">
                          {log.tool?.toolType || "-"}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-black">
                          {log.usedMinute} dk
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Gauge size={18} className="text-slate-500" />

                            <span className="font-black text-slate-900">
                              {log.tool?.remainingLifeMinute ?? 0} dk
                            </span>

                            <span className="text-slate-500 font-bold">
                              %{lifePercent}
                            </span>
                          </div>

                          <div className="w-36 bg-slate-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full ${lifeBarColor}`}
                              style={{ width: `${lifePercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        {log.tool ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Package
                                size={18}
                                className={
                                  isCriticalStock
                                    ? "text-red-600"
                                    : "text-green-600"
                                }
                              />

                              <span
                                className={`font-black ${
                                  isCriticalStock
                                    ? "text-red-600"
                                    : "text-slate-900"
                                }`}
                              >
                                {log.tool.stock}
                              </span>
                            </div>

                            <span className="text-xs text-slate-500 font-bold">
                              Kritik seviye: {log.tool.criticalStock}
                            </span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="px-5 py-5">
                        {log.tool?.isRunning ? (
                          <div className="space-y-2">
                            <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-xl font-black text-sm">
                              <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                              Çalışıyor
                            </span>

                            {log.tool.startedAt && (
                              <p className="text-xs text-slate-500 font-bold">
                                Başlangıç:{" "}
                                {new Date(
                                  log.tool.startedAt
                                ).toLocaleTimeString("tr-TR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-xl font-black text-sm">
                            <span className="w-2.5 h-2.5 bg-slate-500 rounded-full" />
                            Duruyor
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex items-center gap-2 text-slate-700 font-semibold">
                          <CalendarDays size={18} className="text-slate-500" />
                          {formatDateTime(log.usageDate)}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredLogs.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-slate-600 font-black"
                    >
                      Filtreye uygun kullanım kaydı bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 size={24} className="text-green-600" />

              <h3 className="text-xl font-black text-slate-900">
                Normal Durum
              </h3>
            </div>

            <p className="text-slate-600 font-medium leading-7">
              Stok seviyesi yeterli ve kalan ömrü yüksek olan takımlar üretim
              için uygun durumdadır.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Timer size={24} className="text-yellow-600" />

              <h3 className="text-xl font-black text-slate-900">
                Kritik Ömür
              </h3>
            </div>

            <p className="text-slate-600 font-medium leading-7">
              Kalan ömrü 200 dakikanın altına düşen takımlar için bakım veya
              değişim planlaması yapılmalıdır.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className="text-red-600" />

              <h3 className="text-xl font-black text-slate-900">
                Kritik Stok
              </h3>
            </div>

            <p className="text-slate-600 font-medium leading-7">
              Mevcut stok kritik stok seviyesine eşit veya altında ise satın
              alma süreci başlatılmalıdır.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}