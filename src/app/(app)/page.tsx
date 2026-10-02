import Link from "next/link";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/session";
import { getBakiyeler, getOzet, siparisToplam } from "@/lib/finance";
import { getVadesiGecenAlacaklar } from "@/lib/alacak";
import { formatDate, formatMoney, monthStartInput, parseDateInput, todayInput } from "@/lib/format";
import { ISLEM_TIPI_LABELS } from "./finans/fields";
import { MobileTables } from "@/components/mobile-tables";

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tone ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

export default async function OzetPage() {
  const user = await requireUser();

  if (!can(user, "raporlar:read")) {
    return (
      <div className="card p-10 text-center">
        <h1 className="text-xl font-semibold">Hoş geldiniz, {user.name}</h1>
        <p className="mt-1 text-sm text-slate-500">Soldaki menüden çalışmak istediğiniz bölümü seçin.</p>
      </div>
    );
  }

  const from = parseDateInput(monthStartInput())!;
  const to = parseDateInput(todayInput())!;

  const [ozet, cariler, sonSiparisler, sonAlimlar, sonOdemeler, acik, vadesiGecenler] = await Promise.all([
    getOzet(from, to),
    db.cari.findMany({ select: { id: true, tipi: true } }),
    db.siparis.findMany({
      orderBy: [{ tarih: "desc" }, { no: "desc" }],
      take: 5,
      include: { cari: { select: { id: true, unvan: true, tipi: true } }, kalemler: true },
    }),
    db.alim.findMany({ orderBy: [{ tarih: "desc" }, { createdAt: "desc" }], take: 5, include: { cari: { select: { id: true, unvan: true } } } }),
    db.odeme.findMany({ orderBy: [{ tarih: "desc" }, { createdAt: "desc" }], take: 5, include: { cari: { select: { id: true, unvan: true } } } }),
    db.siparis.groupBy({ by: ["durum"], where: { durum: { in: ["BEKLIYOR", "HAZIRLANIYOR"] } }, _count: { _all: true } }),
    getVadesiGecenAlacaklar(),
  ]);

  const sonHareketler = [
    ...sonSiparisler.map((s) => ({ key: `s${s.id}`, tarih: s.tarih, cari: s.cari, etiket: s.cari.tipi === "MUSTERI" ? "Sipariş" : "Alım", tutar: siparisToplam(s.kalemler) })),
    ...sonAlimlar.map((a) => ({ key: `a${a.id}`, tarih: a.tarih, cari: a.cari, etiket: "Alım", tutar: a.toplam })),
  ]
    .sort((a, b) => b.tarih.getTime() - a.tarih.getTime())
    .slice(0, 5);

  const bakiyeler = await getBakiyeler(cariler.map((c) => c.id));
  let alacak = 0;
  let borc = 0;
  for (const c of cariler) {
    const b = Number(bakiyeler.get(c.id)?.toString() ?? 0);
    if (c.tipi === "MUSTERI") alacak += b;
    else borc += b;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Özet</h1>
        <p className="mt-0.5 text-sm text-slate-500">Bu ay ({formatDate(from)} – {formatDate(to)}) ve güncel cari durumu.</p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Aylık ciro" value={formatMoney(ozet.ciro)} />
        <Stat label="Aylık tahsilat" value={formatMoney(ozet.tahsilat)} tone="text-emerald-700" />
        <Stat label="Aylık gider" value={formatMoney(ozet.gider)} tone="text-red-700" />
        <Stat label="Tahmini kâr" value={formatMoney(ozet.kar)} tone={ozet.kar.isNegative() ? "text-red-700" : "text-emerald-700"} />
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Aylık alış" value={formatMoney(ozet.alis)} />
        <Stat label="Aylık ödeme" value={formatMoney(ozet.odeme)} />
        <Stat label="Müşterilerden alacağımız" value={formatMoney(alacak)} />
        <Stat label="Tedarikçilere borcumuz" value={formatMoney(borc)} />
      </section>

      <section className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-slate-500">Açık siparişler:</span>
        <Link href="/siparisler?tip=MUSTERI&durum=BEKLIYOR" className="badge bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-100">
          Bekliyor · {acik.find((a) => a.durum === "BEKLIYOR")?._count._all ?? 0}
        </Link>
        <Link href="/siparisler?tip=MUSTERI&durum=HAZIRLANIYOR" className="badge bg-sky-50 px-3 py-1 text-sky-700 hover:bg-sky-100">
          Hazırlanıyor · {acik.find((a) => a.durum === "HAZIRLANIYOR")?._count._all ?? 0}
        </Link>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 px-5 py-3">
          <h2 className="text-sm font-semibold">
            Vadesi geçen alacaklar
            {vadesiGecenler.length > 0 && <span className="ml-2 badge bg-red-50 text-red-700">{vadesiGecenler.length} müşteri</span>}
          </h2>
          {vadesiGecenler.length > 0 && (
            <span className="text-sm text-slate-500">
              Toplam: <span className="font-semibold tabular-nums text-red-700">{formatMoney(vadesiGecenler.reduce((t, v) => t + Number(v.gecikmis.toString()), 0))}</span>
            </span>
          )}
        </div>
        {vadesiGecenler.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-400">Vadesi geçen alacak yok.</p>
        ) : (
          <table className="w-full">
            <tbody className="divide-y divide-slate-200">
              {vadesiGecenler.slice(0, 6).map((v) => (
                <tr key={v.cariId}>
                  <td className="td">
                    <Link href={`/cariler/${v.cariId}`} className="font-medium text-slate-900 hover:underline">{v.unvan}</Link>
                  </td>
                  <td className="td text-slate-500">
                    {v.enEskiGecikmeGun > 0 ? `${v.enEskiGecikmeGun} gün gecikmiş` : "Devreden bakiye"} · vade {v.vadeGunu} gün
                  </td>
                  <td className="td text-right font-semibold tabular-nums text-red-700">{formatMoney(v.gecikmis)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {vadesiGecenler.length > 6 && <p className="border-t border-slate-200 px-5 py-2 text-xs text-slate-500">+{vadesiGecenler.length - 6} müşteri daha. Cariler sayfasından tümüne bakın.</p>}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-300 px-5 py-3">
            <h2 className="text-sm font-semibold">Son siparişler ve alımlar</h2>
            <Link href="/siparisler" className="text-sm text-petrol-700 hover:underline">Tümü</Link>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-slate-200">
              {sonHareketler.length === 0 && <tr><td className="td py-6 text-center text-slate-400">Henüz kayıt yok.</td></tr>}
              {sonHareketler.map((h) => (
                <tr key={h.key}>
                  <td className="td whitespace-nowrap text-slate-500">{formatDate(h.tarih)}</td>
                  <td className="td">
                    <Link href={`/cariler/${h.cari.id}`} className="font-medium text-slate-900 hover:underline">{h.cari.unvan}</Link>
                    <span className="ml-2 text-xs text-slate-400">{h.etiket}</span>
                  </td>
                  <td className="td text-right tabular-nums">{formatMoney(h.tutar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <MobileTables />
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-300 px-5 py-3">
            <h2 className="text-sm font-semibold">Son tahsilat ve ödemeler</h2>
            <Link href="/finans" className="text-sm text-petrol-700 hover:underline">Tümü</Link>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-slate-200">
              {sonOdemeler.length === 0 && <tr><td className="td py-6 text-center text-slate-400">Henüz kayıt yok.</td></tr>}
              {sonOdemeler.map((o) => (
                <tr key={o.id}>
                  <td className="td whitespace-nowrap text-slate-500">{formatDate(o.tarih)}</td>
                  <td className="td">
                    <Link href={`/cariler/${o.cari.id}`} className="font-medium text-slate-900 hover:underline">{o.cari.unvan}</Link>
                    <span className="ml-2 text-xs text-slate-400">{ISLEM_TIPI_LABELS[o.islemTipi]}</span>
                  </td>
                  <td className="td text-right tabular-nums">{formatMoney(o.tutar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <MobileTables />
        </div>
      </section>
    </div>
  );
}
