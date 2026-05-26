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
  ClipboardCheck,
  Gauge,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  Wrench,
  XCircle,
} from "lucide-react";

type User = {
  id: number;
  fullName: string;
  username: string;
  role: string;
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

export default function MaintenancePage() {
  const router = useRouter();

  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [recommendations, setRecommendations] = useState<
    MaintenanceRecommendation[]
  >([]);

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

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

  const fetchMaintenanceData = async () => {
    try {
      const authUser = checkAuth();

      if (!authUser) {
        return;
      }

      const [plansResponse, recommendationsResponse] = await Promise.all([
        api.get("/MaintenancePlan"),
        api.get("/MaintenancePlan/recommendations"),
      ]);

      setPlans(plansResponse.data);
      setRecommendations(recommendationsResponse.data);
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

      if (error.response?.status === 404) {
        toast.error("MaintenancePlan endpoint bulunamadı. Backend controller çalışmıyor olabilir.");
        return;
      }

      toast.error("Bakım verileri yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  useEffect(() => {
    const startSignalR = async () => {
      try {
        if (connection.state === "Disconnected") {
          await connection.start();
          console.log("Maintenance SignalR bağlantısı kuruldu.");
        }
      } catch (error) {
        console.error("SignalR bağlantı hatası:", error);
      }
    };

    startSignalR();

    connection.on("MaintenancePlanCreated", () => {
      fetchMaintenanceData();
    });

    connection.on("MaintenancePlanUpdated", () => {
      fetchMaintenanceData();
    });

    connection.on("MaintenancePlanDeleted", () => {
      fetchMaintenanceData();
    });

    connection.on("ToolLifeTick", () => {
      fetchMaintenanceData();
    });

    connection.on("ToolUpdated", () => {
      fetchMaintenanceData();
    });

    return () => {
      connection.off("MaintenancePlanCreated");
      connection.off("MaintenancePlanUpdated");
      connection.off("MaintenancePlanDeleted");
      connection.off("ToolLifeTick");
      connection.off("ToolUpdated");
    };
  }, []);

  const roleIsAdmin = user?.role?.toLowerCase() === "admin";

  const activePlans = plans.filter(
    (plan) => plan.status === "Planlandı" || plan.status === "Devam Ediyor"
  );

  const completedPlans = plans.filter((plan) => plan.status === "Tamamlandı");

  const cancelledPlans = plans.filter((plan) => plan.status === "İptal Edildi");

  const highPriorityRecommendations = recommendations.filter(
    (item) => item.priority === "Yüksek"
  );

  const filteredPlans = useMemo(() => {
  if (statusFilter === "active") {
    return plans.filter(
      (plan) => plan.status === "Planlandı" || plan.status === "Devam Ediyor"
    );
  }

  if (statusFilter === "all") {
    return plans;
  }

  return plans.filter((plan) => plan.status === statusFilter);
}, [plans, statusFilter]);

  const getStatusClass = (status: string) => {
    if (status === "Planlandı") {
      return "bg-blue-100 text-blue-700";
    }

    if (status === "Devam Ediyor") {
      return "bg-yellow-100 text-yellow-700";
    }

    if (status === "Tamamlandı") {
      return "bg-emerald-100 text-emerald-700";
    }

    return "bg-red-100 text-red-600";
  };

  const getPriorityClass = (priority: string) => {
    if (priority === "Yüksek") {
      return "bg-red-100 text-red-600 border-red-200";
    }

    if (priority === "Orta") {
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }

    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  };

  const getLifePercent = (remaining: number, total: number) => {
    if (total <= 0) {
      return 0;
    }

    return Math.min(Math.max(Math.round((remaining / total) * 100), 0), 100);
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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

  const createPlanFromRecommendation = async (
    recommendation: MaintenanceRecommendation
  ) => {
    if (!roleIsAdmin) {
      toast.error("Bakım planı oluşturmak için Admin yetkisi gerekir.");
      return;
    }

    if (recommendation.hasActivePlan) {
      toast.error("Bu takım için zaten aktif bakım planı var.");
      return;
    }

    try {
      setActionLoadingId(recommendation.id);

      await api.post("/MaintenancePlan", {
        toolId: recommendation.id,
        title: `${recommendation.toolName} bakım/değişim planı`,
        description: `${recommendation.reason} nedeniyle bakım/değişim planı oluşturuldu.`,
        plannedDate: recommendation.suggestedDate,
      });

      toast.success("Bakım planı oluşturuldu.");
      await fetchMaintenanceData();
    } catch (error: any) {
      console.error(error);

      if (error.response?.data) {
        toast.error(
          typeof error.response.data === "string"
            ? error.response.data
            : "Bakım planı oluşturulamadı."
        );
      } else {
        toast.error("Bakım planı oluşturulamadı.");
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const updatePlanStatus = async (plan: MaintenancePlan, status: string) => {
    try {
      setActionLoadingId(plan.id);

      await api.put(`/MaintenancePlan/${plan.id}/status`, {
        status,
      });

      toast.success("Bakım durumu güncellendi.");
      await fetchMaintenanceData();
    } catch (error: any) {
      console.error(error);

      if (error.response?.data) {
        toast.error(
          typeof error.response.data === "string"
            ? error.response.data
            : "Durum güncellenemedi."
        );
      } else {
        toast.error("Durum güncellenemedi.");
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const deletePlan = async (plan: MaintenancePlan) => {
    if (!roleIsAdmin) {
      toast.error("Bakım planı silmek için Admin yetkisi gerekir.");
      return;
    }

    const confirmDelete = window.confirm(
      `${plan.title} adlı bakım planı silinsin mi?`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setActionLoadingId(plan.id);

      await api.delete(`/MaintenancePlan/${plan.id}`);

      toast.success("Bakım planı silindi.");
      await fetchMaintenanceData();
    } catch (error: any) {
      console.error(error);

      if (error.response?.data) {
        toast.error(
          typeof error.response.data === "string"
            ? error.response.data
            : "Bakım planı silinemedi."
        );
      } else {
        toast.error("Bakım planı silinemedi.");
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  if (isLoading) {
    return (
      <>
        <Toaster position="top-right" />

        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="bg-white px-8 py-7 rounded-3xl shadow-sm border border-slate-200 text-center">
            <h1 className="text-xl font-black text-slate-900">
              Bakım planları yükleniyor...
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
        <div className="mb-6">
          <div className="bg-slate-950 rounded-3xl p-6 shadow-sm text-white overflow-hidden relative">
            <div className="absolute -right-20 -top-20 w-72 h-72 bg-emerald-600/20 rounded-full blur-3xl" />
            <div className="absolute right-48 bottom-0 w-52 h-52 bg-blue-500/10 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="bg-emerald-500/15 border border-emerald-400/20 text-emerald-200 px-3 py-1.5 rounded-full text-xs font-black">
                    Bakım Planlama
                  </span>

                  <span className="bg-white/10 border border-white/10 text-slate-300 px-3 py-1.5 rounded-full text-xs font-bold">
                    CNC ToolRoom
                  </span>
                </div>

                <h1 className="text-3xl xl:text-4xl font-black tracking-tight">
                  Bakım ve Değişim Planları
                </h1>

                <p className="text-slate-400 font-medium mt-2 max-w-3xl">
                  Kritik ömür ve kritik stok durumlarına göre takım bakım veya
                  değişim planlarını oluşturun ve takip edin.
                </p>
              </div>

              <button
                onClick={fetchMaintenanceData}
                className="bg-white/10 hover:bg-white/15 border border-white/10 px-5 py-3 rounded-2xl font-black transition flex items-center justify-center gap-2"
              >
                <RefreshCcw size={19} />
                Yenile
              </button>
            </div>

            <div className="relative z-10 mt-5 pt-5 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <p className="text-slate-400 font-semibold">
                Son güncelleme:{" "}
                <span className="text-white font-black">
                  {lastUpdate || "Henüz yok"}
                </span>
              </p>

              <p className="text-slate-400 font-semibold">
                Kullanıcı:{" "}
                <span className="text-white font-black">
                  {user?.fullName || user?.username || "Kullanıcı"}
                </span>{" "}
                / {user?.role || "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <CompactCard
            title="Toplam Plan"
            value={plans.length}
            icon={ClipboardCheck}
            color="slate"
            subText="Bakım kaydı"
          />

          <CompactCard
            title="Aktif Plan"
            value={activePlans.length}
            icon={Activity}
            color="blue"
            subText="Planlandı/devam"
          />

          <CompactCard
            title="Tamamlanan"
            value={completedPlans.length}
            icon={CheckCircle2}
            color="emerald"
            subText="Bakımı bitti"
          />

          <CompactCard
            title="İptal"
            value={cancelledPlans.length}
            icon={XCircle}
            color="red"
            subText="İptal edilen"
          />

          <CompactCard
            title="Öneri"
            value={recommendations.length}
            icon={AlertTriangle}
            color="yellow"
            subText="Sistem önerisi"
          />

          <CompactCard
            title="Yüksek Öncelik"
            value={highPriorityRecommendations.length}
            icon={Gauge}
            color="red"
            subText="Acil takip"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">
          <div className="xl:col-span-5 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <SectionHeader
              title="Bakım Önerileri"
              description="Kritik ömür veya stok nedeniyle önerilen takımlar"
              icon={AlertTriangle}
              rightText={`${recommendations.length} öneri`}
            />

            <div className="p-5 space-y-3 max-h-[680px] overflow-y-auto">
              {recommendations.map((item) => {
                const percent = getLifePercent(
                  item.remainingLifeMinute,
                  item.totalLifeMinute
                );

                return (
                  <div
                    key={item.id}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`border px-2.5 py-1 rounded-full text-xs font-black ${getPriorityClass(
                              item.priority
                            )}`}
                          >
                            {item.priority}
                          </span>

                          {item.hasActivePlan && (
                            <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-black">
                              Plan var
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-black text-slate-900">
                          {item.toolName}
                        </h3>

                        <p className="text-sm text-slate-500 font-semibold">
                          {item.toolType} • {item.reason}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-red-600 font-black">
                          {item.remainingLifeMinute} dk
                        </p>

                        <p className="text-xs text-slate-500 font-bold">
                          kalan ömür
                        </p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-500 font-black">
                          Ömür
                        </span>

                        <span className="text-xs text-slate-800 font-black">
                          %{percent}
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${getLifeColor(
                            percent
                          )}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <MiniInfo
                        label="Stok"
                        value={item.stock}
                        color={
                          item.stock <= item.criticalStock ? "red" : "slate"
                        }
                      />

                      <MiniInfo
                        label="Kritik"
                        value={item.criticalStock}
                        color="yellow"
                      />

                      <MiniInfo
                        label="Tarih"
                        value={formatDate(item.suggestedDate)}
                        color="blue"
                      />
                    </div>

                    <button
                      onClick={() => createPlanFromRecommendation(item)}
                      disabled={
                        !roleIsAdmin ||
                        item.hasActivePlan ||
                        actionLoadingId === item.id
                      }
                      className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white rounded-2xl py-3 font-black transition flex items-center justify-center gap-2"
                    >
                      <CalendarDays size={18} />
                      {item.hasActivePlan
                        ? "Plan Oluşturuldu"
                        : actionLoadingId === item.id
                        ? "Oluşturuluyor..."
                        : "Bakım Planı Oluştur"}
                    </button>
                  </div>
                );
              })}

              {recommendations.length === 0 && (
                <EmptyState
                  icon={ShieldCheck}
                  title="Bakım önerisi yok"
                  text="Kritik ömür veya kritik stok durumunda takım bulunmuyor."
                />
              )}
            </div>
          </div>

          <div className="xl:col-span-7 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <ClipboardCheck size={22} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Bakım Planları
                  </h2>

                  <p className="text-sm text-slate-500 font-semibold">
                    Oluşturulan bakım ve değişim planları.
                  </p>
                </div>
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 font-bold text-slate-800"
              >
                <option value="active">Aktif Planlar</option>
                <option value="all">Tüm Durumlar</option>
                <option value="Planlandı">Planlandı</option>
                <option value="Devam Ediyor">Devam Ediyor</option>
                <option value="Tamamlandı">Tamamlandı</option>
                <option value="İptal Edildi">İptal Edildi</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs uppercase">
                      Plan
                    </th>
                    <th className="px-5 py-4 text-left text-xs uppercase">
                      Takım
                    </th>
                    <th className="px-5 py-4 text-left text-xs uppercase">
                      Plan Tarihi
                    </th>
                    <th className="px-5 py-4 text-left text-xs uppercase">
                      Durum
                    </th>
                    <th className="px-5 py-4 text-left text-xs uppercase">
                      Ömür/Stok
                    </th>
                    <th className="px-5 py-4 text-left text-xs uppercase">
                      İşlem
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPlans.map((plan) => (
                    <tr
                      key={plan.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-5 py-4">
                        <p className="font-black text-slate-900">
                          {plan.title}
                        </p>

                        <p className="text-sm text-slate-500 font-semibold mt-1 max-w-[280px]">
                          {plan.description}
                        </p>

                        <p className="text-xs text-slate-400 font-bold mt-1">
                          Oluşturma: {formatDateTime(plan.createdAt)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                            <Wrench size={21} />
                          </div>

                          <div>
                            <p className="font-black text-slate-900">
                              {plan.toolName}
                            </p>

                            <p className="text-sm text-slate-500 font-bold">
                              {plan.toolType} • ID #{plan.toolId}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="bg-blue-50 text-blue-700 px-3 py-2 rounded-xl font-black text-sm">
                          {formatDate(plan.plannedDate)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`px-3 py-2 rounded-xl font-black text-sm ${getStatusClass(
                            plan.status
                          )}`}
                        >
                          {plan.status}
                        </span>

                        {plan.completedAt && (
                          <p className="text-xs text-slate-500 font-bold mt-2">
                            {formatDateTime(plan.completedAt)}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-black text-slate-900">
                            {plan.remainingLifeMinute} dk kaldı
                          </p>

                          <p className="text-xs text-slate-500 font-bold">
                            Stok: {plan.stock} / Kritik: {plan.criticalStock}
                          </p>

                          {plan.isRunning && (
                            <span className="inline-flex bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-black">
                              Çalışıyor
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={plan.status}
                            onChange={(event) =>
                              updatePlanStatus(plan, event.target.value)
                            }
                            disabled={actionLoadingId === plan.id}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-slate-800"
                          >
                            <option value="Planlandı">Planlandı</option>
                            <option value="Devam Ediyor">Devam Ediyor</option>
                            <option value="Tamamlandı">Tamamlandı</option>
                            <option value="İptal Edildi">İptal Edildi</option>
                          </select>

                          <button
                            onClick={() => deletePlan(plan)}
                            disabled={
                              !roleIsAdmin || actionLoadingId === plan.id
                            }
                            className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-100 disabled:bg-slate-100 text-red-600 disabled:text-slate-400 flex items-center justify-center transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredPlans.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-14 text-center text-slate-600 font-black"
                      >
                        Bakım planı bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {!roleIsAdmin && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-3xl p-5 text-yellow-800 font-bold">
            Operator rolü bakım planı oluşturamaz veya silemez. Ancak bakım
            durumunu güncelleyebilir.
          </div>
        )}
      </div>
    </>
  );
}

type CardColor =
  | "slate"
  | "blue"
  | "red"
  | "yellow"
  | "emerald"
  | "green";

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
  };

  return colors[color];
}

function CompactCard({
  title,
  value,
  icon: Icon,
  color,
  subText,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: CardColor;
  subText: string;
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

      <h2 className={`text-3xl font-black ${classes.text}`}>{value}</h2>

      <p className="text-slate-500 text-xs font-bold mt-2">{subText}</p>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  icon: Icon,
  rightText,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  rightText?: string;
}) {
  return (
    <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
          <Icon size={22} />
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-900">{title}</h2>

          <p className="text-sm text-slate-500 font-semibold">{description}</p>
        </div>
      </div>

      {rightText && (
        <span className="bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap">
          {rightText}
        </span>
      )}
    </div>
  );
}

function MiniInfo({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: CardColor;
}) {
  const classes = colorClasses(color);

  return (
    <div className={`bg-white border ${classes.border} rounded-2xl p-3`}>
      <p className="text-[11px] text-slate-500 font-black uppercase">
        {label}
      </p>

      <p className={`text-base font-black mt-1 ${classes.text}`}>{value}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
      <Icon size={38} className="text-slate-400 mx-auto mb-3" />

      <h3 className="text-lg font-black text-slate-900">{title}</h3>

      <p className="text-slate-500 font-medium mt-1">{text}</p>
    </div>
  );
}