"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Package,
  ShieldAlert,
  ShoppingCart,
  User,
  Wallet,
  Wrench,
  X,
  ClipboardCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

type UserInfo = {
  id?: number;
  fullName?: string;
  username?: string;
  role?: string;
  token?: string;
  Token?: string;
  accessToken?: string;
  AccessToken?: string;
};

type MenuItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
};

const allMenuItems: MenuItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: Home,
    roles: ["Admin", "Operator"],
  },
  {
    title: "Takımlar",
    href: "/tools",
    icon: Wrench,
    roles: ["Admin", "Operator"],
  },
  {
    title: "Kullanım Kayıtları",
    href: "/usage-logs",
    icon: ClipboardList,
    roles: ["Admin", "Operator"],
  },
  {
    title: "Uyarılar",
    href: "/alerts",
    icon: ShieldAlert,
    roles: ["Admin", "Operator"],
  },
  {
    title: "Satın Alma",
    href: "/purchases",
    icon: ShoppingCart,
    roles: ["Admin"],
  },
  {
  title: "Bakım Planları",
  href: "/maintenance",
  icon: ClipboardCheck,
  roles: ["Admin", "Operator"],
  },
  {
    title: "Raporlar",
    href: "/reports",
    icon: BarChart3,
    roles: ["Admin", "Operator"],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<UserInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      setUser(null);
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    } catch {
      localStorage.removeItem("user");
      setUser(null);
    }
  }, []);

  const userRole = user?.role || "";

  const menuItems = allMenuItems.filter((item) => {
    if (!item.roles || item.roles.length === 0) {
      return true;
    }

    if (!userRole) {
      return false;
    }

    return item.roles
      .map((role) => role.toLowerCase())
      .includes(userRole.toLowerCase());
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  const isActiveMenu = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(href);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-5 left-5 z-50 bg-slate-950 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
      >
        <Menu size={24} />
      </button>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-[290px] bg-slate-950 text-white shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                  <Activity size={25} />
                </div>

                <div>
                  <h1 className="text-xl font-black leading-tight">
                    CNC ToolRoom
                  </h1>

                  <p className="text-xs text-slate-400 font-semibold">
                    Yönetim Paneli
                  </p>
                </div>
              </Link>

              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          <div className="p-5 border-b border-white/10">
            <div className="bg-white/10 border border-white/10 rounded-3xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-blue-300">
                  <User size={22} />
                </div>

                <div className="min-w-0">
                  <p className="font-black truncate">
                    {user?.fullName || user?.username || "Kullanıcı"}
                  </p>

                  <p className="text-sm text-slate-400 font-semibold">
                    {user?.role || "Rol yok"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-5 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActiveMenu(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-black transition ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={22} />

                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-5 border-t border-white/10">
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white/10 rounded-2xl p-3 text-center">
                <Package size={20} className="mx-auto text-blue-300 mb-1" />
                <p className="text-[10px] text-slate-400 font-bold">Stok</p>
              </div>

              <div className="bg-white/10 rounded-2xl p-3 text-center">
                <Wallet size={20} className="mx-auto text-emerald-300 mb-1" />
                <p className="text-[10px] text-slate-400 font-bold">Finans</p>
              </div>

              <div className="bg-white/10 rounded-2xl p-3 text-center">
                <Bell size={20} className="mx-auto text-red-300 mb-1" />
                <p className="text-[10px] text-slate-400 font-bold">Uyarı</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-2xl py-4 font-black transition flex items-center justify-center gap-2"
            >
              <LogOut size={21} />
              Çıkış Yap
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}