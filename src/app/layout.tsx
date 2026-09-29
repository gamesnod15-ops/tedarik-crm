import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ovox CRM",
  description: "Tedarik süreçleri yönetim uygulaması",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
