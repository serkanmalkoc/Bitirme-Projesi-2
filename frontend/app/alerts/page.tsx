"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/app/services/api";
import connection from "@/app/services/signalr";
import toast, { Toaster } from "react-hot-toast";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gauge,
  Package,
  RefreshCcw,
  ShieldAlert,
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
  incomePerMinute: number;
  purchasePrice: number;
};

type User = {
  id: number;
  fullName: string;
  username: string;
  role: string;
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

export default function AlertsPage() {
  const router = useRouter();

  const [tools, setTools] = useState<Tool[]>([]);
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

  const fetchTools = async () => {
    try {
      const authUser = checkAuth();

      if (!authUser) {
        return;
      }

      const response = await api.get("/Tool");

      setTools(response.data);
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

      toast.error("Uyarı verileri yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  useEffect(() => {
    const startSignalR = async () => {
      try {
        if (connection.state === "Disconnected") {
          await connection.start();
          console.log("Alerts SignalR bağlantısı kuruldu.");
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

    connection.on("ToolUpdated", () => {
      fetchTools();
    });

    connection.on("ToolCreated", () => {
      fetchTools();
    });

    connection.on("ToolDeleted", () => {
      fetchTools();
    });

    return () => {
      connection.off("ToolLifeTick");
      connection.off("ToolRunningChanged");
      connection.off("ToolUpdated");
      connection.off("ToolCreated");
      connection.off("ToolDeleted");
    };
  }, []);

  const criticalStockTools = useMemo(() => {
    return tools.filter((tool) => tool.stock <= tool.criticalStock);
  }, [tools]);

  const lowLifeTools = useMemo(() => {
    return tools.filter((tool) => tool.remainingLifeMinute < 200);
  }, [tools]);

  const runningLowLifeTools = useMemo(() => {
    return tools.filter(
      (tool) => tool.isRunning && tool.remainingLifeMinute < 200
    );
  }, [tools]);

  const runningTools = useMemo(() => {
    return tools.filter((tool) => tool.isRunning);
  }, [tools]);

  const totalAlertCount =
    criticalStockTools.length + lowLifeTools.length + runningLowLifeTools.length;

  const systemStatus =
    totalAlertCount === 0 ? "Normal" : totalAlertCount <= 3 ? "Dikkat" : "Kritik";

  const systemStatusClass =
    systemStatus === "Normal"
      ? "bg-green-100 text-green-700 border-green-200"
      : systemStatus === "Dikkat"
      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : "bg-red-100 text-red-600 border-red-200";

  const getLifePercent = (tool: Tool) => {
    if (tool.totalLifeMinute <= 0) {
      return 0;
    }

    return Math.min(
      Math.max(Math.round((tool.remainingLifeMinute / tool.totalLifeMinute) * 100), 0),
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

  if (isLoading) {
    return (
      <>
        <Toaster position="top-right" />

        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="bg-white px-10 py-8 rounded-3xl shadow text-center">
            <h1 className="text-2xl font-black text-slate-900 mb-2">
              Uyarılar yükleniyor...
            </h1>

            <p className="text-slate-600 font-medium">
              Sistem kontrolleri hazırlanıyor.
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
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 rounded-3xl p-10 shadow-lg text-white overflow-hidden relative">
            <div className="absolute -right-24 -top-24 w-80 h-80 bg-red-500/20 rounded-full blur-3xl" />
            <div className="absolute right-40 bottom-0 w-52 h-52 bg-yellow-500/10 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
              <div>
                <p className="text-red-300 font-semibold mb-3">
                  CNC Takım Yönetim Sistemi
                </p>

                <h1 className="text-5xl font-black tracking-tight mb-4">
                  Uyarı Merkezi
                </h1>

                <p className="text-slate-300 text-lg max-w-3xl leading-8">
                  Kritik stok, kritik takım ömrü ve çalışan kritik takımlar bu
                  ekrandan anlık olarak takip edilir.
                </p>

                <p className="text-slate-400 font-semibold mt-5">
                  Kullanıcı:{" "}
                  <span className="text-white font-black">
                    {user?.fullName || user?.username || "Kullanıcı"}
                  </span>
                </p>
              </div>

              <div className="bg-white/10 border border-white/10 rounded-3xl p-6 min-w-[330px]">
                <p className="text-slate-300 font-semibold">
                  Sistem Uyarı Durumu
                </p>

                <div
                  className={`mt-4 border rounded-2xl px-5 py-3 text-2xl font-black w-fit ${systemStatusClass}`}
                >
                  {systemStatus}
                </div>

                <p className="text-slate-400 font-semibold mt-5">
                  Son güncelleme:{" "}
                  <span className="text-white font-black">
                    {lastUpdate || "Henüz yok"}
                  </span>
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t border-white/10 pt-6">
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-300 px-5 py-3 rounded-2xl font-black">
                <span className="w-3 h-3 bg-red-400 rounded-full shadow-lg shadow-red-500/50" />
                Canlı uyarı takibi aktif
              </div>

              <button
                onClick={fetchTools}
                className="bg-white/10 hover:bg-white/15 border border-white/10 px-5 py-3 rounded-2xl font-black flex items-center gap-2 transition"
              >
                <RefreshCcw size={19} />
                Yenile
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-7 shadow-sm border border-red-200">
            <div className="flex items-center justify-between mb-5">
              <p className="text-red-600 font-bold">Toplam Uyarı</p>

              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                <ShieldAlert size={24} />
              </div>
            </div>

            <h2 className="text-5xl font-black text-red-600">
              {totalAlertCount}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Sistemdeki toplam uyarı sayısı.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-yellow-200">
            <div className="flex items-center justify-between mb-5">
              <p className="text-yellow-700 font-bold">Kritik Stok</p>

              <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-700">
                <Package size={24} />
              </div>
            </div>

            <h2 className="text-5xl font-black text-yellow-700">
              {criticalStockTools.length}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Stok seviyesi kritik olan takımlar.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-orange-200">
            <div className="flex items-center justify-between mb-5">
              <p className="text-orange-700 font-bold">Kritik Ömür</p>

              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-700">
                <Timer size={24} />
              </div>
            </div>

            <h2 className="text-5xl font-black text-orange-700">
              {lowLifeTools.length}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Kalan ömrü 200 dakikanın altında olanlar.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-blue-200">
            <div className="flex items-center justify-between mb-5">
              <p className="text-blue-700 font-bold">Çalışan Kritik</p>

              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700">
                <Activity size={24} />
              </div>
            </div>

            <h2 className="text-5xl font-black text-blue-700">
              {runningLowLifeTools.length}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Çalışan ve ömrü kritik olan takımlar.
            </p>
          </div>
        </div>

        {totalAlertCount === 0 && (
          <div className="bg-green-50 border border-green-100 rounded-3xl p-10 text-center mb-8">
            <CheckCircle2 size={54} className="text-green-700 mx-auto mb-4" />

            <h2 className="text-3xl font-black text-slate-900 mb-2">
              Sistemde aktif uyarı yok
            </h2>

            <p className="text-slate-600 font-medium">
              Tüm takım stokları ve takım ömürleri normal seviyede.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center gap-3">
              <Package size={26} className="text-yellow-700" />

              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Kritik Stok Uyarıları
                </h2>

                <p className="text-slate-600 font-medium mt-1">
                  Stok miktarı kritik seviyeye düşmüş takımlar.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {criticalStockTools.map((tool) => {
                const missingStock = tool.criticalStock - tool.stock + 1;

                return (
                  <div
                    key={tool.id}
                    className="bg-yellow-50 border border-yellow-100 rounded-3xl p-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-yellow-100 text-yellow-700 flex items-center justify-center shrink-0">
                          <Wrench size={26} />
                        </div>

                        <div>
                          <h3 className="text-2xl font-black text-slate-900">
                            {tool.toolName}
                          </h3>

                          <p className="text-slate-600 font-semibold mt-1">
                            {tool.toolType} • ID #{tool.id}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-red-600 text-4xl font-black">
                          {tool.stock}
                        </p>

                        <p className="text-slate-600 text-sm font-bold">
                          mevcut stok
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                      <div className="bg-white border border-yellow-100 rounded-2xl p-4">
                        <p className="text-xs text-slate-500 font-black uppercase">
                          Kritik Seviye
                        </p>

                        <p className="text-xl font-black text-slate-900 mt-1">
                          {tool.criticalStock}
                        </p>
                      </div>

                      <div className="bg-white border border-yellow-100 rounded-2xl p-4">
                        <p className="text-xs text-slate-500 font-black uppercase">
                          Önerilen Alım
                        </p>

                        <p className="text-xl font-black text-blue-700 mt-1">
                          {missingStock} adet
                        </p>
                      </div>

                      <div className="bg-white border border-yellow-100 rounded-2xl p-4">
                        <p className="text-xs text-slate-500 font-black uppercase">
                          Alış Fiyatı
                        </p>

                        <p className="text-xl font-black text-emerald-700 mt-1">
                          ₺{Number(tool.purchasePrice || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {criticalStockTools.length === 0 && (
                <div className="bg-green-50 border border-green-100 rounded-3xl p-8 text-center">
                  <CheckCircle2
                    size={40}
                    className="text-green-700 mx-auto mb-3"
                  />

                  <p className="text-green-700 font-black">
                    Kritik stok uyarısı bulunmuyor.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center gap-3">
              <Timer size={26} className="text-orange-700" />

              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Kritik Ömür Uyarıları
                </h2>

                <p className="text-slate-600 font-medium mt-1">
                  Kalan ömrü 200 dakikanın altında olan takımlar.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {lowLifeTools.map((tool) => {
                const percent = getLifePercent(tool);

                return (
                  <div
                    key={tool.id}
                    className="bg-orange-50 border border-orange-100 rounded-3xl p-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-5">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                          <Gauge size={26} />
                        </div>

                        <div>
                          <h3 className="text-2xl font-black text-slate-900">
                            {tool.toolName}
                          </h3>

                          <p className="text-slate-600 font-semibold mt-1">
                            {tool.toolType} • ID #{tool.id}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-orange-700 text-4xl font-black">
                          {tool.remainingLifeMinute}
                        </p>

                        <p className="text-slate-600 text-sm font-bold">
                          dakika kaldı
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-slate-700 font-black">
                          Ömür Oranı
                        </span>

                        <span className="text-orange-700 font-black">
                          %{percent}
                        </span>
                      </div>

                      <div className="w-full bg-orange-200 rounded-full h-4">
                        <div
                          className={`h-4 rounded-full transition-all ${getLifeBarColor(
                            percent
                          )}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                      <div className="bg-white border border-orange-100 rounded-2xl p-4">
                        <p className="text-xs text-slate-500 font-black uppercase">
                          Toplam Ömür
                        </p>

                        <p className="text-xl font-black text-slate-900 mt-1">
                          {tool.totalLifeMinute} dk
                        </p>
                      </div>

                      <div className="bg-white border border-orange-100 rounded-2xl p-4">
                        <p className="text-xs text-slate-500 font-black uppercase">
                          Kullanılan
                        </p>

                        <p className="text-xl font-black text-red-600 mt-1">
                          {tool.totalLifeMinute - tool.remainingLifeMinute} dk
                        </p>
                      </div>

                      <div className="bg-white border border-orange-100 rounded-2xl p-4">
                        <p className="text-xs text-slate-500 font-black uppercase">
                          Durum
                        </p>

                        <p className="text-xl font-black text-orange-700 mt-1">
                          Kritik
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {lowLifeTools.length === 0 && (
                <div className="bg-green-50 border border-green-100 rounded-3xl p-8 text-center">
                  <CheckCircle2
                    size={40}
                    className="text-green-700 mx-auto mb-3"
                  />

                  <p className="text-green-700 font-black">
                    Kritik ömür uyarısı bulunmuyor.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center gap-3">
            <Activity size={26} className="text-blue-700" />

            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Çalışan Takım Takibi
              </h2>

              <p className="text-slate-600 font-medium mt-1">
                Şu anda çalışan takımlar ve anlık ömür durumları.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {runningTools.map((tool) => {
              const percent = getLifePercent(tool);

              return (
                <div
                  key={tool.id}
                  className={`border rounded-3xl p-6 ${
                    tool.remainingLifeMinute < 200
                      ? "bg-red-50 border-red-100"
                      : "bg-blue-50 border-blue-100"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-5">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full shadow-lg shadow-green-500/50" />

                        <p className="text-green-700 font-black">
                          Çalışıyor
                        </p>
                      </div>

                      <h3 className="text-2xl font-black text-slate-900">
                        {tool.toolName}
                      </h3>

                      <p className="text-slate-600 font-semibold mt-1">
                        {tool.toolType} • ID #{tool.id}
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-4xl font-black ${
                          tool.remainingLifeMinute < 200
                            ? "text-red-600"
                            : "text-blue-700"
                        }`}
                      >
                        {tool.remainingLifeMinute}
                      </p>

                      <p className="text-slate-600 text-sm font-bold">
                        dakika kaldı
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-700 font-black">
                        Ömür Oranı
                      </span>

                      <span className="text-slate-900 font-black">
                        %{percent}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full transition-all ${getLifeBarColor(
                          percent
                        )}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4">
                      <p className="text-xs text-slate-500 font-black uppercase">
                        Toplam Ömür
                      </p>

                      <p className="text-xl font-black text-slate-900 mt-1">
                        {tool.totalLifeMinute} dk
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4">
                      <p className="text-xs text-slate-500 font-black uppercase">
                        Stok
                      </p>

                      <p className="text-xl font-black text-slate-900 mt-1">
                        {tool.stock}
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4">
                      <p className="text-xs text-slate-500 font-black uppercase">
                        Başlangıç
                      </p>

                      <p className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                        <Clock3 size={18} />
                        {tool.startedAt
                          ? new Date(tool.startedAt).toLocaleTimeString(
                              "tr-TR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : "-"}
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4">
                      <p className="text-xs text-slate-500 font-black uppercase">
                        Uyarı
                      </p>

                      <p
                        className={`text-xl font-black mt-1 ${
                          tool.remainingLifeMinute < 200
                            ? "text-red-600"
                            : "text-green-700"
                        }`}
                      >
                        {tool.remainingLifeMinute < 200 ? "Kritik" : "Normal"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {runningTools.length === 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-10 text-center">
                <Activity size={44} className="text-slate-500 mx-auto mb-4" />

                <h3 className="text-2xl font-black text-slate-900 mb-2">
                  Şu anda çalışan takım yok
                </h3>

                <p className="text-slate-600 font-medium">
                  Takımlar sayfasından bir takım başlatıldığında burada
                  görünecek.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}