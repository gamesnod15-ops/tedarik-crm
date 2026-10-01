"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ovox.theme";

function apply(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

/**
 * Açık / koyu tema düğmesi. Seçim tarayıcıda hatırlanır; hiç seçilmediyse bilgisayarın temasını izler.
 * Sayfa ilk çizilmeden önce doğru tema layout'taki küçük betikle uygulanır (yanıp sönme olmaz).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));

    // Seçim yapılmadıysa sistem teması değişince arayüz de değişir.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = (e: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem(STORAGE_KEY)) return;
      } catch {}
      apply(e.matches);
      setDark(e.matches);
    };
    media.addEventListener("change", onSystem);

    // Yazdırırken (PDF) her zaman açık tema kullanılır, sonra eski haline dönülür.
    let restore = false;
    const before = () => {
      restore = document.documentElement.classList.contains("dark");
      if (restore) apply(false);
    };
    const after = () => {
      if (restore) apply(true);
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);

    return () => {
      media.removeEventListener("change", onSystem);
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    apply(next);
    setDark(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {}
  }

  const label = dark ? "Açık temaya geç" : "Koyu temaya geç";

  return (
    <button type="button" onClick={toggle} className={className} aria-label={label} title={label} aria-pressed={dark ?? false}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        )}
      </svg>
    </button>
  );
}
