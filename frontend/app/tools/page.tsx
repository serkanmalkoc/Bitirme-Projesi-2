"use client";

import { useEffect, useState } from "react";
import api from "@/app/services/api";
import connection from "@/app/services/signalr";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

import {
  Search,
  Filter,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Package,
  PlusCircle,
  RotateCcw,
  Pencil,
  Trash2,
  LayoutDashboard,
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

export default function ToolsPage() {
  const router = useRouter();

  const [tools, setTools] = useState<Tool[]>([]);
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTools = async () => {
    try {
      const response = await api.get("/Tool");
      setTools(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Takımlar yüklenirken hata oluştu!");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    fetchTools();
  }, []);

  useEffect(() => {
    const startSignalR = async () => {
      try {
        if (connection.state === "Disconnected") {
          await connection.start();
          console.log("Tools SignalR bağlantısı kuruldu.");
        }
      } catch (error) {
        console.error("SignalR bağlantı hatası:", error);
      }
    };

    startSignalR();

    connection.on("ToolUsageAdded", (data: ToolUsageAddedEvent) => {
      setTools((prevTools) =>
        prevTools.map((tool) =>
          tool.id === data.toolId
            ? {
                ...tool,
                remainingLifeMinute: data.remainingLifeMinute,
                stock: data.stock,
                criticalStock: data.criticalStock,
                totalLifeMinute: data.totalLifeMinute,
              }
            : tool
        )
      );

      toast.success(
        `${data.toolName} için ${data.usedMinute} dk kullanım eklendi.`
      );
    });

    return () => {
      connection.off("ToolUsageAdded");
    };
  }, []);

  const confirmDelete = async () => {
    if (deleteId === null) return;

    try {
      await api.delete(`/Tool/${deleteId}`);

      setTools((prevTools) =>
        prevTools.filter((tool) => tool.id !== deleteId)
      );

      setDeleteId(null);

      toast.success("Takım başarıyla silindi!");
    } catch (error) {
      console.error(error);
      toast.error("Silme işlemi başarısız!");
    }
  };

  const toolTypes = Array.from(
    new Set(tools.map((tool) => tool.toolType))
  );

  const isAdmin = user?.role?.toLowerCase() === "admin";

  const criticalStockCount = tools.filter(
    (tool) => tool.stock <= tool.criticalStock
  ).length;

  const lowLifeCount = tools.filter(
    (tool) => tool.remainingLifeMinute < 200
  ).length;

  const normalStockCount = tools.filter(
    (tool) => tool.stock > tool.criticalStock
  ).length;

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.toolName.toLowerCase().includes(searchText.toLowerCase()) ||
      tool.toolType.toLowerCase().includes(searchText.toLowerCase());

    const matchesType =
      typeFilter === "" || tool.toolType === typeFilter;

    const isCriticalStock = tool.stock <= tool.criticalStock;
    const isLowLife = tool.remainingLifeMinute < 200;

    const matchesStatus =
      statusFilter === "" ||
      (statusFilter === "critical-stock" && isCriticalStock) ||
      (statusFilter === "low-life" && isLowLife) ||
      (statusFilter === "normal" && !isCriticalStock && !isLowLife);

    return matchesSearch && matchesType && matchesStatus;
  });

  const clearFilters = () => {
    setSearchText("");
    setTypeFilter("");
    setStatusFilter("");
  };

  if (isLoading) {
    return (
      <>
        <Toaster position="top-right" />

        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="bg-white px-10 py-8 rounded-3xl shadow text-center">
            <h1 className="text-2xl font-black text-slate-900 mb-2">
              Takımlar yükleniyor...
            </h1>

            <p className="text-slate-600 font-medium">
              CNC takım verileri hazırlanıyor.
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
                  CNC Takım Yönetimi
                </p>

                <h1 className="text-5xl font-black tracking-tight mb-4">
                  Takım Envanteri
                </h1>

                <p className="text-slate-300 text-lg max-w-3xl leading-8">
                  Sistemde kayıtlı CNC takımlarını, stok durumlarını ve kullanım
                  ömürlerini detaylı şekilde takip edin.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-6 py-4 rounded-2xl font-bold transition flex items-center justify-center gap-3"
                >
                  <LayoutDashboard size={21} />
                  Dashboard
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => router.push("/tools/create")}
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-2xl font-bold transition flex items-center justify-center gap-3"
                  >
                    <PlusCircle size={21} />
                    Yeni Takım Ekle
                  </button>
                )}
              </div>
            </div>

            <div className="relative z-10 mt-8 border-t border-white/10 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <p className="text-slate-300 font-medium">
                Liste üzerinde arama, filtreleme, stok ve ömür analizi
                yapılabilir.
              </p>

              <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 text-green-300 px-5 py-3 rounded-2xl font-black">
                <span className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-500/50" />
                Canlı güncelleme aktif
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-200 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-5">
              <p className="text-slate-600 font-bold">
                Toplam Takım
              </p>

              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
                <Wrench size={24} />
              </div>
            </div>

            <h2 className="text-5xl font-black text-slate-900">
              {tools.length}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Sistemde kayıtlı toplam takım sayısı.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-green-200 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-5">
              <p className="text-green-700 font-bold">
                Normal Stok
              </p>

              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-700">
                <CheckCircle2 size={24} />
              </div>
            </div>

            <h2 className="text-5xl font-black text-green-700">
              {normalStockCount}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Stok seviyesi güvenli olan takımlar.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-red-200 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-5">
              <p className="text-red-600 font-bold">
                Kritik Stok
              </p>

              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                <AlertTriangle size={24} />
              </div>
            </div>

            <h2 className="text-5xl font-black text-red-600">
              {criticalStockCount}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Kritik stok seviyesine düşen takımlar.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-yellow-200 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-5">
              <p className="text-yellow-700 font-bold">
                Kritik Ömür
              </p>

              <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-700">
                <Timer size={24} />
              </div>
            </div>

            <h2 className="text-5xl font-black text-yellow-700">
              {lowLifeCount}
            </h2>

            <p className="text-slate-600 mt-4 font-medium">
              Kalan ömrü 200 dakikanın altında olanlar.
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
                Takımları ada, tipe veya durum bilgisine göre filtreleyin.
              </p>
            </div>

            <div className="bg-slate-100 text-slate-700 px-5 py-3 rounded-2xl font-black">
              {filteredTools.length} kayıt listeleniyor
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
                placeholder="Takım adı veya tip ara..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 p-4 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
              />
            </div>

            <div className="relative">
              <Filter
                size={22}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full border border-slate-300 bg-white text-slate-900 p-4 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
              >
                <option value="">Tüm Takım Tipleri</option>

                {toolTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-slate-300 bg-white text-slate-900 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
            >
              <option value="">Tüm Durumlar</option>
              <option value="normal">Normal Durum</option>
              <option value="critical-stock">Kritik Stok</option>
              <option value="low-life">Kritik Ömür</option>
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
                Kayıtlı Takımlar
              </h2>

              <p className="text-slate-600 mt-1 font-medium">
                CNC takım envanteri ve anlık durum bilgileri.
              </p>
            </div>

            <div className="bg-blue-50 text-blue-700 px-5 py-3 rounded-2xl font-black flex items-center gap-3">
              <Package size={21} />
              {filteredTools.length} takım
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px]">
              <thead className="bg-slate-950 text-white">
                <tr>
                  <th className="px-4 py-4 text-left text-xs uppercase tracking-wide">
                    ID
                  </th>
                  <th className="px-4 py-4 text-left text-xs uppercase tracking-wide">
                    Takım Bilgisi
                  </th>
                  <th className="px-4 py-4 text-left text-xs uppercase tracking-wide">
                    Tip
                  </th>
                  <th className="px-4 py-4 text-left text-xs uppercase tracking-wide">
                    Kullanım Ömrü
                  </th>
                  <th className="px-4 py-4 text-left text-xs uppercase tracking-wide">
                    Stok
                  </th>
                  <th className="px-4 py-4 text-left text-xs uppercase tracking-wide">
                    Durum
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-4 text-left text-xs uppercase tracking-wide">
                      İşlemler
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredTools.map((tool) => {
                  const lifePercent =
                    tool.totalLifeMinute > 0
                      ? Math.round(
                          (tool.remainingLifeMinute /
                            tool.totalLifeMinute) *
                            100
                        )
                      : 0;

                  const safeLifePercent = Math.min(
                    Math.max(lifePercent, 0),
                    100
                  );

                  const isCriticalStock =
                    tool.stock <= tool.criticalStock;

                  const isLowLife =
                    tool.remainingLifeMinute < 200;

                  return (
                    <tr
                      key={tool.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-4 py-4 font-black text-slate-500 text-sm">
                        #{tool.id}
                      </td>

                      <td className="px-4 py-4">
                        <div>
                          <p className="font-black text-slate-900 text-base leading-snug max-w-[150px]">
                            {tool.toolName}
                          </p>

                          <p className="text-slate-600 text-xs mt-1 font-medium">
                            Toplam ömür: {tool.totalLifeMinute} dk
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-2 rounded-xl font-black text-xs inline-block max-w-[110px] text-center leading-snug">
                          {tool.toolType}
                        </span>
                      </td>

                      <td className="px-4 py-4 min-w-[260px]">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-black text-slate-800 text-sm">
                            {tool.remainingLifeMinute} dk kaldı
                          </span>

                          <span
                            className={`font-black text-sm ${
                              isLowLife
                                ? "text-red-600"
                                : safeLifePercent < 50
                                ? "text-yellow-700"
                                : "text-green-700"
                            }`}
                          >
                            %{safeLifePercent}
                          </span>
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${
                              isLowLife
                                ? "bg-red-500"
                                : safeLifePercent < 50
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${safeLifePercent}%` }}
                          />
                        </div>

                        <p className="text-slate-500 text-xs mt-2 font-semibold">
                          Kullanılan:{" "}
                          {tool.totalLifeMinute - tool.remainingLifeMinute} dk
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <div
                          className={`rounded-2xl px-4 py-3 w-[92px] border ${
                            isCriticalStock
                              ? "bg-red-50 border-red-100"
                              : "bg-green-50 border-green-100"
                          }`}
                        >
                          <p
                            className={`text-2xl font-black ${
                              isCriticalStock
                                ? "text-red-600"
                                : "text-green-700"
                            }`}
                          >
                            {tool.stock}
                          </p>

                          <p className="text-slate-600 text-xs font-bold">
                            Kritik: {tool.criticalStock}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          {isCriticalStock ? (
                            <span className="bg-red-100 text-red-700 px-3 py-2 rounded-xl font-black text-xs w-fit flex items-center gap-2">
                              <AlertTriangle size={14} />
                              Kritik Stok
                            </span>
                          ) : (
                            <span className="bg-green-100 text-green-700 px-3 py-2 rounded-xl font-black text-xs w-fit flex items-center gap-2">
                              <CheckCircle2 size={14} />
                              Stok Normal
                            </span>
                          )}

                          {isLowLife ? (
                            <span className="bg-yellow-100 text-yellow-700 px-3 py-2 rounded-xl font-black text-xs w-fit flex items-center gap-2">
                              <Timer size={14} />
                              Kritik Ömür
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-700 px-3 py-2 rounded-xl font-black text-xs w-fit">
                              Ömür Normal
                            </span>
                          )}
                        </div>
                      </td>

                      {isAdmin && (
                        <td className="px-4 py-4 min-w-[220px]">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(`/tools/edit/${tool.id}`)
                              }
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl font-black text-sm transition flex items-center gap-2"
                            >
                              <Pencil size={15} />
                              Düzenle
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteId(tool.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl font-black text-sm transition flex items-center gap-2"
                            >
                              <Trash2 size={15} />
                              Sil
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredTools.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-slate-100 text-slate-500 rounded-3xl flex items-center justify-center mx-auto mb-5">
                <Search size={36} />
              </div>

              <h3 className="text-2xl font-black text-slate-900 mb-2">
                Kayıt bulunamadı
              </h3>

              <p className="text-slate-600 font-medium max-w-xl mx-auto">
                Arama veya filtreleme kriterlerine uygun takım bulunamadı.
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

        {deleteId !== null && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-5">
                <Trash2 size={30} />
              </div>

              <h2 className="text-2xl font-black text-slate-900 mb-4">
                Silme Onayı
              </h2>

              <p className="text-slate-700 mb-8 font-medium leading-7">
                Bu takımı silmek istediğinize emin misiniz? Bu işlem geri
                alınamaz.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-900 px-5 py-3 rounded-xl font-black transition"
                >
                  Vazgeç
                </button>

                <button
                  type="button"
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-800 text-white px-5 py-3 rounded-xl font-black transition"
                >
                  Evet, Sil
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}