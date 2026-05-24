"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import {
  LayoutDashboard,
  Wrench,
  PlusCircle,
  Clock3,
  History,
  FileText,
  LogOut,
  UserCircle,
  ShieldCheck,
  Activity,
  ChevronRight,
} from "lucide-react";

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
    roles: ["admin", "operator"],
    icon: LayoutDashboard,
    description: "Genel durum",
  },
  {
    title: "Takımlar",
    href: "/tools",
    roles: ["admin", "operator"],
    icon: Wrench,
    description: "Takım listesi",
  },
  {
    title: "Takım Ekle",
    href: "/tools/create",
    roles: ["admin"],
    icon: PlusCircle,
    description: "Yeni takım kaydı",
  },
  {
    title: "Kullanım Ekle",
    href: "/add-usage",
    roles: ["admin", "operator"],
    icon: Clock3,
    description: "Takım ömrü düşür",
  },
  {
    title: "Kullanım Geçmişi",
    href: "/usage-logs",
    roles: ["admin", "operator"],
    icon: History,
    description: "Geçmiş kayıtlar",
  },
  {
    title: "Raporlar",
    href: "/reports",
    roles: ["admin"],
    icon: FileText,
    description: "Analiz ve çıktı",
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
    userRole ? item.roles.includes(userRole) : false
  );

  const isActiveMenu = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const roleLabel =
    userRole === "admin"
      ? "Admin Yetkisi"
      : userRole === "operator"
      ? "Operator Yetkisi"
      : "Kullanıcı";

  const roleStyle =
    userRole === "admin"
      ? "bg-blue-500/15 text-blue-300 border-blue-500/20"
      : "bg-green-500/15 text-green-300 border-green-500/20";

  return (
    <aside className="w-80 bg-slate-950 text-white fixed h-screen p-5 flex flex-col border-r border-slate-800">
      <div className="mb-7">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-950/40">
            TR
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Tool Room
            </h1>

            <p className="text-slate-400 text-sm font-medium mt-1">
              CNC Yönetim Paneli
            </p>
          </div>
        </div>
      </div>

      {user && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 mb-6 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between mb-5">
            <p className="text-slate-500 text-xs font-black uppercase tracking-wider">
              Oturum Bilgisi
            </p>

            <ShieldCheck size={20} className="text-green-400" />
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center border border-slate-700">
              <UserCircle size={30} className="text-blue-300" />
            </div>

            <div className="min-w-0">
              <p className="font-black text-white truncate">
                {user.fullName || "Kullanıcı"}
              </p>

              <p className="text-slate-400 text-sm truncate mt-1">
                @{user.username}
              </p>
            </div>
          </div>

          <div
            className={`mt-5 border rounded-2xl px-4 py-3 text-sm font-black w-fit ${roleStyle}`}
          >
            {roleLabel}
          </div>
        </div>
      )}

      <nav className="space-y-2 flex-1 overflow-y-auto pr-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveMenu(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center justify-between gap-3 p-4 rounded-2xl font-bold transition border ${
                isActive
                  ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-950/40"
                  : "bg-slate-900/50 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-slate-700"
                  }`}
                >
                  <Icon size={23} />
                </div>

                <div className="min-w-0">
                  <p className="leading-tight truncate">
                    {item.title}
                  </p>

                  <p
                    className={`text-xs mt-1 font-semibold truncate ${
                      isActive ? "text-blue-100" : "text-slate-500"
                    }`}
                  >
                    {item.description}
                  </p>
                </div>
              </div>

              <ChevronRight
                size={19}
                className={`transition ${
                  isActive
                    ? "text-white"
                    : "text-slate-600 group-hover:text-slate-300"
                }`}
              />
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 space-y-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-slate-500 text-xs font-black uppercase tracking-wider">
                Sistem Durumu
              </p>

              <p className="text-green-400 font-black mt-1">
                Aktif ve Çalışıyor
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <Activity size={24} className="text-green-400" />
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full bg-red-600 hover:bg-red-700 text-white p-4 rounded-2xl font-black transition shadow-lg shadow-red-950/30 flex items-center justify-center gap-3"
        >
          <LogOut size={22} />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}