import type { MetadataRoute } from "next";

/** Telefona "uygulama" olarak eklenebilmesi için PWA bilgileri (/manifest.webmanifest). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Tuşba Nakış",
    short_name: "Tuşba Nakış",
    description: "Cari, sipariş, finans ve personel takibi",
    lang: "tr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Yeni sipariş", url: "/siparisler/yeni", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Tahsilat / ödeme", url: "/finans?tip=ODEME&yeni=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Cariler", url: "/cariler", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
