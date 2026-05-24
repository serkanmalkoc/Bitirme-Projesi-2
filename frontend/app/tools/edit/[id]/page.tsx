"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";

export default function EditToolPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id;

  const [toolName, setToolName] = useState("");
  const [toolType, setToolType] = useState("");
  const [totalLifeMinute, setTotalLifeMinute] = useState("");
  const [remainingLifeMinute, setRemainingLifeMinute] = useState("");
  const [stock, setStock] = useState("");
  const [criticalStock, setCriticalStock] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    axios
      .get(`https://localhost:7085/api/Tool/${id}`)
      .then((response) => {
        const tool = response.data;

        setToolName(tool.toolName);
        setToolType(tool.toolType);
        setTotalLifeMinute(tool.totalLifeMinute);
        setRemainingLifeMinute(tool.remainingLifeMinute);
        setStock(tool.stock);
        setCriticalStock(tool.criticalStock);
      })
      .catch((error) => {
        console.error(error);
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
      await axios.put(
        `https://localhost:7085/api/Tool/${id}`,
        updatedTool
      );

      setMessage("Takım başarıyla güncellendi.");

      setTimeout(() => {
        router.push("/tools");
      }, 1000);
    } catch (error) {
      console.error(error);
      setMessage("Güncelleme başarısız.");
    }
  };

  return (
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
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">
              Toplam Ömür
            </label>

            <input
              type="number"
              value={totalLifeMinute}
              onChange={(e) =>
                setTotalLifeMinute(e.target.value)
              }
              className="w-full border p-3 rounded-lg"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">
              Kalan Ömür
            </label>

            <input
              type="number"
              value={remainingLifeMinute}
              onChange={(e) =>
                setRemainingLifeMinute(e.target.value)
              }
              className="w-full border p-3 rounded-lg"
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
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">
              Kritik Stok
            </label>

            <input
              type="number"
              value={criticalStock}
              onChange={(e) =>
                setCriticalStock(e.target.value)
              }
              className="w-full border p-3 rounded-lg"
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
  );
}