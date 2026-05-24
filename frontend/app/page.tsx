"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

type DashboardData = {
  totalTools: number;
  criticalStockTools: number;
  lowLifeTools: number;
};

type Tool = {
  id: number;
  toolName: string;
  stock: number;
  criticalStock: number;
  totalLifeMinute: number;
  remainingLifeMinute: number;
};

export default function HomePage() {
  const [data, setData] = useState<DashboardData>();
  const [tools, setTools] = useState<Tool[]>([]);

  useEffect(() => {
    axios
      .get("https://localhost:7085/api/Dashboard")
      .then((response) => {
        setData(response.data);
      })
      .catch((error) => {
        console.error(error);
      });

    axios
      .get("https://localhost:7085/api/Tool")
      .then((response) => {
        setTools(response.data);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  const stockChartData = {
    labels: tools.map((tool) => tool.toolName),
    datasets: [
      {
        label: "Stok",
        data: tools.map((tool) => tool.stock),
        backgroundColor: "rgba(37, 99, 235, 0.7)",
      },
      {
        label: "Kritik Stok",
        data: tools.map((tool) => tool.criticalStock),
        backgroundColor: "rgba(239, 68, 68, 0.7)",
      },
    ],
  };

  const lifeChartData = {
    labels: tools.map((tool) => tool.toolName),
    datasets: [
      {
        label: "Kalan Ömür",
        data: tools.map((tool) => tool.remainingLifeMinute),
        backgroundColor: "rgba(34, 197, 94, 0.7)",
      },
      {
        label: "Toplam Ömür",
        data: tools.map((tool) => tool.totalLifeMinute),
        backgroundColor: "rgba(250, 204, 21, 0.7)",
      },
    ],
  };

  const pieChartData = {
    labels: ["Normal Stok", "Kritik Stok"],
    datasets: [
      {
        data: [
          tools.filter((x) => x.stock > x.criticalStock).length,
          tools.filter((x) => x.stock <= x.criticalStock).length,
        ],
        backgroundColor: [
          "rgba(34, 197, 94, 0.8)",
          "rgba(239, 68, 68, 0.8)",
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-100 p-12">
      <div className="mb-10 pt-4">
        <h1 className="text-5xl font-bold text-gray-900">
          Takım Takip Dashboard
        </h1>

        <p className="text-gray-500 mt-3 text-lg">
          CNC takım ömrü, stok durumu ve kullanım analizleri
        </p>
      </div>

      <div className="grid grid-cols-3 gap-8 mb-10">
        <div className="bg-white p-8 rounded-2xl shadow">
          <h2 className="text-gray-500 text-xl mb-3">
            Toplam Takım
          </h2>

          <p className="text-5xl font-bold text-gray-900">
            {data?.totalTools ?? 0}
          </p>
        </div>

        <div className="bg-red-100 p-8 rounded-2xl shadow">
          <h2 className="text-red-700 text-xl mb-3">
            Kritik Stok
          </h2>

          <p className="text-5xl font-bold text-red-700">
            {data?.criticalStockTools ?? 0}
          </p>
        </div>

        <div className="bg-yellow-100 p-8 rounded-2xl shadow">
          <h2 className="text-yellow-700 text-xl mb-3">
            Kritik Ömür
          </h2>

          <p className="text-5xl font-bold text-yellow-700">
            {data?.lowLifeTools ?? 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-10">
        <div className="bg-white p-8 rounded-2xl shadow">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Stok Durumu
          </h2>

          <Bar data={stockChartData} />
        </div>

        <div className="bg-white p-8 rounded-2xl shadow">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Takım Ömür Durumu
          </h2>

          <Bar data={lifeChartData} />
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow max-w-xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Kritik Stok Oranı
        </h2>

        <Pie data={pieChartData} />
      </div>
    </div>
  );
}