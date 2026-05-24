"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [isChecking, setIsChecking] = useState(true);

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      if (!isLoginPage) {
        router.replace("/login");
      }

      setIsChecking(false);
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      if (!user.token && !user.Token) {
        localStorage.removeItem("user");

        if (!isLoginPage) {
          router.replace("/login");
        }

        setIsChecking(false);
        return;
      }

      if (isLoginPage) {
        router.replace("/");
        setIsChecking(false);
        return;
      }

      setIsChecking(false);
    } catch (error) {
      console.error(error);

      localStorage.removeItem("user");

      if (!isLoginPage) {
        router.replace("/login");
      }

      setIsChecking(false);
    }
  }, [pathname, router, isLoginPage]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Kontrol ediliyor...
          </h1>

          <p className="text-gray-500">
            Oturum bilgisi doğrulanıyor.
          </p>
        </div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <main className="ml-72 w-full">
        {children}
      </main>
    </div>
  );
}