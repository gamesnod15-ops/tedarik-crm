import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ovox CRM",
  description: "Tedarik süreçleri yönetim uygulaması",
};

// Sayfa çizilmeden önce kayıtlı (ya da sistem) temasını uygular: açılışta beyaz ekran yanıp sönmez.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("ovox.theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
