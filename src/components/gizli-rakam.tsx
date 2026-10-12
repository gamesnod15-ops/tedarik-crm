"use client";

import { createContext, useContext, useState } from "react";

const GizliContext = createContext<{ gizli: boolean; degistir: () => void }>({ gizli: false, degistir: () => {} });

/**
 * Finansal rakamları göz düğmesiyle gizleyip gösterir. Sayfa her açıldığında rakamlar gizli başlar
 * (ekran başkasının gözü önündeyken tutarlar görünmesin diye seçim hatırlanmaz).
 */
export function GizliRakamProvider({ children }: { children: React.ReactNode }) {
  const [gizli, setGizli] = useState(true);
  return <GizliContext.Provider value={{ gizli, degistir: () => setGizli((g) => !g) }}>{children}</GizliContext.Provider>;
}

export function Rakam({ value }: { value: string }) {
  const { gizli } = useContext(GizliContext);
  return gizli ? <span aria-label="Gizli tutar">••••••</span> : <>{value}</>;
}

export function GozButonu({ className }: { className?: string }) {
  const { gizli, degistir } = useContext(GizliContext);
  const label = gizli ? "Rakamları göster" : "Rakamları gizle";
  return (
    <button type="button" onClick={degistir} className={className} aria-label={label} title={label} aria-pressed={!gizli}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {gizli ? (
          <>
            <path d="M3 3l18 18" />
            <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </>
        ) : (
          <>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
      </svg>
    </button>
  );
}
