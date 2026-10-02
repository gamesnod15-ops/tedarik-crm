"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import type { FormState } from "@/lib/crud";
import { siparisYapistirmaCoz, urunAnahtari } from "@/lib/paste";
import { DURUMLAR, DURUM_LABELS, type SiparisDurumu } from "./durum";
import { sonFiyatlarAction } from "./actions";

type Urun = { id: string; ad: string; birim: string; birimFiyat: string; kdvOrani: number };
/** Ürün siparişe metin olarak yazılır (ürün kartına bağlı değil). oto: fiyat/KDV ürün kartından otomatik dolduruldu (elle değiştirilmedi). */
type Satir = { urunAdi: string; adet: string; birimFiyat: string; kdvOrani: string; aciklama: string; oto?: boolean };

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

const emptyRow = (): Satir => ({ urunAdi: "", adet: "1", birimFiyat: "", kdvOrani: "", aciklama: "" });
const isEmptyRow = (r: Satir) => !r.urunAdi.trim() && !r.birimFiyat && !r.kdvOrani;

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

  // Ürün kartları yalnızca öneri ve varsayılan fiyat/KDV kaynağıdır: ad birebir eşleşirse (büyük/küçük harf önemsiz) kullanılır.
  const katalog = useMemo(() => new Map(urunler.map((u) => [urunAnahtari(u.ad), u])), [urunler]);
  const oneriListesi = useId();

  // Müşterinin her ürün (adı) için en son kullandığı fiyat
  const [sonFiyat, setSonFiyat] = useState<Record<string, { fiyat: string; tarih: string }>>({});
  useEffect(() => {
    let iptal = false;
    if (!cariId) {
      setSonFiyat({});
      return;
    }
    sonFiyatlarAction(cariId)
      .then((r) => !iptal && setSonFiyat(r))
      .catch(() => !iptal && setSonFiyat({}));
    return () => {
      iptal = true;
    };
  }, [cariId]);

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
  function urunYaz(i: number, urunAdi: string) {
    const r = rows[i];
    const anahtar = urunAnahtari(urunAdi);
    const u = katalog.get(anahtar);
    const son = sonFiyat[anahtar];
    // Yazılan ad bir ürün kartıyla ya da bu müşterinin eski bir satırıyla eşleşirse fiyat/KDV dolar
    // (fiyat: müşteriye en son kullanılan, yoksa kartın fiyatı). Elle girilmiş fiyat/KDV'nin üzerine yazılmaz.
    const bos = r.oto || (!r.birimFiyat && !r.kdvOrani);
    if (bos && (u || son)) {
      update(i, { urunAdi, birimFiyat: son?.fiyat ?? u?.birimFiyat ?? r.birimFiyat, kdvOrani: u ? String(u.kdvOrani) : r.kdvOrani, oto: true });
    } else if (r.oto) {
      // Ad artık eşleşmiyor: otomatik doldurulan değerler başka ürüne ait kalmasın.
      update(i, { urunAdi, birimFiyat: "", kdvOrani: "", oto: false });
    } else {
      update(i, { urunAdi });
    }
  }

  // ── Excel'den yapıştır ──
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteKdv, setPasteKdv] = useState("");
  const [pasteError, setPasteError] = useState("");

  const onizleme = useMemo(() => {
    const { satirlar: parsed, atlanan } = siparisYapistirmaCoz(pasteText);
    const list = parsed.map((p) => {
      const anahtar = urunAnahtari(p.ad);
      const u = katalog.get(anahtar);
      const kdvEtkin = p.kdv || (u ? String(u.kdvOrani) : pasteKdv.trim());
      return { ...p, urun: u, fiyatEtkin: p.fiyat || sonFiyat[anahtar]?.fiyat || u?.birimFiyat || "", kdvEtkin };
    });
    const kdvEksik = list.some((l) => !l.kdvEtkin);
    return { list, atlanan, kdvEksik };
  }, [pasteText, pasteKdv, katalog, sonFiyat]);

  function yapistirmayiEkle() {
    setPasteError("");
    if (onizleme.list.length === 0) return setPasteError("Eklenecek satır bulunamadı.");
    if (onizleme.kdvEksik) return setPasteError("Bazı satırlarda KDV oranı yok: yapıştırmaya 4. sütun olarak ekleyin ya da aşağıya varsayılan KDV girin.");

    // Ürün adı satıra olduğu gibi yazılır; ürün kartı oluşturulmaz.
    const yeniSatirlar: Satir[] = onizleme.list.map((l) => ({
      urunAdi: l.ad,
      adet: l.adet,
      birimFiyat: l.fiyatEtkin || "0",
      kdvOrani: l.kdvEtkin,
      aciklama: "",
    }));
    setRows((prev) => {
      const kalan = prev.length === 1 && isEmptyRow(prev[0]) ? [] : prev;
      return [...kalan, ...yeniSatirlar];
    });
    toast.success(`${yeniSatirlar.length} satır eklendi.`);
    setPasteOpen(false);
    setPasteText("");
  }

  const cariLabel = tip === "MUSTERI" ? "Müşteri" : "Tedarikçi";

  return (
    <>
      <form action={formAction} className="space-y-5">
        {initial.id && <input type="hidden" name="id" value={initial.id} />}
        <input type="hidden" name="tip" value={tip} />
        {inline && <input type="hidden" name="inline" value="1" />}
        <input type="hidden" name="kalemler" value={JSON.stringify(rows.map(({ oto: _oto, ...r }) => r))} />

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

        {/* Kayıtlı ürün kartları yazarken öneri olarak çıkar; listede olmayan bir ad da yazılabilir. */}
        <datalist id={oneriListesi}>
          {urunler.map((u) => <option key={u.id} value={u.ad} />)}
        </datalist>

        <div className="card overflow-x-auto">
          <table className="kalem-tablo w-full">
            <thead className="border-b border-slate-300 bg-slate-50">
              <tr>
                <th className="th min-w-56">Ürün</th>
                <th className="th w-28">Adet</th>
                <th className="th w-32">Birim fiyat</th>
                <th className="th w-24">KDV %</th>
                <th className="th w-36 text-right">Satır toplamı</th>
                <th className="th w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((r, i) => {
                const son = r.urunAdi.trim() ? sonFiyat[urunAnahtari(r.urunAdi)] : undefined;
                const farkli = son && num(son.fiyat) !== num(r.birimFiyat);
                return (
                  <tr key={i}>
                    <td className="td">
                      <input
                        type="text"
                        list={oneriListesi}
                        value={r.urunAdi}
                        onChange={(e) => urunYaz(i, e.target.value)}
                        required
                        maxLength={200}
                        autoComplete="off"
                        aria-label="Ürün"
                        placeholder="Ürün adını yazın"
                        className="input"
                      />
                      {son && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          Bu müşteriye son fiyat: {money.format(num(son.fiyat))} TL · {son.tarih}
                          {farkli && (
                            <button type="button" onClick={() => update(i, { birimFiyat: son.fiyat, oto: false })} className="ml-2 font-medium text-petrol-700 hover:underline">
                              Uygula
                            </button>
                          )}
                        </p>
                      )}
                    </td>
                    <td className="td align-top">
                      <input type="number" step="0.001" min="0" value={r.adet} onChange={(e) => update(i, { adet: e.target.value })} required aria-label="Adet" placeholder="Adet" className="input" />
                    </td>
                    <td className="td align-top">
                      <input type="number" step="0.01" min="0" value={r.birimFiyat} onChange={(e) => update(i, { birimFiyat: e.target.value, oto: false })} required aria-label="Birim fiyat" placeholder="0,00" className="input" />
                    </td>
                    <td className="td align-top">
                      <input type="number" step="1" min="0" max="100" value={r.kdvOrani} onChange={(e) => update(i, { kdvOrani: e.target.value, oto: false })} required aria-label="KDV oranı" placeholder="KDV %" className="input" />
                    </td>
                    <td className="td text-right align-top font-medium tabular-nums">{money.format(satirlar[i].toplam)} TL</td>
                    <td className="td align-top">
                      {rows.length > 1 && (
                        <button type="button" onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))} aria-label="Satırı sil" className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 p-3">
            <button type="button" onClick={() => setRows((p) => [...p, emptyRow()])} className="text-sm font-medium text-petrol-700 hover:underline">
              + Satır ekle
            </button>
            <button type="button" onClick={() => setPasteOpen(true)} className="text-sm font-medium text-petrol-700 hover:underline">
              Excel'den yapıştır
            </button>
          </div>
        </div>

        <div className="ml-auto w-full max-w-xs space-y-1 rounded-xl border border-slate-300 bg-white p-4 text-sm">
          <div className="flex justify-between text-slate-600"><span>Ara toplam</span><span className="tabular-nums">{money.format(ara)} TL</span></div>
          <div className="flex justify-between text-slate-600"><span>KDV</span><span className="tabular-nums">{money.format(kdv)} TL</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900"><span>Genel toplam</span><span className="tabular-nums">{money.format(genel)} TL</span></div>
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

      {/* Excel'den yapıştır penceresi (form dışında: iç içe form olmasın) */}
      <Modal open={pasteOpen} onClose={() => setPasteOpen(false)} title="Excel'den yapıştır" size="xl">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Excel'de satırları seçip kopyalayın (Ctrl+C), aşağıya yapıştırın (Ctrl+V). Sütun sırası:{" "}
            <strong className="text-slate-700">Model/Ürün · Adet · Birim fiyat · KDV %</strong> (KDV sütunu isteğe bağlı). Başlık satırı kendiliğinden atlanır.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={6}
            spellCheck={false}
            aria-label="Excel satırları"
            placeholder={"İKRA 350+345+370\t1065\t8,00 TL\nGÖKSU 396 +387\t782\t30,00 TL"}
            className="input font-mono text-xs"
          />

          <div className="w-40">
            <label className="label" htmlFor="paste-kdv">Varsayılan KDV (%)</label>
            <input id="paste-kdv" type="number" step="1" min="0" max="100" value={pasteKdv} onChange={(e) => setPasteKdv(e.target.value)} placeholder="Ör. 10" className="input" />
          </div>
          <p className="-mt-2 text-xs text-slate-500">Varsayılan KDV, KDV sütunu olmayan ve ürün kartı bulunmayan satırlar için kullanılır. Ürün adları siparişe yazıldığı gibi eklenir; ürün kartı oluşturulmaz.</p>

          {onizleme.list.length > 0 && (
            <div className="card max-h-64 overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 border-b border-slate-300 bg-slate-50">
                  <tr>
                    <th className="th">Ürün / model</th>
                    <th className="th text-right">Adet</th>
                    <th className="th text-right">Fiyat</th>
                    <th className="th text-right">KDV</th>
                    <th className="th">Ürün kartı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {onizleme.list.map((l, i) => (
                    <tr key={i}>
                      <td className="td">{l.ad}</td>
                      <td className="td text-right tabular-nums">{l.adet}</td>
                      <td className="td text-right tabular-nums">{l.fiyatEtkin ? money.format(num(l.fiyatEtkin)) : "—"}</td>
                      <td className="td text-right tabular-nums">{l.kdvEtkin ? `%${l.kdvEtkin}` : "—"}</td>
                      <td className="td">
                        {l.urun ? <span className="badge bg-emerald-50 text-emerald-700">Var</span> : <span className="text-xs text-slate-400">Yok</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pasteText.trim() && onizleme.list.length === 0 && (
            <p className="text-sm text-amber-700">Satır okunamadı. Her satırda en az ürün adı ve adet (sayı) olmalı; hücreler sekme ile ayrılmış olmalı (Excel'den kopyalayınca böyle gelir).</p>
          )}
          {onizleme.atlanan > 0 && onizleme.list.length > 0 && <p className="text-xs text-slate-500">{onizleme.atlanan} satır atlandı (başlık ya da adedi sayı olmayan satır).</p>}
          {pasteError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{pasteError}</p>}

          <div className="flex items-center gap-3">
            <button type="button" disabled={onizleme.list.length === 0} onClick={yapistirmayiEkle} className="btn-primary">
              {`${onizleme.list.length || ""} satırı siparişe ekle`.trim()}
            </button>
            <button type="button" onClick={() => setPasteOpen(false)} className="btn-secondary">Vazgeç</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
