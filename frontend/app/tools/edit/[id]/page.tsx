"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/app/services/api";
import toast, { Toaster } from "react-hot-toast";

type ToolForm = {
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

export default function EditToolPage() {
  const router = useRouter();
  const params = useParams();

  const id = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<ToolForm>({
    toolName: "",
    toolType: "",
    totalLifeMinute: 0,
    remainingLifeMinute: 0,
    stock: 0,
    criticalStock: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkUserAndLoadTool = async () => {
      try {
        const storedUser = localStorage.getItem("user");

        if (!storedUser) {
          toast.error("Bu sayfaya erişmek için giriş yapmalısınız.");
          router.push("/login");
          return;
        }

        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);

        if (parsedUser.role?.toLowerCase() !== "admin") {
          toast.error("Bu sayfaya sadece Admin kullanıcı erişebilir.");
          router.push("/tools");
          return;
        }

        setIsAuthorized(true);

        const response = await api.get(`/Tool/${id}`);

        setForm({
          toolName: response.data.toolName,
          toolType: response.data.toolType,
          totalLifeMinute: response.data.totalLifeMinute,
          remainingLifeMinute: response.data.remainingLifeMinute,
          stock: response.data.stock,
          criticalStock: response.data.criticalStock,
        });
      } catch (error) {
        console.error(error);
        toast.error("Takım bilgileri yüklenemedi.");
        router.push("/tools");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      checkUserAndLoadTool();
    }
  }, [id, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const validateForm = () => {
    if (!form.toolName.trim()) {
      toast.error("Takım adı boş bırakılamaz.");
      return false;
    }

    if (!form.toolType.trim()) {
      toast.error("Takım tipi seçilmelidir.");
      return false;
    }

    if (form.totalLifeMinute <= 0) {
      toast.error("Toplam ömür 0'dan büyük olmalıdır.");
      return false;
    }

    if (form.remainingLifeMinute < 0) {
      toast.error("Kalan ömür negatif olamaz.");
      return false;
    }

    if (form.remainingLifeMinute > form.totalLifeMinute) {
      toast.error("Kalan ömür toplam ömürden büyük olamaz.");
      return false;
    }

    if (form.stock < 0) {
      toast.error("Stok negatif olamaz.");
      return false;
    }

    if (form.criticalStock < 0) {
      toast.error("Kritik stok negatif olamaz.");
      return false;
    }

    return true;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setIsSaving(true);

      await api.put(`/Tool/${id}`, {
        id: Number(id),
        toolName: form.toolName,
        toolType: form.toolType,
        totalLifeMinute: form.totalLifeMinute,
        remainingLifeMinute: form.remainingLifeMinute,
        stock: form.stock,
        criticalStock: form.criticalStock,
      });

      toast.success("Takım başarıyla güncellendi.");

      setTimeout(() => {
        router.push("/tools");
      }, 800);
    } catch (error) {
      console.error(error);
      toast.error("Takım güncellenirken hata oluştu.");
    } finally {
      setIsSaving(false);
    }
  };

  const lifePercent =
    form.totalLifeMinute > 0
      ? Math.round((form.remainingLifeMinute / form.totalLifeMinute) * 100)
      : 0;

  const isCriticalStock = form.stock <= form.criticalStock;
  const isLowLife = form.remainingLifeMinute < 200;

  if (isLoading) {
    return (
      <>
        <Toaster position="top-right" />

        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="bg-white px-10 py-8 rounded-3xl shadow text-center">
            <h1 className="text-2xl font-black text-slate-900 mb-2">
              Takım bilgileri yükleniyor...
            </h1>

            <p className="text-slate-600 font-medium">
              Güncelleme ekranı hazırlanıyor.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!isAuthorized) {
    return (
      <>
        <Toaster position="top-right" />

        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="bg-white px-10 py-8 rounded-3xl shadow text-center">
            <h1 className="text-2xl font-black text-red-600 mb-2">
              Yetkisiz Erişim
            </h1>

            <p className="text-slate-600 font-medium">
              Bu sayfaya sadece Admin kullanıcı erişebilir.
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
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 rounded-3xl p-10 shadow-lg text-white">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
              <div>
                <p className="text-blue-300 font-semibold mb-3">
                  CNC Takım Yönetimi
                </p>

                <h1 className="text-5xl font-black tracking-tight mb-4">
                  Takım Güncelle
                </h1>

                <p className="text-slate-300 text-lg max-w-3xl leading-8">
                  Sistemde kayıtlı CNC takımının adı, tipi, stok bilgisi ve kullanım ömrü değerlerini düzenleyin.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => router.push("/tools")}
                  className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-6 py-4 rounded-2xl font-bold transition"
                >
                  Takım Listesine Dön
                </button>
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <p className="text-slate-300 font-medium">
                Düzenleyen kullanıcı:{" "}
                <span className="font-black text-white">
                  {user?.fullName || user?.username}
                </span>
              </p>

              <div className="bg-blue-500/15 border border-blue-500/20 text-blue-300 px-5 py-3 rounded-2xl font-black">
                Admin Yetkisi
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900">
                Takım Bilgileri
              </h2>

              <p className="text-slate-600 mt-1 font-medium">
                Güncellemek istediğiniz alanları düzenleyip kaydedin.
              </p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
              <div>
                <label className="block mb-2 font-bold text-slate-900">
                  Takım Adı
                </label>

                <input
                  type="text"
                  name="toolName"
                  value={form.toolName}
                  onChange={handleChange}
                  placeholder="Örnek: Freze Ucu Premium"
                  className="w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block mb-2 font-bold text-slate-900">
                  Takım Tipi
                </label>

                <select
                  name="toolType"
                  value={form.toolType}
                  onChange={handleChange}
                  className="w-full border border-slate-300 bg-white text-slate-900 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                >
                  <option value="">Takım tipi seçiniz</option>
                  <option value="Kesici">Kesici</option>
                  <option value="Torna Ucu">Torna Ucu</option>
                  <option value="Delici">Delici</option>
                  <option value="Diş Açma">Diş Açma</option>
                  <option value="Delik İşleme">Delik İşleme</option>
                  <option value="Sarf Malzeme">Sarf Malzeme</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 font-bold text-slate-900">
                    Toplam Ömür / Dakika
                  </label>

                  <input
                    type="number"
                    name="totalLifeMinute"
                    value={form.totalLifeMinute}
                    onChange={handleChange}
                    min={0}
                    className="w-full border border-slate-300 bg-white text-slate-900 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block mb-2 font-bold text-slate-900">
                    Kalan Ömür / Dakika
                  </label>

                  <input
                    type="number"
                    name="remainingLifeMinute"
                    value={form.remainingLifeMinute}
                    onChange={handleChange}
                    min={0}
                    className="w-full border border-slate-300 bg-white text-slate-900 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 font-bold text-slate-900">
                    Mevcut Stok
                  </label>

                  <input
                    type="number"
                    name="stock"
                    value={form.stock}
                    onChange={handleChange}
                    min={0}
                    className="w-full border border-slate-300 bg-white text-slate-900 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block mb-2 font-bold text-slate-900">
                    Kritik Stok
                  </label>

                  <input
                    type="number"
                    name="criticalStock"
                    value={form.criticalStock}
                    onChange={handleChange}
                    min={0}
                    className="w-full border border-slate-300 bg-white text-slate-900 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-8 py-4 rounded-2xl font-black transition shadow-lg shadow-blue-200"
                >
                  {isSaving ? "Güncelleniyor..." : "Takımı Güncelle"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/tools")}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-900 px-8 py-4 rounded-2xl font-black transition"
                >
                  Vazgeç
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-2xl font-black text-slate-900 mb-2">
                Güncel Durum
              </h2>

              <p className="text-slate-600 font-medium mb-6">
                Formdaki değerlere göre takımın anlık durumu.
              </p>

              <div className="space-y-5">
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5">
                  <p className="text-slate-600 font-bold">
                    Takım Adı
                  </p>

                  <p className="text-slate-900 text-2xl font-black mt-1">
                    {form.toolName || "-"}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5">
                  <p className="text-blue-700 font-bold">
                    Takım Tipi
                  </p>

                  <p className="text-blue-900 text-2xl font-black mt-1">
                    {form.toolType || "-"}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-slate-600 font-bold">
                      Kalan Ömür
                    </p>

                    <p className="text-slate-900 font-black">
                      %{lifePercent}
                    </p>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full ${
                        isLowLife
                          ? "bg-red-500"
                          : lifePercent < 50
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${lifePercent}%` }}
                    />
                  </div>

                  <p className="text-slate-600 text-sm mt-3 font-medium">
                    {form.remainingLifeMinute} / {form.totalLifeMinute} dakika
                  </p>
                </div>

                <div
                  className={`border rounded-3xl p-5 ${
                    isCriticalStock
                      ? "bg-red-50 border-red-100"
                      : "bg-green-50 border-green-100"
                  }`}
                >
                  <p
                    className={`font-bold ${
                      isCriticalStock ? "text-red-700" : "text-green-700"
                    }`}
                  >
                    Stok Durumu
                  </p>

                  <p
                    className={`text-4xl font-black mt-1 ${
                      isCriticalStock ? "text-red-700" : "text-green-700"
                    }`}
                  >
                    {form.stock}
                  </p>

                  <p className="text-slate-600 text-sm mt-2 font-medium">
                    Kritik stok seviyesi: {form.criticalStock}
                  </p>

                  <div
                    className={`mt-4 px-4 py-3 rounded-2xl font-black w-fit ${
                      isCriticalStock
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {isCriticalStock ? "Kritik Stok" : "Stok Normal"}
                  </div>
                </div>

                <div
                  className={`border rounded-3xl p-5 ${
                    isLowLife
                      ? "bg-yellow-50 border-yellow-100"
                      : "bg-green-50 border-green-100"
                  }`}
                >
                  <p
                    className={`font-bold ${
                      isLowLife ? "text-yellow-700" : "text-green-700"
                    }`}
                  >
                    Ömür Durumu
                  </p>

                  <p
                    className={`text-2xl font-black mt-2 ${
                      isLowLife ? "text-yellow-700" : "text-green-700"
                    }`}
                  >
                    {isLowLife ? "Kritik Ömür" : "Ömür Normal"}
                  </p>

                  <p className="text-slate-600 text-sm mt-2 font-medium">
                    200 dakikanın altındaki takımlar kritik ömür olarak kabul edilir.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 rounded-3xl p-7 text-white">
              <h2 className="text-2xl font-black mb-3">
                Güncelleme Notu
              </h2>

              <p className="text-slate-300 leading-7 font-medium">
                Takımın kalan ömür değeri, kullanım kaydı eklendiğinde otomatik azalır.
                Bu ekrandan manuel düzeltme de yapılabilir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}