"use client";

import { useState } from "react";
import { Modal } from "./modal";

/**
 * Tablo hücresinde uzun metnin ilk `sinir` karakterini gösterir; daha uzunsa "…" düğmesiyle tamamı pencerede açılır.
 * Satır sonları pencerede korunur.
 */
export function UzunMetin({ metin, baslik, sinir = 60 }: { metin: string | null | undefined; baslik: string; sinir?: number }) {
  const [acik, setAcik] = useState(false);
  const t = (metin ?? "").trim();
  if (!t) return <>—</>;
  const tekSatir = t.replace(/\s+/g, " ");
  if (tekSatir.length <= sinir) return <span className="whitespace-normal break-words">{tekSatir}</span>;

  return (
    <span className="whitespace-normal break-words">
      {tekSatir.slice(0, sinir).trimEnd()}
      <button
        type="button"
        onClick={() => setAcik(true)}
        title="Tamamını göster"
        aria-label="Açıklamanın tamamını göster"
        className="ml-1 rounded px-1 font-semibold text-petrol-700 hover:bg-slate-100"
      >
        …
      </button>
      <Modal open={acik} onClose={() => setAcik(false)} title={baslik}>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{t}</p>
      </Modal>
    </span>
  );
}
