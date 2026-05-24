"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type User = {
  id: number;
  fullName: string;
  username: string;
  role: string;
};

const allMenuItems = [
  {
    title: "Dashboard",
    href: "/",
    roles: ["Admin", "Operator"],
  },
  {
    title: "Takımlar",
    href: "/tools",
    roles: ["Admin", "Operator"],
  },
  {
    title: "Takım Ekle",
    href: "/tools/create",
    roles: ["Admin"],
  },
  {
    title: "Kullanım Ekle",
    href: "/add-usage",
    roles: ["Admin", "Operator"],
  },
  {
    title: "Kullanım Geçmişi",
    href: "/usage-logs",
    roles: ["Admin", "Operator"],
  },
  {
    title: "Raporlar",
    href: "/reports",
    roles: ["Admin"],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

const userRole = user?.role?.toLowerCase();

const menuItems = allMenuItems.filter((item) =>
  userRole
    ? item.roles.map((role) => role.toLowerCase()).includes(userRole)
    : false
);
  return (
    <aside className="w-72 bg-gray-900 text-white p-6 fixed h-screen">
      <h1 className="text-2xl font-bold mb-2">
        Tool Room
      </h1>

      <p className="text-gray-400 text-sm mb-8">
        CNC Takım Yönetim Sistemi
      </p>

      {user && (
        <div className="bg-gray-800 p-4 rounded-xl mb-6">
          <p className="text-sm text-gray-400">
            Giriş yapan
          </p>

          <p className="font-bold">
            {user.fullName}
          </p>

          <p className="text-blue-400 text-sm">
            {user.role}
          </p>
        </div>
      )}

      <nav className="space-y-4">
        {menuItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <a
              key={item.href}
              href={item.href}
              className={`block p-4 rounded-xl font-semibold transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-200"
              }`}
            >
              {item.title}
            </a>
          );
        })}
      </nav>

      <div className="absolute bottom-6 left-6 right-6 space-y-3">
        <div className="bg-gray-800 p-4 rounded-xl">
          <p className="text-sm text-gray-400">
            Sistem Durumu
          </p>

          <p className="text-green-400 font-bold">
            Aktif
          </p>
        </div>

        <button
          onClick={logout}
          className="w-full bg-red-600 hover:bg-red-800 text-white p-3 rounded-xl font-bold"
        >
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}