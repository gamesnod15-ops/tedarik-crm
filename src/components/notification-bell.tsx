"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  clearReadNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/(app)/notifications";

export type NotificationItem = {
  id: string;
  tur: "BILGI" | "BASARI" | "UYARI" | "HATA";
  baslik: string;
  mesaj: string | null;
  href: string | null;
  read: boolean;
  zaman: string;
};

const DOT: Record<NotificationItem["tur"], string> = {
  BILGI: "bg-petrol-500",
  BASARI: "bg-emerald-500",
  UYARI: "bg-amber-500",
  HATA: "bg-red-500",
};

const REFRESH_MS = 60_000;

export function NotificationBell({ unread, items }: { unread: number; items: NotificationItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Yeni bildirimler için sayfa açıkken dakikada bir yenilenir (sekme görünürse).
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, [router]);

  function openItem(n: NotificationItem) {
    setOpen(false);
    startTransition(async () => {
      if (!n.read) await markNotificationReadAction(n.id);
      if (n.href) router.push(n.href);
    });
  }

  const hasRead = items.some((i) => i.read);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread > 0 ? `Bildirimler, ${unread} okunmamış` : "Bildirimler"}
        title="Bildirimler"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-petrol-700"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Bildirimler" className="absolute right-0 top-full z-30 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Bildirimler</h2>
            {unread > 0 && (
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(async () => void (await markAllNotificationsReadAction()))}
                className="text-xs font-medium text-petrol-700 hover:underline disabled:opacity-50"
              >
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-10 text-center text-sm text-slate-400">Bildirim yok.</li>}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 ${n.read ? "" : "bg-petrol-50/50"}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-slate-300" : DOT[n.tur]}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${n.read ? "text-slate-600" : "font-medium text-slate-900"}`}>{n.baslik}</span>
                    {n.mesaj && <span className="mt-0.5 block text-xs text-slate-500">{n.mesaj}</span>}
                    <span className="mt-1 block text-xs text-slate-400">{n.zaman}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {hasRead && (
            <div className="border-t border-slate-100 px-4 py-2 text-right">
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(async () => void (await clearReadNotificationsAction()))}
                className="text-xs text-slate-500 hover:text-red-600 hover:underline disabled:opacity-50"
              >
                Okunanları temizle
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
