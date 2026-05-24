"use client";

import { useEffect, useState } from "react";
import api from "@/app/services/api";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

export default function EditToolPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [toolName, setToolName] = useState("");
  const [toolType, setToolType] = useState("");
  const [totalLifeMinute, setTotalLifeMinute] = useState("");
  const [remainingLifeMinute, setRemainingLifeMinute] = useState("");
  const [stock, setStock] = useState("");
  const [criticalStock, setCriticalStock] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/Tool/${id}`)
      .then((response) => {
        const tool = response.data;

        setToolName(tool.toolName);
        setToolType(tool.toolType);
        setTotalLifeMinute(String(tool.totalLifeMinute));
        setRemainingLifeMinute(String(tool.remainingLifeMinute));
        setStock(String(tool.stock));
        setCriticalStock(String(tool.criticalStock));
      })
      .catch((error) => {
        console.error(error);
        toast.error("Takım bilgileri yüklenemedi!");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedTool = {
      id: Number(id),
      toolName,
      toolType,
      totalLifeMinute: Number(totalLifeMinute),
      remainingLifeMinute: Number(remainingLifeMinute),
      stock: Number(stock),
      criticalStock: Number(criticalStock),
    };

    try {
      await api.put(`/Tool/${id}`, updatedTool);

      setMessage("Takım başarıyla güncellendi.");
      toast.success("Takım başarıyla güncellendi!");

      setTimeout(() => {
        router.push("/tools");
      }, 1000);
    } catch (error) {
      console.error(error);
      setMessage("Güncelleme başarısız.");
      toast.error("Güncelleme başarısız!");
    }
  };

  if (isLoading) {
    return (
      <>
        <Toaster position="top-right" />

        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Takım bilgileri yükleniyor...
            </h1>

            <p className="text-gray-500">
              Lütfen bekleyiniz.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-screen bg-gray-100 p-10">
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow">
          <h1 className="text-3xl font-bold mb-8">
            Takım Güncelle
          </h1>

          {message && (
            <div className="mb-6 p-4 bg-blue-100 rounded-lg">
              {message}
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-5">
            <div>
              <label className="block mb-2 font-semibold">
                Takım Adı
              </label>

              <input
                type="text"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                className="w-full border p-3 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold">
                Takım Tipi
              </label>

              <input
                type="text"
                value={toolType}
                onChange={(e) => setToolType(e.target.value)}
                className="w-full border p-3 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold">
                Toplam Ömür
              </label>

              <input
                type="number"
                value={totalLifeMinute}
                onChange={(e) => setTotalLifeMinute(e.target.value)}
                className="w-full border p-3 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold">
                Kalan Ömür
              </label>

              <input
                type="number"
                value={remainingLifeMinute}
                onChange={(e) => setRemainingLifeMinute(e.target.value)}
                className="w-full border p-3 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold">
                Stok
              </label>

              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full border p-3 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold">
                Kritik Stok
              </label>

              <input
                type="number"
                value={criticalStock}
                onChange={(e) => setCriticalStock(e.target.value)}
                className="w-full border p-3 rounded-lg"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-800 text-white p-4 rounded-xl font-bold"
            >
              Güncelle
            </button>
          </form>
        </div>
      </div>
    </>
  );
}