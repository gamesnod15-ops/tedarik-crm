import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getOzet, siparisToplam } from "@/lib/finance";
import { formatDate, formatMoney, monthStartInput, parseDateInput, todayInput } from "@/lib/format";
import { PrintButton } from "@/components/print-button";
import { ISLEM_TIPI_LABELS, ODEME_SEKLI_LABELS } from "../finans/fields";

type SP = { from?: string; to?: string };
const LIMIT = 500;

function Box({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card px-5 py-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tone ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

export default async function RaporlarPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser("raporlar:read");
  const sp = await searchParams;
  const fromStr = parseDateInput(sp.from) ? sp.from! : monthStartInput();
  const toStr = parseDateInput(sp.to) ? sp.to! : todayInput();
  const from = parseDateInput(fromStr)!;
  const to = parseDateInput(toStr)!;
  const aralik = { gte: from, lte: to };

  const [ozet, siparisler, masraflar, odemeler, alimlar] = await Promise.all([
    getOzet(from, to),
    db.siparis.findMany({
      where: { tarih: aralik, durum: { not: "IPTAL" } },
      orderBy: [{ tarih: "asc" }, { no: "asc" }],
      take: LIMIT,
      include: { cari: { select: { unvan: true, tipi: true } }, kalemler: { include: { urun: { select: { ad: true } } } } },
    }),
    db.masraf.findMany({ where: { tarih: aralik }, orderBy: [{ tarih: "asc" }, { createdAt: "asc" }], take: LIMIT }),
    db.odeme.findMany({
      where: { tarih: aralik },
      orderBy: [{ tarih: "asc" }, { createdAt: "asc" }],
      take: LIMIT,
      include: { cari: { select: { unvan: true } } },
    }),
    db.alim.findMany({
      where: { tarih: aralik },
      orderBy: [{ tarih: "asc" }, { createdAt: "asc" }],
      take: LIMIT,
      include: { cari: { select: { unvan: true } } },
    }),
  ]);

  // Tutar işareti nakit yönünü gösterir: gelir (+) / gider (−).
  const satirlar = [
    ...siparisler.map((s) => {
      const toplam = siparisToplam(s.kalemler);
      const musteri = s.cari.tipi === "MUSTERI";
      return {
        key: `s${s.id}`,
        tarih: s.tarih,
        tur: musteri ? "Müşteri Siparişi" : "Tedarikçi Alımı",
        ad: s.cari.unvan,
        aciklama: [...new Set(s.kalemler.map((k) => k.urun.ad))].join(", "),
        tutar: musteri ? toplam : toplam.neg(),
      };
    }),
    ...alimlar.map((a) => ({
      key: `a${a.id}`,
      tarih: a.tarih,
      tur: "Tedarikçi Alımı",
      ad: a.cari.unvan,
      aciklama: [a.faturaNo && `Fatura: ${a.faturaNo}`, a.aciklama].filter(Boolean).join(" · "),
      tutar: a.toplam.neg(),
    })),
    ...masraflar.map((m) => ({
      key: `m${m.id}`,
      tarih: m.tarih,
      tur: "Gider",
      ad: m.aciklama,
      aciklama: m.kategori ?? "",
      tutar: m.tutar.neg(),
    })),
    ...odemeler.map((o) => ({
      key: `o${o.id}`,
      tarih: o.tarih,
      tur: ISLEM_TIPI_LABELS[o.islemTipi],
      ad: o.cari.unvan,
      aciklama: ODEME_SEKLI_LABELS[o.odemeSekli],
      tutar: o.islemTipi === "TAHSILAT" ? o.tutar : o.tutar.neg(),
    })),
  ]
    .sort((a, b) => a.tarih.getTime() - b.tarih.getTime())
    .slice(0, LIMIT);

  const kesildi = [siparisler, masraflar, odemeler, alimlar].some((l) => l.length === LIMIT);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Genel Finans ve Hareket Raporu</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {formatDate(from)} – {formatDate(to)} arası
          </p>
        </div>
        <PrintButton />
      </header>

      <form className="toolbar print:hidden">
        <div>
          <label className="label" htmlFor="from">Başlangıç tarihi</label>
          <input id="from" name="from" type="date" defaultValue={fromStr} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="to">Bitiş tarihi</label>
          <input id="to" name="to" type="date" defaultValue={toStr} className="input" />
        </div>
        <button className="btn-primary">Raporu hazırla</button>
        <Link href="/raporlar" className="text-sm text-slate-500 hover:underline">Bu ay</Link>
      </form>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Box label="Toplam ciro" value={formatMoney(ozet.ciro)} />
        <Box label="Toplam alış" value={formatMoney(ozet.alis)} />
        <Box label="Toplam gider" value={formatMoney(ozet.gider)} />
        <Box label="Kâr / zarar" value={formatMoney(ozet.kar)} tone={ozet.kar.isNegative() ? "text-red-700" : "text-emerald-700"} />
      </section>
      <p className="text-xs text-slate-500">Ciro ve alış KDV dahildir. Kâr = ciro − alış − gider. Tahsilat: {formatMoney(ozet.tahsilat)} · Ödeme: {formatMoney(ozet.odeme)}.</p>

      <section className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Tarih</th>
              <th className="th">Tür</th>
              <th className="th">Cari / açıklama</th>
              <th className="th">Ayrıntı</th>
              <th className="th text-right">Tutar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {satirlar.length === 0 && <tr><td colSpan={5} className="td py-8 text-center text-slate-400">Bu tarih aralığında hareket yok.</td></tr>}
            {satirlar.map((r) => (
              <tr key={r.key}>
                <td className="td whitespace-nowrap">{formatDate(r.tarih)}</td>
                <td className="td">{r.tur}</td>
                <td className="td font-medium text-slate-900">{r.ad}</td>
                <td className="td max-w-sm truncate text-slate-500" title={r.aciklama}>{r.aciklama || "—"}</td>
                <td className={`td text-right font-medium tabular-nums ${r.tutar.isNegative() ? "text-red-700" : "text-slate-900"}`}>{formatMoney(r.tutar)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {kesildi && <p className="text-xs text-amber-700">Listede en fazla {LIMIT} kayıt gösterilir; özet kutuları tüm kayıtları kapsar. Tarih aralığını daraltın.</p>}
    </div>
  );
}
