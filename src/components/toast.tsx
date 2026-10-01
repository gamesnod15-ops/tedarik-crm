"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type Tone = "success" | "error" | "info";
type Toast = { id: number; tone: Tone; message: string };

type Api = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<Api | null>(null);

const DURATION: Record<Tone, number> = { success: 4000, info: 4000, error: 7000 };

const STYLES: Record<Tone, { box: string; icon: string; path: string }> = {
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-900", icon: "text-emerald-600", path: "M5 12.5l4.5 4.5L19 7.5" },
  error: { box: "border-red-200 bg-red-50 text-red-900", icon: "text-red-600", path: "M12 8v5m0 3.5h.01M10.3 3.9L2.5 17.5A2 2 0 0 0 4.2 20.5h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" },
  info: { box: "border-petrol-200 bg-petrol-50 text-petrol-900", icon: "text-petrol-600", path: "M12 11v5m0-8.5h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (tone: Tone, message: string) => {
      const id = nextId.current++;
      // Aynı mesaj üst üste gelirse tekrarlanmaz.
      setToasts((t) => (t.some((x) => x.message === message && x.tone === tone) ? t : [...t.slice(-3), { id, tone, message }]));
      timers.current.set(id, setTimeout(() => dismiss(id), DURATION[tone]));
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  const api = useMemo<Api>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 print:hidden">
        {toasts.map((t) => {
          const s = STYLES[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${s.box}`}
            >
              <svg viewBox="0 0 24 24" className={`mt-0.5 h-5 w-5 shrink-0 ${s.icon}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={s.path} />
              </svg>
              <p className="flex-1">{t.message}</p>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Kapat" className="-mr-1 rounded p-0.5 opacity-60 hover:opacity-100">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Api {
  const ctx = useContext(ToastContext);
  // Provider dışında çağrılırsa (ör. giriş sayfası) sessizce hiçbir şey yapmaz.
  return ctx ?? { success: () => {}, error: () => {}, info: () => {} };
}

const FLASH: Record<string, string> = {
  kaydedildi: "Kaydedildi.",
  silindi: "Silindi.",
};

/** Sunucu yönlendirmesinden sonra (?flash=kaydedildi) toast gösterir ve parametreyi adres çubuğundan temizler. */
export function FlashToast() {
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const flash = sp.get("flash");

  useEffect(() => {
    if (!flash) return;
    const message = FLASH[flash];
    if (message) toast.success(message);
    const next = new URLSearchParams(sp.toString());
    next.delete("flash");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [flash, sp, pathname, router, toast]);

  return null;
}
