import Link from "next/link";
import { ayKaydir, donemAdi, donemKey, parseDonem, type Donem } from "@/lib/ekstre";

/**
 * Dönem seçimi çubuğu: ← Ay →, ay kutusu + Göster, "Tüm hareketler" / "Bu ay".
 * Dönem adreste ?ay=YYYY-MM ya da ?ay=tum olarak taşınır; `params` sayfanın korunması gereken diğer parametreleridir.
 */
export function AySecici({ base, donem, params = {} }: { base: string; donem: Donem; params?: Record<string, string | undefined> }) {
  const href = (ay: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    q.set("ay", ay);
    return `${base}?${q}`;
  };
  const aylik = donem.tip === "AY";

  return (
    <div className="card flex flex-wrap items-center gap-3 p-3 print:hidden">
      {aylik ? (
        <>
          <Link href={href(donemKey(ayKaydir(donem, -1)))} className="btn-secondary px-3" aria-label="Önceki ay">←</Link>
          <span className="min-w-36 text-center text-sm font-semibold text-slate-900">{donemAdi(donem)}</span>
          <Link href={href(donemKey(ayKaydir(donem, 1)))} className="btn-secondary px-3" aria-label="Sonraki ay">→</Link>
        </>
      ) : (
        <span className="text-sm font-semibold text-slate-900">{donemAdi(donem)}</span>
      )}
      <form action={base} className="ml-auto flex items-center gap-2">
        {Object.entries(params).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
        <label className="sr-only" htmlFor="ay">Ay seç</label>
        <input id="ay" name="ay" type="month" defaultValue={aylik ? donemKey(donem) : ""} className="input w-44" />
        <button className="btn-secondary">Göster</button>
      </form>
      {aylik ? (
        <Link href={href("tum")} className="text-sm text-petrol-700 hover:underline">Tüm hareketler</Link>
      ) : (
        <Link href={href(donemKey(parseDonem(undefined, "AY")))} className="text-sm text-petrol-700 hover:underline">Bu ay</Link>
      )}
    </div>
  );
}
