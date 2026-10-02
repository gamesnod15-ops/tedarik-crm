"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Mobilde tablolar kart görünümüne geçer (CSS: globals.css, table[data-kart]). Her hücreye sütun başlığı etiket olarak yazılır.
 * Form içindeki tablolar (sipariş kalemleri) olduğu gibi kalır.
 */
export function MobileTables() {
  const pathname = usePathname();
  useEffect(() => {
    const isle = () => {
      document.querySelectorAll<HTMLTableElement>("main table").forEach((t) => {
        if (t.closest("form") || t.hasAttribute("data-no-kart")) return;
        const basliklar = [...t.querySelectorAll("thead th")].map((th) => (th.textContent ?? "").trim());
        if (basliklar.length === 0) return;
        t.querySelectorAll("tbody tr").forEach((tr) => {
          [...tr.children].forEach((td, i) => {
            if (td instanceof HTMLElement) {
              const bos = (td.textContent ?? "").trim() === "—";
              if (bos) td.dataset.bos = "1";
              else delete td.dataset.bos;
            }
            if (td instanceof HTMLElement && !td.hasAttribute("colspan") && basliklar[i] && td.dataset.label !== basliklar[i]) td.dataset.label = basliklar[i];
          });
        });
        t.dataset.kart = "1";
      });
    };
    isle();
    const main = document.querySelector("main");
    if (!main) return;
    const mo = new MutationObserver(isle);
    mo.observe(main, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [pathname]);
  return null;
}
