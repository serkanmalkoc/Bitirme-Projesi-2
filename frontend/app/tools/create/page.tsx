"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

export default function CreateToolPage() {
  const router = useRouter();

  const [toolName, setToolName] = useState("");
  const [toolType, setToolType] = useState("");
  const [totalLifeMinute, setTotalLifeMinute] = useState("");
  const [stock, setStock] = useState("");
  const [criticalStock, setCriticalStock] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newTool = {
      toolName: toolName,
      toolType: toolType,
      totalLifeMinute: Number(totalLifeMinute),
      remainingLifeMinute: Number(totalLifeMinute),
      stock: Number(stock),
      criticalStock: Number(criticalStock),
    };

    try {
      await axios.post("https://localhost:7085/api/Tool", newTool);

      setMessage("Takım başarıyla eklendi.");
      toast.success("Takım başarıyla eklendi!");
      

      setTimeout(() => {
        router.push("/tools");
      }, 1000);
    } catch (error) {
      console.error(error);
      setMessage("Takım eklenirken hata oluştu.");
      toast.error("Takım eklenirken hata oluştu!");
    }
  };

  return (
    <>
<Toaster position="top-right" />
    <div className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow">
        <h1 className="text-3xl font-bold mb-8">
          Yeni Takım Ekle
        </h1>

        {message && (
          <div className="mb-6 p-4 bg-blue-100 rounded-lg">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-2 font-semibold">
              Takım Adı
            </label>
            <input
              type="text"
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              className="w-full border p-3 rounded-lg"
              placeholder="Örn: Freze Ucu"
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
              placeholder="Örn: Kesici"
              required
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">
              Toplam Ömür / Dakika
            </label>
            <input
              type="number"
              value={totalLifeMinute}
              onChange={(e) => setTotalLifeMinute(e.target.value)}
              className="w-full border p-3 rounded-lg"
              placeholder="Örn: 1000"
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
              placeholder="Örn: 15"
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
              placeholder="Örn: 5"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gray-900 text-white p-4 rounded-xl font-bold hover:bg-gray-700"
          >
            Takımı Kaydet
          </button>
        </form>
      </div>
    </div>
    </>
  );
}