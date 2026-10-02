import Link from "next/link";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/session";
import { getRapor, RAPOR_LIMIT } from "@/lib/rapor";
import { donemAdi, donemKey, getEkstreler, parseDonem } from "@/lib/ekstre";
import { formatDate, formatMoney, monthStartInput, parseDateInput, todayInput } from "@/lib/format";
import { AutoForm } from "@/components/auto-form";
import { PrintButton } from "@/components/print-button";
import { QueryTabs } from "@/components/query-tabs";

type SP = { tip?: string; from?: string; to?: string; ay?: string; cari?: string };

function Box({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card px-5 py-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tone ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

const pdfBtn = "btn-secondary gap-2 print:hidden";
const PdfIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" />
  </svg>
);

async function GenelRapor({ sp }: { sp: SP }) {
  const fromStr = parseDateInput(sp.from) ? sp.from! : monthStartInput();
  const toStr = parseDateInput(sp.to) ? sp.to! : todayInput();
  const from = parseDateInput(fromStr)!;
  const to = parseDateInput(toStr)!;
  const { ozet, satirlar, kesildi } = await getRapor(from, to);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AutoForm className="toolbar print:hidden">
          <input type="hidden" name="tip" value="GENEL" />
          <div>
            <label className="label" htmlFor="from">Tarih</label>
            <input id="from" name="from" type="date" defaultValue={fromStr} aria-label="Başlangıç tarihi" className="input" />
            <span aria-hidden="true" className="text-slate-400">–</span>
            <input id="to" name="to" type="date" defaultValue={toStr} aria-label="Bitiş tarihi" className="input" />
          </div>
          <button className="sr-only">Raporu hazırla</button>
          <Link href="/raporlar?tip=GENEL" className="text-sm text-slate-500 hover:underline">Bu ay</Link>
        </AutoForm>
        <div className="flex items-center gap-2">
          <Link href={`/api/rapor?from=${fromStr}&to=${toStr}`} className={pdfBtn} prefetch={false}>
            <PdfIcon /> PDF indir
          </Link>
          <PrintButton label="Yazdır" />
        </div>
      </div>

      <p className="text-sm text-slate-500">
        {formatDate(from)} – {formatDate(to)} arası
      </p>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Box label="Toplam ciro" value={formatMoney(ozet.ciro)} />
        <Box label="Toplam alış" value={formatMoney(ozet.alis)} />
        <Box label="Toplam gider" value={formatMoney(ozet.gider)} />
        <Box label="Kâr / zarar" value={formatMoney(ozet.kar)} tone={ozet.kar.isNegative() ? "text-red-700" : "text-emerald-700"} />
      </section>
      <p className="text-xs text-slate-500">Ciro ve alış KDV dahildir. Kâr = ciro − alış − gider. Tahsilat: {formatMoney(ozet.tahsilat)} · Ödeme: {formatMoney(ozet.odeme)}.</p>

      <section className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-300 bg-slate-50">
            <tr>
              <th className="th">Tarih</th>
              <th className="th">Tür</th>
              <th className="th">Cari / açıklama</th>
              <th className="th">Ayrıntı</th>
              <th className="th text-right">Tutar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
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
      {kesildi && <p className="text-xs text-amber-700">Listede en fazla {RAPOR_LIMIT} kayıt gösterilir; özet kutuları tüm kayıtları kapsar. Tarih aralığını daraltın.</p>}
    </>
  );
}

async function AySonuEkstreleri({ sp }: { sp: SP }) {
  const tipi = sp.cari === "TEDARIKCI" ? "TEDARIKCI" : "MUSTERI";
  const donem = parseDonem(sp.ay, "AY");
  const ay = donemKey(donem);
  const ekstreler = await getEkstreler(tipi, donem);
  const musteri = tipi === "MUSTERI";

  const sifir = new Prisma.Decimal(0);
  const toplam = ekstreler.reduce(
    (t, e) => ({ devreden: t.devreden.add(e.devreden), borc: t.borc.add(e.toplamBorclanma), odeme: t.odeme.add(e.toplamOdeme), bakiye: t.bakiye.add(e.sonBakiye) }),
    { devreden: sifir, borc: sifir, odeme: sifir, bakiye: sifir },
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AutoForm className="toolbar print:hidden">
          <input type="hidden" name="tip" value="EKSTRE" />
          <div>
            <label className="label" htmlFor="ay">Ay</label>
            <input id="ay" name="ay" type="month" defaultValue={ay} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="cari">Cari tipi</label>
            <select id="cari" name="cari" defaultValue={tipi} className="input">
              <option value="MUSTERI">Müşteriler</option>
              <option value="TEDARIKCI">Tedarikçiler</option>
            </select>
          </div>
          <button className="sr-only">Göster</button>
        </AutoForm>
        <div className="flex items-center gap-2">
          {ekstreler.length > 0 && (
            <Link href={`/api/ekstre/toplu?ay=${ay}&tip=${tipi}`} className="btn-primary gap-2 print:hidden" prefetch={false}>
              <PdfIcon /> Tümünü tek PDF indir ({ekstreler.length})
            </Link>
          )}
          <PrintButton label="Yazdır" />
        </div>
      </div>

      <p className="text-sm text-slate-500">
        {donemAdi(donem)} · {musteri ? "Müşteri" : "Tedarikçi"} ekstreleri. Devreden bakiye, önceki aylardaki tüm kayıtlardan hesaplanır.
      </p>

      <section className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-300 bg-slate-50">
            <tr>
              <th className="th">{musteri ? "Müşteri" : "Tedarikçi"}</th>
              <th className="th text-right">Devreden</th>
              <th className="th text-right">{musteri ? "Dönem siparişi" : "Dönem alımı"}</th>
              <th className="th text-right">{musteri ? "Dönem tahsilatı" : "Dönem ödemesi"}</th>
              <th className="th text-right">{musteri ? "Dönem sonu (alacağımız)" : "Dönem sonu (borcumuz)"}</th>
              <th className="th print:hidden" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {ekstreler.length === 0 && <tr><td colSpan={6} className="td py-8 text-center text-slate-400">Bu dönemde hareketi ya da bakiyesi olan kayıt yok.</td></tr>}
            {ekstreler.map((e) => (
              <tr key={e.cari.id}>
                <td className="td">
                  <Link href={`/cariler/${e.cari.id}?ay=${ay}`} className="font-medium text-petrol-700 hover:underline">{e.cari.unvan}</Link>
                </td>
                <td className="td text-right tabular-nums">{formatMoney(e.devreden)}</td>
                <td className="td text-right tabular-nums">{formatMoney(e.toplamBorclanma)}</td>
                <td className="td text-right tabular-nums">{formatMoney(e.toplamOdeme)}</td>
                <td className="td text-right font-semibold tabular-nums">{formatMoney(e.sonBakiye)}</td>
                <td className="td text-right print:hidden">
                  <Link href={`/api/ekstre/${e.cari.id}?ay=${ay}`} className="text-sm font-medium text-petrol-700 hover:underline" prefetch={false}>PDF</Link>
                </td>
              </tr>
            ))}
          </tbody>
          {ekstreler.length > 0 && (
            <tfoot className="border-t-2 border-slate-300 bg-slate-50">
              <tr>
                <td className="td font-semibold">Toplam ({ekstreler.length} kayıt)</td>
                <td className="td text-right font-semibold tabular-nums">{formatMoney(toplam.devreden)}</td>
                <td className="td text-right font-semibold tabular-nums">{formatMoney(toplam.borc)}</td>
                <td className="td text-right font-semibold tabular-nums">{formatMoney(toplam.odeme)}</td>
                <td className="td text-right font-semibold tabular-nums">{formatMoney(toplam.bakiye)}</td>
                <td className="td print:hidden" />
              </tr>
            </tfoot>
          )}
        </table>
      </section>
    </>
  );
}

export default async function RaporlarPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser("raporlar:read");
  const sp = await searchParams;
  const tip = sp.tip === "EKSTRE" ? "EKSTRE" : "GENEL";

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2 print:hidden">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Raporlar</h1>
        <QueryTabs
          param="tip"
          items={[
            { value: "GENEL", label: "Finans Raporu" },
            { value: "EKSTRE", label: "Ay Sonu Ekstreleri" },
          ]}
        />
      </header>
      <h1 className="hidden text-xl font-semibold print:block">{tip === "GENEL" ? "Genel Finans ve Hareket Raporu" : "Ay Sonu Ekstreleri"}</h1>

      {tip === "GENEL" ? <GenelRapor sp={sp} /> : <AySonuEkstreleri sp={sp} />}
    </div>
  );
}
