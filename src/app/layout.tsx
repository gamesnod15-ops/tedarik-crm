import type { Metadata, Viewport } from "next";
import { InstallPrompt } from "@/components/install-prompt";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ovox CRM",
  description: "Tedarik süreçleri yönetim uygulaması",
  applicationName: "Ovox CRM",
  // iPhone'da "Ana Ekrana Ekle" ile tam ekran uygulama gibi açılır.
  appleWebApp: { capable: true, title: "Ovox CRM", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

// Telefonda üst çubuk rengi temaya uyar (açık: beyaz, koyu: koyu header rengi).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#121b2d" },
  ],
};

// Sayfa çizilmeden önce kayıtlı (ya da sistem) temasını uygular: açılışta beyaz ekran yanıp sönmez.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("ovox.theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
