import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./components/AppShell";

export const metadata: Metadata = {
  title: "Tool Room Management",
  description: "CNC Takım Ömrü ve Stok Yönetim Sistemi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}