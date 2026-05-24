"use client";

import { useEffect, useState } from "react";
import api from "@/app/services/api";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

type Tool = {
  id: number;
  toolName: string;
  toolType: string;
  remainingLifeMinute: number;
};

export default function AddUsagePage() {
  const router = useRouter();

  const [tools, setTools] = useState<Tool[]>([]);
  const [toolId, setToolId] = useState("");
  const [usedMinute, setUsedMinute] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .get("/Tool")
      .then((response) => {
        setTools(response.data);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Takımlar yüklenirken hata oluştu!");
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!toolId || !usedMinute) {
      setMessage("Lütfen takım ve kullanım süresini giriniz.");
      toast.error("Lütfen takım ve kullanım süresini giriniz!");
      return;
    }

    try {
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
    }
  };

  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-screen bg-gray-100 p-10">
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow">
          <h1 className="text-4xl font-bold mb-8">
            Kullanım Kaydı Ekle
          </h1>

          {message && (
            <div className="mb-6 p-4 bg-blue-100 text-blue-800 rounded-xl font-semibold">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block mb-2 font-bold">
                Takım Seç
              </label>

              <select
                value={toolId}
                onChange={(e) => setToolId(e.target.value)}
                className="w-full border p-4 rounded-xl"
                required
              >
                <option value="">
                  Takım seçiniz
                </option>

                {tools.map((tool) => (
                  <option key={tool.id} value={tool.id}>
                    {tool.toolName} - Kalan Ömür: {tool.remainingLifeMinute} dk
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 font-bold">
                Kullanım Süresi / Dakika
              </label>

              <input
                type="number"
                value={usedMinute}
                onChange={(e) => setUsedMinute(e.target.value)}
                className="w-full border p-4 rounded-xl"
                placeholder="Örn: 120"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-800 text-white p-4 rounded-xl font-bold"
            >
              Kullanımı Kaydet
            </button>
          </form>

          <div className="mt-6 flex gap-3">
            <a
              href="/tools"
              className="bg-blue-600 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold"
            >
              Takımlar
            </a>

            <a
              href="/usage-logs"
              className="bg-gray-900 hover:bg-gray-700 text-white px-5 py-3 rounded-xl font-bold"
            >
              Kullanım Geçmişi
            </a>
          </div>
        </div>
      </div>
    </>
  );
}