"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import { useRouter } from "next/navigation";
import api from "@/app/services/api";
import connection from "@/app/services/signalr";
import toast, { Toaster } from "react-hot-toast";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Edit,
  Gauge,
  Package,
  Play,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Square,
  Trash2,
  Wrench,
  X,
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

type ToolForm = {
  toolName: string;
  toolType: string;
  totalLifeMinute: string;
  remainingLifeMinute: string;
  stock: string;
  criticalStock: string;
  incomePerMinute: string;
  purchasePrice: string;
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
  toolType?: string;
  isRunning: boolean;
  startedAt?: string | null;
  remainingLifeMinute: number;
  incomePerMinute?: number;
  purchasePrice?: number;
};

const emptyForm: ToolForm = {
  toolName: "",
  toolType: "",
  totalLifeMinute: "",
  remainingLifeMinute: "",
  stock: "",
  criticalStock: "",
  incomePerMinute: "",
  purchasePrice: "",
};

export default function ToolsPage() {
  const router = useRouter();

  const [tools, setTools] = useState<Tool[]>([]);
  const [user, setUser] = useState<User | null>(null);

  const [form, setForm] = useState<ToolForm>(emptyForm);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");

  const isAdmin = user?.role === "Admin";

  const checkAuth = () => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      router.push("/login");
      return null;
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
      return null;
    }

    setUser(parsedUser);
    return parsedUser;
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

      toast.error("Takımlar yüklenemedi.");
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
          console.log("Tools SignalR bağlantısı kuruldu.");
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
                toolName: eventData.toolName,
                toolType: eventData.toolType,
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
                toolName: eventData.toolName ?? tool.toolName,
                toolType: eventData.toolType ?? tool.toolType,
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

    connection.on("ToolCreated", () => {
      fetchTools();
    });

    connection.on("ToolUpdated", () => {
      fetchTools();
    });

    connection.on("ToolDeleted", () => {
      fetchTools();
    });

    connection.on("MaintenancePlanUpdated", () => {
      fetchTools();
    });

    return () => {
      connection.off("ToolLifeTick");
      connection.off("ToolRunningChanged");
      connection.off("ToolCreated");
      connection.off("ToolUpdated");
      connection.off("ToolDeleted");
      connection.off("MaintenancePlanUpdated");
    };
  }, []);

  const filteredTools = useMemo(() => {
    let result = tools;

    if (searchText.trim()) {
      const search = searchText.toLowerCase();

      result = result.filter(
        (tool) =>
          tool.toolName.toLowerCase().includes(search) ||
          tool.toolType.toLowerCase().includes(search)
      );
    }

    if (statusFilter === "running") {
      result = result.filter((tool) => tool.isRunning);
    }

    if (statusFilter === "stopped") {
      result = result.filter((tool) => !tool.isRunning);
    }

    if (statusFilter === "criticalStock") {
      result = result.filter((tool) => tool.stock <= tool.criticalStock);
    }

    if (statusFilter === "lowLife") {
      result = result.filter((tool) => tool.remainingLifeMinute < 200);
    }

    return result;
  }, [tools, searchText, statusFilter]);

  const runningTools = tools.filter((tool) => tool.isRunning);

  const criticalStockTools = tools.filter(
    (tool) => tool.stock <= tool.criticalStock
  );

  const lowLifeTools = tools.filter((tool) => tool.remainingLifeMinute < 200);

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

  const getLifeColor = (percent: number) => {
    if (percent < 20) {
      return "bg-red-500";
    }

    if (percent < 50) {
      return "bg-yellow-500";
    }

    return "bg-emerald-500";
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingTool(null);
  };

  const fillFormForEdit = (tool: Tool) => {
    setEditingTool(tool);

    setForm({
      toolName: tool.toolName,
      toolType: tool.toolType,
      totalLifeMinute: String(tool.totalLifeMinute),
      remainingLifeMinute: String(tool.remainingLifeMinute),
      stock: String(tool.stock),
      criticalStock: String(tool.criticalStock),
      incomePerMinute: String(tool.incomePerMinute),
      purchasePrice: String(tool.purchasePrice),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const validateForm = () => {
    if (!form.toolName.trim()) {
      toast.error("Takım adı boş olamaz.");
      return false;
    }

    if (!form.toolType.trim()) {
      toast.error("Takım tipi boş olamaz.");
      return false;
    }

    if (Number(form.totalLifeMinute) <= 0) {
      toast.error("Toplam ömür 0'dan büyük olmalıdır.");
      return false;
    }

    if (Number(form.remainingLifeMinute) < 0) {
      toast.error("Kalan ömür negatif olamaz.");
      return false;
    }

    if (Number(form.remainingLifeMinute) > Number(form.totalLifeMinute)) {
      toast.error("Kalan ömür toplam ömürden büyük olamaz.");
      return false;
    }

    if (Number(form.stock) < 0) {
      toast.error("Stok negatif olamaz.");
      return false;
    }

    if (Number(form.criticalStock) < 0) {
      toast.error("Kritik stok negatif olamaz.");
      return false;
    }

    if (Number(form.incomePerMinute) < 0) {
      toast.error("Dakika geliri negatif olamaz.");
      return false;
    }

    if (Number(form.purchasePrice) < 0) {
      toast.error("Alış fiyatı negatif olamaz.");
      return false;
    }

    return true;
  };

  const handleSaveTool = async () => {
    if (!isAdmin) {
      toast.error("Bu işlem için Admin yetkisi gereklidir.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    const payload = {
      toolName: form.toolName.trim(),
      toolType: form.toolType.trim(),
      totalLifeMinute: Number(form.totalLifeMinute),
      remainingLifeMinute: Number(form.remainingLifeMinute),
      stock: Number(form.stock),
      criticalStock: Number(form.criticalStock),
      incomePerMinute: Number(form.incomePerMinute),
      purchasePrice: Number(form.purchasePrice),
    };

    try {
      setIsSaving(true);

      if (editingTool) {
        await api.put(`/Tool/${editingTool.id}`, payload);
        toast.success("Takım güncellendi.");
      } else {
        await api.post("/Tool", payload);
        toast.success("Takım eklendi.");
      }

      resetForm();
      fetchTools();
    } catch (error: any) {
      console.error(error);

      const message =
        error.response?.data?.message ||
        error.response?.data ||
        "Takım kaydedilemedi.";

      toast.error(String(message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTool = async (tool: Tool) => {
    if (!isAdmin) {
      toast.error("Bu işlem için Admin yetkisi gereklidir.");
      return;
    }

    const confirmed = confirm(`${tool.toolName} silinsin mi?`);

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/Tool/${tool.id}`);
      toast.success("Takım silindi.");
      fetchTools();
    } catch (error: any) {
      console.error(error);

      const message =
        error.response?.data?.message ||
        error.response?.data ||
        "Takım silinemedi.";

      toast.error(String(message));
    }
  };

  const handleStartTool = async (tool: Tool) => {
    try {
      await api.put(`/Tool/${tool.id}/start`);

      toast.success(`${tool.toolName} çalıştırıldı.`);
      fetchTools();
    } catch (error: any) {
      console.error(error);

      const message =
        error.response?.data?.message ||
        error.response?.data ||
        "Takım çalıştırılamadı.";

      toast.error(String(message));
    }
  };

  const handleStopTool = async (tool: Tool) => {
    try {
      await api.put(`/Tool/${tool.id}/stop`);

      toast.success(`${tool.toolName} durduruldu.`);
      fetchTools();
    } catch (error: any) {
      console.error(error);

      const message =
        error.response?.data?.message ||
        error.response?.data ||
        "Takım durdurulamadı.";

      toast.error(String(message));
    }
  };

  if (isLoading) {
    return (
      <>
        <Toaster position="top-right" />

        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="bg-white px-8 py-7 rounded-3xl shadow-sm border border-slate-200 text-center">
            <h1 className="text-xl font-black text-slate-900">
              Takımlar yükleniyor...
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
        <div className="bg-slate-950 rounded-3xl p-7 text-white shadow-sm mb-6 overflow-hidden relative">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-600/20 blur-3xl rounded-full" />
          <div className="absolute right-44 bottom-0 w-56 h-56 bg-emerald-500/10 blur-3xl rounded-full" />

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="bg-blue-500/15 border border-blue-400/20 text-blue-200 px-3 py-1.5 rounded-full text-xs font-black">
                  Takım Yönetimi
                </span>

                <span className="bg-white/10 border border-white/10 text-slate-300 px-3 py-1.5 rounded-full text-xs font-bold">
                  Rol: {user?.role || "-"}
                </span>

                {!isAdmin && (
                  <span className="bg-yellow-500/15 border border-yellow-400/20 text-yellow-200 px-3 py-1.5 rounded-full text-xs font-black">
                    Operator sadece başlat/durdur yapabilir
                  </span>
                )}
              </div>

              <h1 className="text-3xl xl:text-4xl font-black tracking-tight">
                Takımlar
              </h1>

              <p className="text-slate-400 font-medium mt-2 max-w-3xl">
                CNC takımlarını ekleyebilir, güncelleyebilir, stok/ömür
                durumlarını izleyebilir ve çalıştırma-durdurma işlemlerini
                yapabilirsiniz.
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
                onClick={fetchTools}
                className="bg-blue-600 hover:bg-blue-700 rounded-2xl p-4 text-left transition"
              >
                <RefreshCcw size={20} className="mb-2" />

                <p className="text-sm font-black">Yenile</p>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            title="Toplam Takım"
            value={tools.length}
            icon={Wrench}
            color="slate"
          />

          <SummaryCard
            title="Çalışan"
            value={runningTools.length}
            icon={Activity}
            color="blue"
          />

          <SummaryCard
            title="Kritik Stok"
            value={criticalStockTools.length}
            icon={AlertTriangle}
            color="red"
          />

          <SummaryCard
            title="Kritik Ömür"
            value={lowLifeTools.length}
            icon={Gauge}
            color="yellow"
          />
        </div>

        {isAdmin && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {editingTool ? "Takımı Güncelle" : "Yeni Takım Ekle"}
                </h2>

                <p className="text-slate-500 font-semibold mt-1">
                  Bu alan sadece Admin kullanıcısına görünür. Takım ömrü, stok,
                  kritik stok ve finans değerlerini giriniz.
                </p>
              </div>

              {editingTool && (
                <button
                  onClick={resetForm}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-2xl font-black flex items-center gap-2"
                >
                  <X size={18} />
                  Düzenlemeyi İptal Et
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <InputBox
                label="Takım Adı"
                value={form.toolName}
                onChange={(value) => setForm({ ...form, toolName: value })}
                placeholder="Örn: Freze Ucu"
              />

              <InputBox
                label="Takım Tipi"
                value={form.toolType}
                onChange={(value) => setForm({ ...form, toolType: value })}
                placeholder="Örn: Kesici Takım"
              />

              <InputBox
                label="Toplam Ömür"
                value={form.totalLifeMinute}
                onChange={(value) =>
                  setForm({ ...form, totalLifeMinute: value })
                }
                placeholder="Örn: 1000"
                type="number"
              />

              <InputBox
                label="Kalan Ömür"
                value={form.remainingLifeMinute}
                onChange={(value) =>
                  setForm({ ...form, remainingLifeMinute: value })
                }
                placeholder="Örn: 1000"
                type="number"
              />

              <InputBox
                label="Stok"
                value={form.stock}
                onChange={(value) => setForm({ ...form, stock: value })}
                placeholder="Örn: 10"
                type="number"
              />

              <InputBox
                label="Kritik Stok"
                value={form.criticalStock}
                onChange={(value) =>
                  setForm({ ...form, criticalStock: value })
                }
                placeholder="Örn: 3"
                type="number"
              />

              <InputBox
                label="Dakika Geliri"
                value={form.incomePerMinute}
                onChange={(value) =>
                  setForm({ ...form, incomePerMinute: value })
                }
                placeholder="Örn: 25"
                type="number"
              />

              <InputBox
                label="Alış Fiyatı"
                value={form.purchasePrice}
                onChange={(value) =>
                  setForm({ ...form, purchasePrice: value })
                }
                placeholder="Örn: 500"
                type="number"
              />
            </div>

            <div className="flex justify-end mt-5">
              <button
                onClick={handleSaveTool}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2"
              >
                {editingTool ? <Save size={20} /> : <Plus size={20} />}
                {isSaving
                  ? "Kaydediliyor..."
                  : editingTool
                  ? "Takımı Güncelle"
                  : "Takım Ekle"}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Takım Listesi
                </h2>

                <p className="text-slate-500 font-semibold mt-1">
                  Başlat/durdur işlemleri bu tabloda yapılır.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Takım ara..."
                    className="w-full md:w-72 bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-bold"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="bg-white border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-bold text-slate-700"
                >
                  <option value="all">Tüm Takımlar</option>
                  <option value="running">Çalışanlar</option>
                  <option value="stopped">Duranlar</option>
                  <option value="criticalStock">Kritik Stok</option>
                  <option value="lowLife">Kritik Ömür</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-slate-950 text-white">
                <tr>
                  <TableTh>ID</TableTh>
                  <TableTh>Takım</TableTh>
                  <TableTh>Tip</TableTh>
                  <TableTh>Durum</TableTh>
                  <TableTh>Kalan Ömür</TableTh>
                  <TableTh>Ömür Oranı</TableTh>
                  <TableTh>Stok</TableTh>
                  <TableTh>Kritik</TableTh>
                  <TableTh>Gelir / dk</TableTh>
                  <TableTh>Alış</TableTh>
                  <TableTh align="right">İşlem</TableTh>
                </tr>
              </thead>

              <tbody>
                {filteredTools.map((tool) => {
                  const lifePercent = getLifePercent(tool);

                  return (
                    <tr
                      key={tool.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 font-black text-slate-500">
                        #{tool.id}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-black text-slate-900">
                          {tool.toolName}
                        </p>

                        {tool.startedAt && tool.isRunning && (
                          <p className="text-xs text-emerald-600 font-bold mt-1">
                            Başlangıç:{" "}
                            {new Date(tool.startedAt).toLocaleTimeString(
                              "tr-TR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-600">
                        {tool.toolType}
                      </td>

                      <td className="px-4 py-4">
                        {tool.isRunning ? (
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1">
                            <CheckCircle2 size={14} />
                            Çalışıyor
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 px-3 py-2 rounded-xl text-xs font-black">
                            Duruyor
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 font-black text-slate-900">
                        {tool.remainingLifeMinute} dk
                      </td>

                      <td className="px-4 py-4">
                        <div className="min-w-[150px]">
                          <div className="flex justify-between mb-1">
                            <span className="text-xs font-black text-slate-500">
                              Ömür
                            </span>

                            <span className="text-xs font-black text-slate-900">
                              %{lifePercent}
                            </span>
                          </div>

                          <div className="w-full h-2.5 bg-slate-200 rounded-full">
                            <div
                              className={`h-2.5 rounded-full ${getLifeColor(
                                lifePercent
                              )}`}
                              style={{ width: `${lifePercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td
                        className={`px-4 py-4 font-black ${
                          tool.stock <= tool.criticalStock
                            ? "text-red-600"
                            : "text-slate-900"
                        }`}
                      >
                        {tool.stock}
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-600">
                        {tool.criticalStock}
                      </td>

                      <td className="px-4 py-4 font-black text-emerald-700">
                        {formatCurrency(tool.incomePerMinute)}
                      </td>

                      <td className="px-4 py-4 font-black text-slate-700">
                        {formatCurrency(tool.purchasePrice)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          {tool.isRunning ? (
                            <button
                              onClick={() => handleStopTool(tool)}
                              className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-2xl"
                              title="Durdur"
                            >
                              <Square size={18} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartTool(tool)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-2xl"
                              title="Başlat"
                            >
                              <Play size={18} />
                            </button>
                          )}

                          {isAdmin && (
                            <>
                              <button
                                onClick={() => fillFormForEdit(tool)}
                                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-2xl"
                                title="Düzenle"
                              >
                                <Edit size={18} />
                              </button>

                              <button
                                onClick={() => handleDeleteTool(tool)}
                                className="bg-slate-900 hover:bg-black text-white p-3 rounded-2xl"
                                title="Sil"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredTools.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-10 text-center text-slate-500 font-black"
                    >
                      Takım bulunamadı.
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

function InputBox({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-black text-slate-700 mb-2">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-bold text-slate-800"
      />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: ElementType;
  color: "slate" | "blue" | "red" | "yellow";
}) {
  const colors = {
    slate: {
      bg: "bg-slate-50",
      border: "border-slate-200",
      text: "text-slate-900",
      icon: "text-slate-700",
    },
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      icon: "text-blue-700",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-600",
      icon: "text-red-600",
    },
    yellow: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-700",
      icon: "text-yellow-700",
    },
  };

  const selected = colors[color];

  return (
    <div
      className={`bg-white rounded-3xl p-5 border ${selected.border} shadow-sm`}
    >
      <div className="flex justify-between items-center mb-4">
        <p className="text-slate-500 text-sm font-black">{title}</p>

        <div
          className={`w-10 h-10 rounded-2xl ${selected.bg} ${selected.icon} flex items-center justify-center`}
        >
          <Icon size={20} />
        </div>
      </div>

      <h2 className={`text-3xl font-black ${selected.text}`}>{value}</h2>
    </div>
  );
}

function TableTh({
  children,
  align = "left",
}: {
  children: string;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-4 py-4 text-${align} text-xs uppercase tracking-wide whitespace-nowrap`}
    >
      {children}
    </th>
  );
}