"use client";

import { useEffect, useState } from "react";
import api from "@/app/services/api";
import connection from "@/app/services/signalr";
import toast, { Toaster } from "react-hot-toast";

import {
  FileText,
  Printer,
  CalendarDays,
  UserCircle,
  Wrench,
  AlertTriangle,
  Timer,
  Package,
  Activity,
  ShieldCheck,
  BarChart3,
  Clock3,
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

export default function ReportsPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReportData = async () => {
    try {
      const [dashboardResponse, toolsResponse, logsResponse] =
        await Promise.all([
          api.get("/Dashboard"),
          api.get("/Tool"),
          api.get("/ToolUsageLog"),
        ]);

      setDashboard(dashboardResponse.data);
      setTools(toolsResponse.data);
      setLogs(logsResponse.data);
    } catch (error) {
      console.error(error);
      toast.error("Rapor verileri yüklenemedi!");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

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

    connection.on("ToolUsageAdded", async (data: ToolUsageAddedEvent) => {
      toast.success(
        `${data.toolName} için kullanım eklendi. Rapor güncellendi.`
      );

      await fetchReportData();
    });

    return () => {
      connection.off("ToolUsageAdded");
    };
  }, []);

  const reportDate = new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    weekday: "long",
  });

  const reportTime = new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const criticalStockTools = tools.filter(
    (tool) => tool.stock <= tool.criticalStock
  );

  const lowLifeTools = tools.filter(
    (tool) => tool.remainingLifeMinute < 200
  );

  const totalRemainingLife = tools.reduce(
    (total, tool) => total + tool.remainingLifeMinute,
    0
  );

  const totalLife = tools.reduce(
    (total, tool) => total + tool.totalLifeMinute,
    0
  );

  const totalUsedMinute =
    totalLife > totalRemainingLife ? totalLife - totalRemainingLife : 0;

  const averageLifePercent =
    totalLife > 0
      ? Math.round((totalRemainingLife / totalLife) * 100)
      : 0;

  const totalUsageMinute = logs.reduce(
    (total, log) => total + log.usedMinute,
    0
  );

  const lastLogs = logs.slice(0, 8);

  const systemStatus =
    criticalStockTools.length === 0 && lowLifeTools.length === 0
      ? "Normal"
      : criticalStockTools.length <= 2 && lowLifeTools.length <= 2
      ? "Dikkat Gerektiriyor"
      : "Kritik";

  const systemStatusStyle =
    systemStatus === "Normal"
      ? "bg-green-100 text-green-700 border-green-200"
      : systemStatus === "Dikkat Gerektiriyor"
      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : "bg-red-100 text-red-700 border-red-200";

  const handlePrint = () => {
    window.print();
  };

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
              Sistem verileri rapor formatına dönüştürülüyor.
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
        <div className="mb-8 print:hidden">
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 rounded-3xl p-10 shadow-lg text-white relative overflow-hidden">
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
                  Takım stok durumu, kullanım ömrü ve kullanım geçmişi
                  verilerini resmi rapor formatında görüntüleyin.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePrint}
                className="bg-green-500 hover:bg-green-600 text-white px-7 py-4 rounded-2xl font-black transition flex items-center justify-center gap-3"
              >
                <Printer size={22} />
                Yazdır / PDF Kaydet
              </button>
            </div>

            <div className="relative z-10 mt-8 border-t border-white/10 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <p className="text-slate-300 font-medium">
                Bu sayfa yazdırma ekranından PDF olarak kaydedilebilir.
              </p>

              <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 text-green-300 px-5 py-3 rounded-2xl font-black">
                <span className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-500/50" />
                Canlı rapor aktif
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-0 print:rounded-none">
          <div className="p-10 border-b border-slate-200 print:p-6">
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-8">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-slate-950 text-white rounded-3xl flex items-center justify-center">
                    <FileText size={32} />
                  </div>

                  <div>
                    <p className="text-blue-600 font-black">
                      Tool Room Management
                    </p>

                    <h2 className="text-4xl font-black text-slate-900">
                      CNC Takım Yönetim Raporu
                    </h2>
                  </div>
                </div>

                <p className="text-slate-600 font-medium max-w-4xl leading-7">
                  Bu rapor, sistemde kayıtlı CNC takımlarının stok durumunu,
                  kullanım ömrünü, kritik seviyelerini ve son kullanım
                  hareketlerini özetlemek amacıyla oluşturulmuştur.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 min-w-[320px]">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CalendarDays size={21} className="text-blue-600" />

                    <div>
                      <p className="text-slate-500 text-xs font-black uppercase">
                        Rapor Tarihi
                      </p>

                      <p className="text-slate-900 font-black">
                        {reportDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock3 size={21} className="text-green-600" />

                    <div>
                      <p className="text-slate-500 text-xs font-black uppercase">
                        Saat
                      </p>

                      <p className="text-slate-900 font-black">
                        {reportTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <UserCircle size={21} className="text-purple-600" />

                    <div>
                      <p className="text-slate-500 text-xs font-black uppercase">
                        Hazırlayan
                      </p>

                      <p className="text-slate-900 font-black">
                        {user?.fullName || user?.username || "Sistem Kullanıcısı"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <ShieldCheck size={21} className="text-slate-700" />

                    <div>
                      <p className="text-slate-500 text-xs font-black uppercase">
                        Kullanıcı Rolü
                      </p>

                      <p className="text-slate-900 font-black">
                        {user?.role || "Admin"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-10 print:p-6">
            <div className="mb-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-3xl font-black text-slate-900">
                    Genel Sistem Özeti
                  </h3>

                  <p className="text-slate-600 font-medium mt-1">
                    Sistemin anlık stok ve ömür durumu.
                  </p>
                </div>

                <div
                  className={`border px-5 py-3 rounded-2xl font-black ${systemStatusStyle}`}
                >
                  Sistem Durumu: {systemStatus}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 print:p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-slate-600 font-bold">
                      Toplam Takım
                    </p>

                    <Wrench size={24} className="text-slate-700" />
                  </div>

                  <h4 className="text-5xl font-black text-slate-900 print:text-3xl">
                    {dashboard?.totalTools ?? tools.length}
                  </h4>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-3xl p-6 print:p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-red-700 font-bold">
                      Kritik Stok
                    </p>

                    <AlertTriangle size={24} className="text-red-600" />
                  </div>

                  <h4 className="text-5xl font-black text-red-600 print:text-3xl">
                    {dashboard?.criticalStockTools ??
                      criticalStockTools.length}
                  </h4>
                </div>

                <div className="bg-yellow-50 border border-yellow-100 rounded-3xl p-6 print:p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-yellow-700 font-bold">
                      Kritik Ömür
                    </p>

                    <Timer size={24} className="text-yellow-700" />
                  </div>

                  <h4 className="text-5xl font-black text-yellow-700 print:text-3xl">
                    {dashboard?.lowLifeTools ?? lowLifeTools.length}
                  </h4>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 print:p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-blue-700 font-bold">
                      Ortalama Ömür
                    </p>

                    <BarChart3 size={24} className="text-blue-700" />
                  </div>

                  <h4 className="text-5xl font-black text-blue-700 print:text-3xl">
                    %{averageLifePercent}
                  </h4>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10 print:grid-cols-3 print:gap-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 print:p-4">
                <p className="text-slate-600 font-bold">
                  Toplam Kalan Ömür
                </p>

                <h4 className="text-4xl font-black text-slate-900 mt-2 print:text-2xl">
                  {totalRemainingLife} dk
                </h4>

                <p className="text-slate-500 text-sm font-medium mt-2">
                  Tüm takımların toplam kullanılabilir süresi.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 print:p-4">
                <p className="text-slate-600 font-bold">
                  Toplam Kullanılmış Ömür
                </p>

                <h4 className="text-4xl font-black text-slate-900 mt-2 print:text-2xl">
                  {totalUsedMinute} dk
                </h4>

                <p className="text-slate-500 text-sm font-medium mt-2">
                  Toplam ömürden düşen kullanım miktarı.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 print:p-4">
                <p className="text-slate-600 font-bold">
                  Kullanım Kayıt Süresi
                </p>

                <h4 className="text-4xl font-black text-slate-900 mt-2 print:text-2xl">
                  {totalUsageMinute} dk
                </h4>

                <p className="text-slate-500 text-sm font-medium mt-2">
                  Kullanım geçmişine işlenen toplam dakika.
                </p>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <Package size={26} className="text-red-600" />

                <div>
                  <h3 className="text-2xl font-black text-slate-900">
                    Kritik Stok Raporu
                  </h3>

                  <p className="text-slate-600 font-medium">
                    Stok miktarı kritik seviyeye düşen takımlar.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-3xl">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-slate-950 text-white">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        ID
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Takım Adı
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Tip
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Mevcut Stok
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Kritik Stok
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Durum
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {criticalStockTools.map((tool) => (
                      <tr
                        key={tool.id}
                        className="border-b border-slate-100"
                      >
                        <td className="px-4 py-4 font-black text-slate-500">
                          #{tool.id}
                        </td>

                        <td className="px-4 py-4 font-black text-slate-900">
                          {tool.toolName}
                        </td>

                        <td className="px-4 py-4 text-slate-700 font-semibold">
                          {tool.toolType}
                        </td>

                        <td className="px-4 py-4">
                          <span className="bg-red-100 text-red-700 px-3 py-2 rounded-xl font-black">
                            {tool.stock}
                          </span>
                        </td>

                        <td className="px-4 py-4 font-black text-slate-800">
                          {tool.criticalStock}
                        </td>

                        <td className="px-4 py-4">
                          <span className="bg-red-100 text-red-700 px-3 py-2 rounded-xl font-black text-sm">
                            Kritik Stok
                          </span>
                        </td>
                      </tr>
                    ))}

                    {criticalStockTools.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-green-700 font-black"
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
                  <h3 className="text-2xl font-black text-slate-900">
                    Kritik Ömür Raporu
                  </h3>

                  <p className="text-slate-600 font-medium">
                    Kalan ömrü 200 dakikanın altına düşen takımlar.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-3xl">
                <table className="w-full min-w-[850px]">
                  <thead className="bg-slate-950 text-white">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        ID
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Takım Adı
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
                        Yüzde
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
                        <tr
                          key={tool.id}
                          className="border-b border-slate-100"
                        >
                          <td className="px-4 py-4 font-black text-slate-500">
                            #{tool.id}
                          </td>

                          <td className="px-4 py-4 font-black text-slate-900">
                            {tool.toolName}
                          </td>

                          <td className="px-4 py-4 text-slate-700 font-semibold">
                            {tool.toolType}
                          </td>

                          <td className="px-4 py-4">
                            <span className="bg-yellow-100 text-yellow-700 px-3 py-2 rounded-xl font-black">
                              {tool.remainingLifeMinute} dk
                            </span>
                          </td>

                          <td className="px-4 py-4 font-black text-slate-800">
                            {tool.totalLifeMinute} dk
                          </td>

                          <td className="px-4 py-4 font-black text-yellow-700">
                            %{lifePercent}
                          </td>
                        </tr>
                      );
                    })}

                    {lowLifeTools.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-green-700 font-black"
                        >
                          Kritik ömürlü takım bulunmamaktadır.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-5">
                <Activity size={26} className="text-blue-700" />

                <div>
                  <h3 className="text-2xl font-black text-slate-900">
                    Son Kullanım Kayıtları
                  </h3>

                  <p className="text-slate-600 font-medium">
                    Sisteme girilen en güncel kullanım hareketleri.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-3xl">
                <table className="w-full min-w-[850px]">
                  <thead className="bg-slate-950 text-white">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Kayıt ID
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Takım
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Kullanım
                      </th>
                      <th className="px-4 py-4 text-left text-xs uppercase">
                        Tarih
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {lastLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-slate-100"
                      >
                        <td className="px-4 py-4 font-black text-slate-500">
                          #{log.id}
                        </td>

                        <td className="px-4 py-4 font-black text-slate-900">
                          {log.tool?.toolName || `Takım #${log.toolId}`}
                        </td>

                        <td className="px-4 py-4">
                          <span className="bg-blue-100 text-blue-700 px-3 py-2 rounded-xl font-black">
                            {log.usedMinute} dk
                          </span>
                        </td>

                        <td className="px-4 py-4 text-slate-700 font-semibold">
                          {new Date(log.usageDate).toLocaleString("tr-TR")}
                        </td>
                      </tr>
                    ))}

                    {lastLogs.length === 0 && (
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

            <div className="mt-10 bg-slate-950 text-white rounded-3xl p-7 print:bg-white print:text-slate-900 print:border print:border-slate-300">
              <h3 className="text-2xl font-black mb-3">
                Rapor Değerlendirmesi
              </h3>

              <p className="text-slate-300 print:text-slate-700 leading-8 font-medium">
                Sistemde toplam {tools.length} takım kayıtlıdır. Kritik stokta{" "}
                {criticalStockTools.length} takım, kritik ömür seviyesinde ise{" "}
                {lowLifeTools.length} takım bulunmaktadır. Ortalama kalan takım
                ömrü %{averageLifePercent} seviyesindedir. Bu rapor, CNC takım
                yönetiminin dijital ortamda takip edilmesini ve stok/ömür
                problemlerinin erken fark edilmesini sağlar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}