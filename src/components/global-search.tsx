"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AramaSonuc } from "@/app/api/arama/route";

/** Header araması: yazdıkça cari, ürün, sipariş ve personel arar; sonuca tıklayınca ilgili sayfaya gider. */
export function GlobalSearch({ className, icon }: { className?: string; icon: React.ReactNode }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sonuc, setSonuc] = useState<AramaSonuc[]>([]);
  const [open, setOpen] = useState(false);
  const [bitti, setBitti] = useState(false);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setSonuc([]);
      setBitti(false);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/arama?q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        if (!r.ok) return;
        setSonuc((await r.json()).sonuclar);
        setBitti(true);
        setOpen(true);
      } catch {}
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function git(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  const gruplar = [...new Set(sonuc.map((s) => s.grup))];

  return (
    <form
      ref={box}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (sonuc[0]) git(sonuc[0].href);
      }}
      className={`relative ${className ?? ""}`}
    >
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => bitti && setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="Ara…"
        aria-label="Ara"
        autoComplete="off"
        className="input pl-10"
      />
      {open && bitti && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] min-w-[16rem] overflow-y-auto rounded-xl border border-slate-300 bg-white p-1 shadow-lg">
          {sonuc.length === 0 ? (
            <p className="px-3 py-3 text-sm text-slate-500">Sonuç bulunamadı.</p>
          ) : (
            gruplar.map((g) => (
              <div key={g}>
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g}</p>
                {sonuc
                  .filter((s) => s.grup === g)
                  .map((s) => (
                    <button
                      type="button"
                      key={s.href + s.baslik}
                      onClick={() => git(s.href)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <span className="block truncate font-medium">{s.baslik}</span>
                      {s.alt && <span className="block truncate text-xs text-slate-500">{s.alt}</span>}
                    </button>
                  ))}
              </div>
            ))
          )}
        </div>
      )}
    </form>
  );
}
