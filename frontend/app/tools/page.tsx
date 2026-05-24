"use client";

import { useEffect, useState } from "react";
import api from "@/app/services/api";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

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

export default function ToolsPage() {
  const router = useRouter(); 

  const [tools, setTools] = useState<Tool[]>([]);
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const confirmDelete = async () => {
  if (deleteId === null) return;

  try {
    await api.delete(`/Tool/${deleteId}`);

    setTools(tools.filter((x) => x.id !== deleteId));

    setDeleteId(null);

    toast.success("Takım başarıyla silindi!");
  } catch (error) {
    console.error(error);
    toast.error("Silme işlemi başarısız!");
  }
};

useEffect(() => {
  const storedUser = localStorage.getItem("user");

  if (storedUser) {
    setUser(JSON.parse(storedUser));
  }

api.get("/Tool")
    .then((response) => {
      setTools(response.data);
    })
    .catch((error) => {
      console.error(error);
    });
}, []);

  const toolTypes = Array.from(
    new Set(tools.map((tool) => tool.toolType))
  );

  const isAdmin = user?.role === "Admin";
  const filteredTools = tools.filter((tool) => {
    const matchesSearch = tool.toolName
      .toLowerCase()
      .includes(searchText.toLowerCase());

    const matchesType =
      typeFilter === "" || tool.toolType === typeFilter;

    const matchesCritical =
      !showCriticalOnly ||
      tool.stock <= tool.criticalStock;

    return matchesSearch && matchesType && matchesCritical;
  });

  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-screen bg-gray-100 p-10">

        <div className="flex justify-between items-center mb-8">

          <h1 className="text-4xl font-bold">
            Takım Listesi
          </h1>

          <div className="flex gap-3">

            <a
              href="/"
              className="bg-gray-900 hover:bg-gray-700 text-white px-5 py-3 rounded-xl font-bold"
            >
              Dashboard
            </a>


 {isAdmin && (
  <a
    href="/tools/create"
    className="bg-green-600 hover:bg-green-800 text-white px-5 py-3 rounded-xl font-bold"
  >
    Yeni Takım Ekle
  </a>
)}

          </div>

        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-8">

          <div className="grid grid-cols-4 gap-4">

            <input
              type="text"
              placeholder="Takım adı ara..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="border p-3 rounded-xl"
            />

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border p-3 rounded-xl"
            >
              <option value="">
                Tüm Tipler
              </option>

              {toolTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-3 font-bold">

              <input
                type="checkbox"
                checked={showCriticalOnly}
                onChange={(e) =>
                  setShowCriticalOnly(e.target.checked)
                }
                className="w-5 h-5"
              />

              Kritik stoktakiler

            </label>

            <button
              onClick={() => {
                setSearchText("");
                setTypeFilter("");
                setShowCriticalOnly(false);
              }}
              className="bg-gray-200 hover:bg-gray-300 p-3 rounded-xl font-bold"
            >
              Filtreleri Temizle
            </button>

          </div>

        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">

          <table className="w-full">

            <thead className="bg-gray-900 text-white">

              <tr>
                <th className="p-4 text-left">ID</th>
                <th className="p-4 text-left">Takım Adı</th>
                <th className="p-4 text-left">Tip</th>
                <th className="p-4 text-left">Toplam Ömür</th>
                <th className="p-4 text-left">Kalan Ömür</th>
                <th className="p-4 text-left">Stok</th>
                <th className="p-4 text-left">Kritik Stok</th>
{isAdmin && (
  <th className="p-4 text-left">İşlemler</th>
)}
              </tr>

            </thead>

            <tbody>

              {filteredTools.map((tool) => (

                <tr
                  key={tool.id}

                  className={`border-b font-semibold ${
                    tool.stock <= tool.criticalStock
                      ? "bg-red-100 text-gray-900"
                      : "bg-white text-gray-800"
                  }`}
                >

                  <td className="p-4">
                    {tool.id}
                  </td>

                  <td className="p-4">
                    {tool.toolName}
                  </td>

                  <td className="p-4">
                    {tool.toolType}
                  </td>

                  <td className="p-4">
                    {tool.totalLifeMinute} dk
                  </td>

                  <td className="p-4 font-bold">

                    {tool.remainingLifeMinute < 200 ? (
                      <span className="text-red-600">
                        {tool.remainingLifeMinute} dk
                      </span>
                    ) : (
                      <span className="text-green-600">
                        {tool.remainingLifeMinute} dk
                      </span>
                    )}

                  </td>

                  <td className="p-4 font-bold">

                    {tool.stock <= tool.criticalStock ? (
                      <span className="text-red-600">
                        {tool.stock}
                      </span>
                    ) : (
                      <span className="text-green-600">
                        {tool.stock}
                      </span>
                    )}

                  </td>

                  <td className="p-4">
                    {tool.criticalStock}
                  </td>

{isAdmin && (
  <td className="p-4">
<button
  type="button"
  onClick={() => router.push(`/tools/edit/${tool.id}`)}
  className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mr-2"
>
  Düzenle
</button>

    <button
      onClick={() => setDeleteId(tool.id)}
      className="bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
    >
      Sil
    </button>
  </td>
)}

                </tr>

              ))}

            </tbody>

          </table>

          {filteredTools.length === 0 && (
            <div className="p-8 text-center text-gray-500 font-bold">
              Kayıt bulunamadı.
            </div>
          )}

        </div>

        {deleteId !== null && (

          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">

              <h2 className="text-2xl font-bold mb-4">
                Silme Onayı
              </h2>

              <p className="text-gray-700 mb-8">
                Bu takımı silmek istediğinize emin misiniz?
                Bu işlem geri alınamaz.
              </p>

              <div className="flex justify-end gap-3">

                <button
                  onClick={() => setDeleteId(null)}
                  className="bg-gray-200 hover:bg-gray-300 px-5 py-3 rounded-xl font-bold"
                >
                  Vazgeç
                </button>

                <button
onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-800 text-white px-5 py-3 rounded-xl font-bold"
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