"use client";

import { useEffect, useState } from "react";
import api from "@/app/services/api";
import connection from "@/app/services/signalr";
import toast, { Toaster } from "react-hot-toast";

import {
  History,
  Clock3,
  CalendarDays,
  Search,
  RotateCcw,
  Wrench,
  Timer,
  Activity,
  AlertCircle,
} from "lucide-react";

type Tool = {
  id: number;
  toolName: string;
  toolType: string;
  totalLifeMinute: number;
  remainingLifeMinute: number;
  stock: number;
  criticalStock: number;
};

type UsageLog = {
  id: number;
  toolId: number;
  usedMinute: number;
  usageDate: string;
  tool?: Tool;
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

export default function UsageLogsPage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [searchText, setSearchText] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [minuteFilter, setMinuteFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const response = await api.get("/ToolUsageLog");
      setLogs(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Kullanım geçmişi yüklenemedi!");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
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

    connection.on("ToolUsageAdded", async (data: ToolUsageAddedEvent) => {
      toast.success(
        `${data.toolName} için yeni kullanım kaydı eklendi.`
      );

      await fetchLogs();
    });

    return () => {
      connection.off("ToolUsageAdded");
    };
  }, []);

  const totalUsedMinute = logs.reduce(
    (total, log) => total + log.usedMinute,
    0
  );

  const todayDateString = new Date().toLocaleDateString("tr-TR");

  const todayLogs = logs.filter((log) => {
    const logDate = new Date(log.usageDate).toLocaleDateString("tr-TR");
    return logDate === todayDateString;
  });

  const toolUsageMap = logs.reduce<Record<string, number>>((acc, log) => {
    const toolName = log.tool?.toolName || `Takım #${log.toolId}`;
    acc[toolName] = (acc[toolName] || 0) + log.usedMinute;
    return acc;
  }, {});

  const mostUsedToolEntry = Object.entries(toolUsageMap).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const mostUsedToolName = mostUsedToolEntry ? mostUsedToolEntry[0] : "-";
  const mostUsedToolMinute = mostUsedToolEntry ? mostUsedToolEntry[1] : 0;

  const filteredLogs = logs.filter((log) => {
    const toolName = log.tool?.toolName || "";
    const toolType = log.tool?.toolType || "";
    const logDate = new Date(log.usageDate);

    const matchesSearch =
      toolName.toLowerCase().includes(searchText.toLowerCase()) ||
      toolType.toLowerCase().includes(searchText.toLowerCase()) ||
      log.toolId.toString().includes(searchText);

    const matchesDate =
      dateFilter === "" ||
      logDate.toISOString().slice(0, 10) === dateFilter;

    const matchesMinute =
      minuteFilter === "" ||
      (minuteFilter === "0-100" && log.usedMinute <= 100) ||
      (minuteFilter === "100-300" &&
        log.usedMinute > 100 &&
        log.usedMinute <= 300) ||
      (minuteFilter === "300+" && log.usedMinute > 300);

    return matchesSearch && matchesDate && matchesMinute;
  });

  const clearFilters = () => {
    setSearchText("");
    setDateFilter("");
    setMinuteFilter("");
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
              Takım kullanım kayıtları hazırlanıyor.
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
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 rounded-3xl p-10 shadow-lg text-white relative overflow-hidden">
            <div className="absolute -right-24 -top-24 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
            <div className="absolute right-40 bottom-0 w-52 h-52 bg-cyan-500/10 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
              <div>
                <p className="text-blue-300 font-semibold mb-3">
                  CNC Takım Kullanım Takibi
                </p>

                <h1 className="text-5xl font-black tracking-tight mb-4">
                  Kullanım Geçmişi
                </h1>

                <p className="text-slate-300 text-lg max-w-3xl leading-8">
                  Takımların hangi tarihte, kaç dakika kullanıldığını ve geçmiş
                  kullanım hareketlerini detaylı olarak inceleyin.
                </p>
              </div>

              <div className="bg-white/10 border border-white/10 rounded-3xl p-6 min-w-[300px]">
                <p className="text-slate-300 font-semibold">
                  Canlı Kayıt Takibi
                </p>

                <div className="flex items-center gap-3 mt-4 bg-green-500/10 border border-green-500/20 text-green-300 px-5 py-3 rounded-2xl font-black w-fit">
                  <span className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-500/50" />
                  Aktif
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8 border-t border-white/10 pt-6">
              <p className="text-slate-300 font-medium">
                Yeni kullanım kaydı eklendiğinde bu sayfa SignalR ile otomatik
                olarak güncellenir.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-200 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-5">
              <p className="text-slate-600 font-bold">
                Toplam Kayıt
              </p>

              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
                <History size={24} />
              </div>
            </div>

            <h2 className="text-5xl font-black text-slate-900">
              {logs.length}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Sisteme girilen toplam kullanım kaydı.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-blue-200 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-5">
              <p className="text-blue-700 font-bold">
                Toplam Kullanım
              </p>

              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700">
                <Clock3 size={24} />
              </div>
            </div>

            <h2 className="text-5xl font-black text-blue-700">
              {totalUsedMinute}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Dakika cinsinden toplam kullanım süresi.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-green-200 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-5">
              <p className="text-green-700 font-bold">
                Bugünkü Kayıt
              </p>

              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-700">
                <CalendarDays size={24} />
              </div>
            </div>

            <h2 className="text-5xl font-black text-green-700">
              {todayLogs.length}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Bugün girilen kullanım hareketi.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-yellow-200 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-5">
              <p className="text-yellow-700 font-bold">
                En Çok Kullanılan
              </p>

              <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-700">
                <Activity size={24} />
              </div>
            </div>

            <h2 className="text-2xl font-black text-slate-900 leading-snug">
              {mostUsedToolName}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Toplam {mostUsedToolMinute} dakika kullanıldı.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Arama ve Filtreleme
              </h2>

              <p className="text-slate-600 mt-1 font-medium">
                Kullanım kayıtlarını takım adına, tarihe veya süreye göre filtreleyin.
              </p>
            </div>

            <div className="bg-slate-100 text-slate-700 px-5 py-3 rounded-2xl font-black">
              {filteredLogs.length} kayıt listeleniyor
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            <div className="relative">
              <Search
                size={22}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                placeholder="Takım adı, tip veya ID ara..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 p-4 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
              />
            </div>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full border border-slate-300 bg-white text-slate-900 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
            />

            <select
              value={minuteFilter}
              onChange={(e) => setMinuteFilter(e.target.value)}
              className="w-full border border-slate-300 bg-white text-slate-900 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
            >
              <option value="">Tüm Süreler</option>
              <option value="0-100">0 - 100 dk</option>
              <option value="100-300">101 - 300 dk</option>
              <option value="300+">300 dk üzeri</option>
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="bg-slate-900 hover:bg-slate-700 text-white p-4 rounded-2xl font-bold transition flex items-center justify-center gap-3"
            >
              <RotateCcw size={21} />
              Filtreleri Temizle
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Kullanım Kayıtları
              </h2>

              <p className="text-slate-600 mt-1 font-medium">
                Takım kullanım hareketlerinin detaylı listesi.
              </p>
            </div>

            <div className="bg-blue-50 text-blue-700 px-5 py-3 rounded-2xl font-black flex items-center gap-3">
              <Timer size={21} />
              {filteredLogs.length} hareket
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead className="bg-slate-950 text-white">
                <tr>
                  <th className="px-4 py-4 text-left text-xs uppercase tracking-wide">
                    ID
                  </th>
                  <th className="px-4 py-4 text-left text-xs uppercase tracking-wide">
                    Takım
                  </th>
                  <th className="px-4 py-4 text-left text-xs uppercase tracking-wide">
                    Tip
                  </th>
                  <th className="px-4 py-4 text-left text-xs uppercase tracking-wide">
                    Kullanım Süresi
                  </th>
                  <th className="px-4 py-4 text-left text-xs uppercase tracking-wide">
                    Tarih
                  </th>
                  <th className="px-4 py-4 text-left text-xs uppercase tracking-wide">
                    Durum
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredLogs.map((log) => {
                  const toolName =
                    log.tool?.toolName || `Takım #${log.toolId}`;

                  const toolType = log.tool?.toolType || "-";

                  const logDate = new Date(log.usageDate);

                  const formattedDate =
                    logDate.toLocaleDateString("tr-TR");

                  const formattedTime =
                    logDate.toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                  const isHighUsage = log.usedMinute > 300;

                  return (
                    <tr
                      key={log.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-4 py-4 font-black text-slate-500 text-sm">
                        #{log.id}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                            <Wrench size={21} />
                          </div>

                          <div>
                            <p className="font-black text-slate-900 text-base leading-snug">
                              {toolName}
                            </p>

                            <p className="text-slate-500 text-xs font-semibold mt-1">
                              Takım ID: {log.toolId}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-2 rounded-xl font-black text-xs inline-block">
                          {toolType}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div
                          className={`w-fit px-4 py-3 rounded-2xl border ${
                            isHighUsage
                              ? "bg-red-50 border-red-100 text-red-700"
                              : "bg-green-50 border-green-100 text-green-700"
                          }`}
                        >
                          <p className="text-2xl font-black">
                            {log.usedMinute}
                          </p>

                          <p className="text-xs font-bold">
                            dakika
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-black text-slate-900">
                          {formattedDate}
                        </p>

                        <p className="text-slate-500 text-xs font-semibold mt-1">
                          Saat: {formattedTime}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        {isHighUsage ? (
                          <span className="bg-red-100 text-red-700 px-3 py-2 rounded-xl font-black text-xs w-fit flex items-center gap-2">
                            <AlertCircle size={14} />
                            Yüksek Kullanım
                          </span>
                        ) : (
                          <span className="bg-green-100 text-green-700 px-3 py-2 rounded-xl font-black text-xs w-fit flex items-center gap-2">
                            <Activity size={14} />
                            Normal Kullanım
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-slate-100 text-slate-500 rounded-3xl flex items-center justify-center mx-auto mb-5">
                <Search size={36} />
              </div>

              <h3 className="text-2xl font-black text-slate-900 mb-2">
                Kayıt bulunamadı
              </h3>

              <p className="text-slate-600 font-medium max-w-xl mx-auto">
                Arama veya filtreleme kriterlerine uygun kullanım kaydı bulunamadı.
                Filtreleri temizleyerek tekrar deneyebilirsiniz.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 bg-slate-900 hover:bg-slate-700 text-white px-6 py-4 rounded-2xl font-black transition"
              >
                Filtreleri Temizle
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}