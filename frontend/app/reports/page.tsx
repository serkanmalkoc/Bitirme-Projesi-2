"use client";

import { useEffect, useState } from "react";
import api from "@/app/services/api";

type DashboardData = {
  totalTools: number;
  criticalStockTools: number;
  lowLifeTools: number;
};

type Tool = {
  id: number;
  toolName: string;
  toolType: string;
  totalLifeMinute: number;
  remainingLifeMinute: number;
  stock: number;
  criticalStock: number;
};

type UsageLog = {
  id: number;
  toolId: number;
  usedMinute: number;
  usageDate: string;
  tool: Tool | null;
};

export default function ReportsPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);

  useEffect(() => {
    api
      .get("/Dashboard")
      .then((response) => {
        setDashboard(response.data);
      })
      .catch((error) => {
        console.error(error);
      });

    api
      .get("/Tool")
      .then((response) => {
        setTools(response.data);
      })
      .catch((error) => {
        console.error(error);
      });

    api
      .get("/ToolUsageLog")
      .then((response) => {
        setLogs(response.data);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  const criticalStockTools = tools.filter(
    (tool) => tool.stock <= tool.criticalStock
  );

  const lowLifeTools = tools.filter(
    (tool) => tool.remainingLifeMinute < 200
  );

  const totalUsedMinute = logs.reduce(
    (total, log) => total + log.usedMinute,
    0
  );

  const lastLogs = [...logs]
    .sort(
      (a, b) =>
        new Date(b.usageDate).getTime() -
        new Date(a.usageDate).getTime()
    )
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-100 p-10 print-area">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-5xl font-bold text-gray-900">
            Raporlar
          </h1>

          <p className="text-gray-500 mt-3 text-lg">
            CNC takım stok, ömür ve kullanım raporları
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="no-print bg-gray-900 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-bold"
        >
          Raporu Yazdır
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-gray-500 font-semibold mb-2">
            Toplam Takım
          </h2>

          <p className="text-4xl font-bold text-gray-900">
            {dashboard?.totalTools ?? 0}
          </p>
        </div>

        <div className="bg-red-100 p-6 rounded-2xl shadow">
          <h2 className="text-red-700 font-semibold mb-2">
            Kritik Stok
          </h2>

          <p className="text-4xl font-bold text-red-700">
            {dashboard?.criticalStockTools ?? 0}
          </p>
        </div>

        <div className="bg-yellow-100 p-6 rounded-2xl shadow">
          <h2 className="text-yellow-700 font-semibold mb-2">
            Kritik Ömür
          </h2>

          <p className="text-4xl font-bold text-yellow-700">
            {dashboard?.lowLifeTools ?? 0}
          </p>
        </div>

        <div className="bg-blue-100 p-6 rounded-2xl shadow">
          <h2 className="text-blue-700 font-semibold mb-2">
            Toplam Kullanım
          </h2>

          <p className="text-4xl font-bold text-blue-700">
            {totalUsedMinute} dk
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-10">
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">
              Kritik Stoktaki Takımlar
            </h2>
          </div>

          <table className="w-full">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="p-4 text-left">Takım</th>
                <th className="p-4 text-left">Tip</th>
                <th className="p-4 text-left">Stok</th>
                <th className="p-4 text-left">Kritik</th>
              </tr>
            </thead>

            <tbody>
              {criticalStockTools.map((tool) => (
                <tr
                  key={tool.id}
                  className="border-b bg-red-50 font-semibold text-gray-900"
                >
                  <td className="p-4">{tool.toolName}</td>
                  <td className="p-4">{tool.toolType}</td>
                  <td className="p-4 text-red-600 font-bold">
                    {tool.stock}
                  </td>
                  <td className="p-4">{tool.criticalStock}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {criticalStockTools.length === 0 && (
            <div className="p-6 text-center text-gray-500 font-bold">
              Kritik stokta takım bulunmuyor.
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">
              Kritik Ömürlü Takımlar
            </h2>
          </div>

          <table className="w-full">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="p-4 text-left">Takım</th>
                <th className="p-4 text-left">Kalan Ömür</th>
                <th className="p-4 text-left">Toplam Ömür</th>
              </tr>
            </thead>

            <tbody>
              {lowLifeTools.map((tool) => (
                <tr
                  key={tool.id}
                  className="border-b bg-yellow-50 font-semibold text-gray-900"
                >
                  <td className="p-4">{tool.toolName}</td>
                  <td className="p-4 text-red-600 font-bold">
                    {tool.remainingLifeMinute} dk
                  </td>
                  <td className="p-4">
                    {tool.totalLifeMinute} dk
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {lowLifeTools.length === 0 && (
            <div className="p-6 text-center text-gray-500 font-bold">
              Kritik ömürlü takım bulunmuyor.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Son Kullanım Kayıtları
          </h2>
        </div>

        <table className="w-full">
          <thead className="bg-gray-900 text-white">
            <tr>
              <th className="p-4 text-left">Log ID</th>
              <th className="p-4 text-left">Takım</th>
              <th className="p-4 text-left">Kullanım</th>
              <th className="p-4 text-left">Tarih</th>
            </tr>
          </thead>

          <tbody>
            {lastLogs.map((log) => (
              <tr
                key={log.id}
                className="border-b font-semibold text-gray-900"
              >
                <td className="p-4">{log.id}</td>

                <td className="p-4">
                  {log.tool?.toolName ?? "Takım silinmiş"}
                </td>

                <td className="p-4 text-blue-600 font-bold">
                  {log.usedMinute} dk
                </td>

                <td className="p-4">
                  {new Date(log.usageDate).toLocaleString("tr-TR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {lastLogs.length === 0 && (
          <div className="p-6 text-center text-gray-500 font-bold">
            Kullanım kaydı bulunmuyor.
          </div>
        )}
      </div>
    </div>
  );
}