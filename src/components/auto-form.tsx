"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Filtre formu: seçim/tarih değişince hemen, yazı yazılırken kısa bir beklemeden sonra uygulanır (Filtrele düğmesi gerekmez).
 * Boş alanlar adrese yazılmaz, sayfa numarası sıfırlanır. Enter tuşu da çalışır.
 */
export function AutoForm({ className, children }: { className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function apply() {
    if (!form.current) return;
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form.current).entries()) {
      if (typeof value === "string" && value.trim() !== "") params.set(key, value.trim());
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <form
      ref={form}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current);
        apply();
      }}
      onChange={(e) => {
        const t = e.target;
        const yazi = t instanceof HTMLInputElement && (t.type === "text" || t.type === "search");
        clearTimeout(timer.current);
        timer.current = setTimeout(apply, yazi ? 500 : 0);
      }}
    >
      {children}
    </form>
  );
}
