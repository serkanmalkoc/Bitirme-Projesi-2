"use client";

import { useEffect, useState } from "react";
import api from "@/app/services/api";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

type Tool = {
  id: number;
  toolName: string;
  toolType: string;
  totalLifeMinute: number;
  remainingLifeMinute: number;
  stock: number;
  criticalStock: number;
};

export default function AddUsagePage() {
  const router = useRouter();

  const [tools, setTools] = useState<Tool[]>([]);
  const [toolId, setToolId] = useState("");
  const [usedMinute, setUsedMinute] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api
      .get("/Tool")
      .then((response) => {
        setTools(response.data);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Takımlar yüklenirken hata oluştu!");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const selectedTool = tools.find(
    (tool) => tool.id === Number(toolId)
  );

  const usedMinuteNumber = Number(usedMinute) || 0;

  const newRemainingLife =
    selectedTool && usedMinuteNumber > 0
      ? selectedTool.remainingLifeMinute - usedMinuteNumber
      : selectedTool?.remainingLifeMinute ?? 0;

  const usagePercent =
    selectedTool && selectedTool.remainingLifeMinute > 0
      ? Math.round(
          (usedMinuteNumber / selectedTool.remainingLifeMinute) * 100
        )
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!toolId || !usedMinute) {
      setMessage("Lütfen takım ve kullanım süresini giriniz.");
      toast.error("Lütfen takım ve kullanım süresini giriniz!");
      return;
    }

    if (Number(usedMinute) <= 0) {
      setMessage("Kullanım süresi 0'dan büyük olmalıdır.");
      toast.error("Kullanım süresi 0'dan büyük olmalıdır!");
      return;
    }

    if (
      selectedTool &&
      Number(usedMinute) > selectedTool.remainingLifeMinute
    ) {
      setMessage("Kullanım süresi kalan takım ömründen fazla olamaz.");
      toast.error("Kullanım süresi kalan takım ömründen fazla olamaz!");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await api.post("/ToolUsageLog", {
        toolId: Number(toolId),
        usedMinute: Number(usedMinute),
      });

      setMessage(
        `${response.data.toolName} için ${response.data.usedMinute} dk kullanım kaydedildi. Kalan ömür: ${response.data.remainingLifeMinute} dk`
      );

      toast.success("Kullanım kaydı başarıyla eklendi!");

      setTimeout(() => {
        router.push("/usage-logs");
      }, 1500);
    } catch (error: any) {
      console.error(error);

      toast.error("Kullanım kaydı eklenemedi!");

      if (error.response?.data) {
        setMessage(error.response.data);
      } else {
        setMessage("Kullanım kaydı eklenirken hata oluştu.");
      }
    } finally {
      setIsSubmitting(false);
    }
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
              Kullanım kaydı için takım bilgileri hazırlanıyor.
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
          <div className="bg-gradient-to-r from-slate-950 to-slate-800 rounded-3xl p-10 shadow-lg text-white">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
              <div>
                <p className="text-green-300 font-semibold mb-3">
                  CNC Takım Kullanımı
                </p>

                <h1 className="text-5xl font-black tracking-tight mb-4">
                  Kullanım Kaydı Ekle
                </h1>

                <p className="text-slate-300 text-lg max-w-3xl">
                  Kullanılan CNC takımını seçin, dakika bazlı kullanım süresini girin ve kalan takım ömrünü otomatik olarak güncelleyin.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => router.push("/tools")}
                  className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-6 py-4 rounded-2xl font-bold transition"
                >
                  Takımlar
                </button>

                <button
                  onClick={() => router.push("/usage-logs")}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-2xl font-bold transition"
                >
                  Kullanım Geçmişi
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900">
                Kullanım Bilgileri
              </h2>

              <p className="text-slate-600 mt-2 font-medium">
                Kullanılan takımı seçerek kullanım süresini dakika cinsinden giriniz.
              </p>
            </div>

            {message && (
              <div className="mb-6 p-5 bg-blue-50 border border-blue-100 text-blue-800 rounded-2xl font-bold">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block mb-2 font-bold text-slate-900">
                  Takım Seç
                </label>

                <select
                  value={toolId}
                  onChange={(e) => setToolId(e.target.value)}
                  className="w-full border border-slate-300 bg-white text-slate-900 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-semibold"
                  required
                >
                  <option value="">
                    Takım seçiniz
                  </option>

                  {tools.map((tool) => (
                    <option key={tool.id} value={tool.id}>
                      {tool.toolName} - {tool.toolType} - Kalan Ömür:{" "}
                      {tool.remainingLifeMinute} dk
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 font-bold text-slate-900">
                  Kullanım Süresi / Dakika
                </label>

                <input
                  type="number"
                  value={usedMinute}
                  onChange={(e) => setUsedMinute(e.target.value)}
                  className="w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-semibold"
                  placeholder="Örn: 120"
                  required
                />
              </div>

              <div className="flex flex-col md:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-8 py-4 rounded-2xl font-black transition"
                >
                  {isSubmitting
                    ? "Kaydediliyor..."
                    : "Kullanımı Kaydet"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/usage-logs")}
                  className="bg-slate-900 hover:bg-slate-700 text-white px-8 py-4 rounded-2xl font-black transition"
                >
                  Geçmişe Git
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-7">
              <h2 className="text-xl font-black text-slate-900 mb-4">
                Seçilen Takım Özeti
              </h2>

              {selectedTool ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-slate-500 text-sm font-bold">
                      Takım Adı
                    </p>

                    <p className="text-slate-900 font-black mt-1">
                      {selectedTool.toolName}
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <p className="text-blue-700 text-sm font-bold">
                      Takım Tipi
                    </p>

                    <p className="text-blue-900 font-black mt-1">
                      {selectedTool.toolType}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                      <p className="text-green-700 text-sm font-bold">
                        Kalan Ömür
                      </p>

                      <p className="text-green-900 font-black text-2xl mt-1">
                        {selectedTool.remainingLifeMinute}
                      </p>

                      <p className="text-green-700 text-xs font-semibold">
                        dakika
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <p className="text-slate-600 text-sm font-bold">
                        Toplam Ömür
                      </p>

                      <p className="text-slate-900 font-black text-2xl mt-1">
                        {selectedTool.totalLifeMinute}
                      </p>

                      <p className="text-slate-600 text-xs font-semibold">
                        dakika
                      </p>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                    <p className="text-red-700 text-sm font-bold">
                      Stok Durumu
                    </p>

                    <div className="flex items-end justify-between mt-1">
                      <div>
                        <p className="text-red-900 font-black text-2xl">
                          {selectedTool.stock}
                        </p>

                        <p className="text-red-700 text-xs font-semibold">
                          mevcut stok
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-red-900 font-black text-2xl">
                          {selectedTool.criticalStock}
                        </p>

                        <p className="text-red-700 text-xs font-semibold">
                          kritik stok
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                  <p className="text-slate-600 font-bold">
                    Henüz takım seçilmedi.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-7">
              <h2 className="text-xl font-black text-slate-900 mb-4">
                Kullanım Sonrası Tahmin
              </h2>

              {selectedTool && usedMinuteNumber > 0 ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-slate-500 text-sm font-bold">
                      Girilen Kullanım
                    </p>

                    <p className="text-slate-900 font-black text-3xl mt-1">
                      {usedMinuteNumber} dk
                    </p>

                    <p className="text-slate-600 text-sm font-semibold mt-1">
                      Kalan ömrün yaklaşık %{usagePercent} kadarı kullanılacak.
                    </p>
                  </div>

                  <div
                    className={`rounded-2xl p-4 border ${
                      newRemainingLife < 0
                        ? "bg-red-50 border-red-100"
                        : newRemainingLife < 200
                        ? "bg-yellow-50 border-yellow-100"
                        : "bg-green-50 border-green-100"
                    }`}
                  >
                    <p
                      className={`text-sm font-bold ${
                        newRemainingLife < 0
                          ? "text-red-700"
                          : newRemainingLife < 200
                          ? "text-yellow-700"
                          : "text-green-700"
                      }`}
                    >
                      Tahmini Yeni Kalan Ömür
                    </p>

                    <p
                      className={`font-black text-3xl mt-1 ${
                        newRemainingLife < 0
                          ? "text-red-900"
                          : newRemainingLife < 200
                          ? "text-yellow-800"
                          : "text-green-900"
                      }`}
                    >
                      {newRemainingLife} dk
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                  <p className="text-slate-600 font-bold">
                    Takım ve kullanım süresi girildiğinde tahmini sonuç burada gösterilir.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-slate-950 rounded-3xl shadow-sm p-7 text-white">
              <h2 className="text-xl font-black mb-3">
                Bilgilendirme
              </h2>

              <p className="text-slate-300 leading-7">
                Kullanım kaydı eklendiğinde seçilen takımın kalan ömrü otomatik olarak girilen dakika kadar azaltılır ve işlem kullanım geçmişine kaydedilir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}