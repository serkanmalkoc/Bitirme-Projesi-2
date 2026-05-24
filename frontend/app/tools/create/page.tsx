"use client";

import { useState } from "react";
import api from "@/app/services/api";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

export default function CreateToolPage() {
  const router = useRouter();

  const [toolName, setToolName] = useState("");
  const [toolType, setToolType] = useState("");
  const [totalLifeMinute, setTotalLifeMinute] = useState("");
  const [stock, setStock] = useState("");
  const [criticalStock, setCriticalStock] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !toolName ||
      !toolType ||
      !totalLifeMinute ||
      !stock ||
      !criticalStock
    ) {
      toast.error("Lütfen tüm alanları doldurun!");
      return;
    }

    if (
      Number(totalLifeMinute) <= 0 ||
      Number(stock) < 0 ||
      Number(criticalStock) < 0
    ) {
      toast.error("Sayısal değerleri doğru giriniz!");
      return;
    }

    const newTool = {
      toolName,
      toolType,
      totalLifeMinute: Number(totalLifeMinute),
      remainingLifeMinute: Number(totalLifeMinute),
      stock: Number(stock),
      criticalStock: Number(criticalStock),
    };

    try {
      setIsSubmitting(true);

      await api.post("/Tool", newTool);

      toast.success("Takım başarıyla eklendi!");

      setTimeout(() => {
        router.push("/tools");
      }, 1000);
    } catch (error) {
      console.error(error);
      toast.error("Takım eklenirken hata oluştu!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-screen bg-slate-100 p-10">
        <div className="mb-8">
          <div className="bg-gradient-to-r from-slate-950 to-slate-800 rounded-3xl p-10 shadow-lg text-white">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
              <div>
                <p className="text-green-300 font-semibold mb-3">
                  CNC Takım Yönetimi
                </p>

                <h1 className="text-5xl font-black tracking-tight mb-4">
                  Yeni Takım Ekle
                </h1>

                <p className="text-slate-300 text-lg max-w-3xl">
                  Sisteme yeni CNC takımı ekleyerek stok, kritik stok ve kullanım ömrü takibini başlatın.
                </p>
              </div>

              <button
                onClick={() => router.push("/tools")}
                className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-6 py-4 rounded-2xl font-bold transition w-fit"
              >
                Takım Listesine Dön
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900">
                Takım Bilgileri
              </h2>

              <p className="text-slate-600 mt-2 font-medium">
                Yeni takım kaydı için aşağıdaki bilgileri eksiksiz doldurun.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block mb-2 font-bold text-slate-900">
                  Takım Adı
                </label>

                <input
                  type="text"
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  className="w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-semibold"
                  placeholder="Örn: Freze Ucu Premium"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-bold text-slate-900">
                  Takım Tipi
                </label>

                <input
                  type="text"
                  value={toolType}
                  onChange={(e) => setToolType(e.target.value)}
                  className="w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-semibold"
                  placeholder="Örn: Kesici, Delici, Elmas Uç"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block mb-2 font-bold text-slate-900">
                    Toplam Ömür / Dakika
                  </label>

                  <input
                    type="number"
                    value={totalLifeMinute}
                    onChange={(e) => setTotalLifeMinute(e.target.value)}
                    className="w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-semibold"
                    placeholder="1000"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-2 font-bold text-slate-900">
                    Stok
                  </label>

                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-semibold"
                    placeholder="15"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-2 font-bold text-slate-900">
                    Kritik Stok
                  </label>

                  <input
                    type="number"
                    value={criticalStock}
                    onChange={(e) => setCriticalStock(e.target.value)}
                    className="w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-semibold"
                    placeholder="5"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-8 py-4 rounded-2xl font-black transition"
                >
                  {isSubmitting ? "Kaydediliyor..." : "Takımı Kaydet"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/tools")}
                  className="bg-slate-900 hover:bg-slate-700 text-white px-8 py-4 rounded-2xl font-black transition"
                >
                  Vazgeç
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-7">
              <h2 className="text-xl font-black text-slate-900 mb-4">
                Kayıt Özeti
              </h2>

              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <p className="text-slate-500 text-sm font-bold">
                    Takım Adı
                  </p>

                  <p className="text-slate-900 font-black mt-1">
                    {toolName || "Henüz girilmedi"}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <p className="text-slate-500 text-sm font-bold">
                    Takım Tipi
                  </p>

                  <p className="text-slate-900 font-black mt-1">
                    {toolType || "Henüz girilmedi"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <p className="text-blue-700 text-sm font-bold">
                      Ömür
                    </p>

                    <p className="text-blue-900 font-black text-2xl mt-1">
                      {totalLifeMinute || 0}
                    </p>

                    <p className="text-blue-700 text-xs font-semibold">
                      dakika
                    </p>
                  </div>

                  <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                    <p className="text-green-700 text-sm font-bold">
                      Stok
                    </p>

                    <p className="text-green-900 font-black text-2xl mt-1">
                      {stock || 0}
                    </p>

                    <p className="text-green-700 text-xs font-semibold">
                      adet
                    </p>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                  <p className="text-red-700 text-sm font-bold">
                    Kritik Stok Seviyesi
                  </p>

                  <p className="text-red-900 font-black text-2xl mt-1">
                    {criticalStock || 0}
                  </p>

                  <p className="text-red-700 text-xs font-semibold">
                    stok bu değere düştüğünde kritik kabul edilir
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 rounded-3xl shadow-sm p-7 text-white">
              <h2 className="text-xl font-black mb-3">
                Bilgilendirme
              </h2>

              <p className="text-slate-300 leading-7">
                Yeni takım eklendiğinde kalan ömür otomatik olarak toplam ömür değerine eşitlenir. Kullanım kaydı girildikçe kalan ömür sistem tarafından düşürülür.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}