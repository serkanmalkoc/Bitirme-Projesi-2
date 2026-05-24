"use client";

import { useEffect, useState } from "react";
import axios from "axios";

type Tool = {
  id: number;
  toolName: string;
  toolType: string;
};

type UsageLog = {
  id: number;
  toolId: number;
  usedMinute: number;
  usageDate: string;
  tool: Tool | null;
};

export default function UsageLogsPage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);

  useEffect(() => {
    axios
      .get("https://localhost:7085/api/ToolUsageLog")
      .then((response) => {
        setLogs(response.data);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-5xl font-bold">
          Kullanım Geçmişi
        </h1>

        <div className="flex gap-3">
          <a
            href="/"
            className="bg-gray-900 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-bold"
          >
            Dashboard
          </a>

          <a
            href="/tools"
            className="bg-blue-600 hover:bg-blue-800 text-white px-6 py-3 rounded-xl font-bold"
          >
            Takımlar
          </a>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900 text-white">
            <tr>
              <th className="p-4 text-left">Log ID</th>
              <th className="p-4 text-left">Takım</th>
              <th className="p-4 text-left">Tip</th>
              <th className="p-4 text-left">Kullanım</th>
              <th className="p-4 text-left">Tarih</th>
              <th className="p-4 text-left">Durum</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                className="border-b hover:bg-gray-50 text-gray-800 font-semibold"
              >
                <td className="p-4">{log.id}</td>

                <td className="p-4">
                  {log.tool?.toolName ?? "Takım silinmiş"}
                </td>

                <td className="p-4">
                  {log.tool?.toolType ?? "-"}
                </td>

                <td className="p-4">
                  <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-bold">
                    {log.usedMinute} dk
                  </span>
                </td>

                <td className="p-4">
                  {new Date(log.usageDate).toLocaleString("tr-TR")}
                </td>

                <td className="p-4">
                  {log.usedMinute >= 120 ? (
                    <span className="bg-red-100 text-red-700 px-4 py-2 rounded-xl font-bold">
                      Yoğun Kullanım
                    </span>
                  ) : (
                    <span className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold">
                      Normal
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}