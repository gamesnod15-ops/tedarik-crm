"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/toast";
import type { FormState } from "@/lib/crud";
import { DURUMLAR, DURUM_LABELS, type SiparisDurumu } from "./durum";

type Urun = { id: string; ad: string; birim: string; birimFiyat: string; kdvOrani: number };
type Satir = { urunId: string; adet: string; birimFiyat: string; kdvOrani: string; aciklama: string };

export type SiparisInitial = {
  id?: string;
  cariId: string;
  tarih: string;
  aciklama: string;
  durum: SiparisDurumu;
  kalemler: Satir[];
};

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const money = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const emptyRow = (): Satir => ({ urunId: "", adet: "1", birimFiyat: "", kdvOrani: "", aciklama: "" });

export function SiparisForm({
  tip,
  cariler,
  urunler,
  initial,
  action,
  inline = false,
  onSaved,
  onCancel,
}: {
  tip: "MUSTERI" | "TEDARIKCI";
  cariler: { id: string; unvan: string }[];
  urunler: Urun[];
  initial: SiparisInitial;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  /** true: pencere içinde kullanılır; kayıttan sonra yönlendirme yapılmaz, onSaved çağrılır. */
  inline?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const toast = useToast();
  const [state, formAction, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result?.error) toast.error(result.error);
    else if (result?.ok) toast.success(result.ok);
    return result;
  }, undefined);

  useEffect(() => {
    if (state?.ok) onSaved?.();
  }, [state, onSaved]);
  const [cariId, setCariId] = useState(initial.cariId);
  const [tarih, setTarih] = useState(initial.tarih);
  const [aciklama, setAciklama] = useState(initial.aciklama);
  const [durum, setDurum] = useState<SiparisDurumu>(initial.durum);
  const [rows, setRows] = useState<Satir[]>(initial.kalemler.length ? initial.kalemler : [emptyRow()]);

  const urunById = useMemo(() => new Map(urunler.map((u) => [u.id, u])), [urunler]);

  const satirlar = rows.map((r) => {
    const ara = round2(num(r.adet) * num(r.birimFiyat));
    const toplam = round2(num(r.adet) * num(r.birimFiyat) * (100 + num(r.kdvOrani)) / 100);
    return { ara, kdv: round2(toplam - ara), toplam };
  });
  const ara = satirlar.reduce((s, r) => s + r.ara, 0);
  const kdv = satirlar.reduce((s, r) => s + r.kdv, 0);
  const genel = satirlar.reduce((s, r) => s + r.toplam, 0);

  function update(i: number, patch: Partial<Satir>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function pickUrun(i: number, urunId: string) {
    const u = urunById.get(urunId);
    update(i, u ? { urunId, birimFiyat: u.birimFiyat, kdvOrani: String(u.kdvOrani) } : { urunId });
  }

  const cariLabel = tip === "MUSTERI" ? "Müşteri" : "Tedarikçi";

  return (
    <form action={formAction} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="tip" value={tip} />
      {inline && <input type="hidden" name="inline" value="1" />}
      <input type="hidden" name="kalemler" value={JSON.stringify(rows)} />

      <div className="card grid gap-4 p-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="cariId">{cariLabel} <span className="text-red-600">*</span></label>
          <select id="cariId" name="cariId" value={cariId} onChange={(e) => setCariId(e.target.value)} required className="input">
            <option value="">{cariLabel} seçin…</option>
            {cariler.map((c) => <option key={c.id} value={c.id}>{c.unvan}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="tarih">Tarih <span className="text-red-600">*</span></label>
          <input id="tarih" name="tarih" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="durum">Durum</label>
          <select id="durum" name="durum" value={durum} onChange={(e) => setDurum(e.target.value as SiparisDurumu)} className="input">
            {DURUMLAR.map((d) => <option key={d} value={d}>{DURUM_LABELS[d]}</option>)}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className="label" htmlFor="aciklama">Açıklama</label>
          <textarea id="aciklama" name="aciklama" rows={1} value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="İsteğe bağlı not" className="input" />
        </div>
      </div>

      {urunler.length === 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Henüz ürün tanımlı değil. Sipariş girebilmek için önce{" "}
          <Link href="/urunler" target={inline ? "_blank" : undefined} className="font-semibold underline">Ürünler</Link> sayfasından ürün ekleyin
          {inline ? " (bu pencereyi kapatıp yeniden açın)." : "."}
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th min-w-56">Ürün</th>
              <th className="th w-28">Adet</th>
              <th className="th w-32">Birim fiyat</th>
              <th className="th w-24">KDV %</th>
              <th className="th w-36 text-right">Satır toplamı</th>
              <th className="th w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="td">
                  <select value={r.urunId} onChange={(e) => pickUrun(i, e.target.value)} required aria-label="Ürün" className="input">
                    <option value="">Ürün seçin…</option>
                    {urunler.map((u) => <option key={u.id} value={u.id}>{u.ad} ({u.birim})</option>)}
                  </select>
                </td>
                <td className="td">
                  <input type="number" step="0.001" min="0" value={r.adet} onChange={(e) => update(i, { adet: e.target.value })} required aria-label="Adet" placeholder="Adet" className="input" />
                </td>
                <td className="td">
                  <input type="number" step="0.01" min="0" value={r.birimFiyat} onChange={(e) => update(i, { birimFiyat: e.target.value })} required aria-label="Birim fiyat" placeholder="0,00" className="input" />
                </td>
                <td className="td">
                  <input type="number" step="1" min="0" max="100" value={r.kdvOrani} onChange={(e) => update(i, { kdvOrani: e.target.value })} required aria-label="KDV oranı" placeholder="KDV %" className="input" />
                </td>
                <td className="td text-right font-medium tabular-nums">{money.format(satirlar[i].toplam)} TL</td>
                <td className="td">
                  {rows.length > 1 && (
                    <button type="button" onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))} aria-label="Satırı sil" className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-slate-100 p-3">
          <button type="button" onClick={() => setRows((p) => [...p, emptyRow()])} className="text-sm font-medium text-petrol-700 hover:underline">
            + Satır ekle
          </button>
        </div>
      </div>

      <div className="ml-auto w-full max-w-xs space-y-1 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <div className="flex justify-between text-slate-600"><span>Ara toplam</span><span className="tabular-nums">{money.format(ara)} TL</span></div>
        <div className="flex justify-between text-slate-600"><span>KDV</span><span className="tabular-nums">{money.format(kdv)} TL</span></div>
        <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-semibold text-slate-900"><span>Genel toplam</span><span className="tabular-nums">{money.format(genel)} TL</span></div>
      </div>

      {state?.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn-primary">{pending ? "Kaydediliyor…" : initial.id ? "Güncelle" : "Kaydet"}</button>
        {inline ? (
          <button type="button" onClick={onCancel} className="btn-secondary">Vazgeç</button>
        ) : (
          <Link href={`/siparisler?tip=${tip}`} className="btn-secondary">Vazgeç</Link>
        )}
      </div>
    </form>
  );
}
