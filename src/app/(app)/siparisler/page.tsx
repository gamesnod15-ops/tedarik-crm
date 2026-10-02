import Link from "next/link";
import { SearchInput } from "@/components/search-input";
import { AutoForm } from "@/components/auto-form";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/session";
import { siparisToplam } from "@/lib/finance";
import { formatDate, formatMoney, formatQty, parseDateInput, toDateInput } from "@/lib/format";
import { PAGE_SIZE, pageOf } from "@/lib/crud";
import { Pager } from "@/components/pager";
import { QueryTabs } from "@/components/query-tabs";
import { RecordDialog } from "@/components/record-dialog";
import { DeleteButton } from "@/components/delete-button";
import { deleteAlimAction, deleteSiparisAction, saveAlimAction, setSiparisDurumAction } from "./actions";
import { DURUMLAR, DURUM_BADGE, DURUM_LABELS, isDurum } from "./durum";
import { DurumSelect } from "./durum-select";
import { alimFields } from "./alim-fields";
import { PlusIcon } from "@/components/plus-icon";

type SP = { tip?: string; from?: string; to?: string; q?: string; durum?: string; page?: string; yeni?: string };

function DateFilters({ sp, tip }: { sp: SP; tip: string }) {
  return (
    <>
      <input type="hidden" name="tip" value={tip} />
      <div>
        <label className="label sr-only" htmlFor="from">Tarih aralığı</label>
        <input id="from" name="from" type="date" defaultValue={sp.from} aria-label="Başlangıç tarihi" title="Başlangıç tarihi" className="input w-[7.75rem]" />
        <span aria-hidden="true" className="text-slate-400">–</span>
        <input id="to" name="to" type="date" defaultValue={sp.to} aria-label="Bitiş tarihi" title="Bitiş tarihi" className="input w-[7.75rem]" />
      </div>
    </>
  );
}

async function SiparisListesi({ sp, tip, page, canWrite }: { sp: SP; tip: "MUSTERI" | "TEDARIKCI"; page: number; canWrite: boolean }) {
  const from = parseDateInput(sp.from);
  const to = parseDateInput(sp.to);
  const durum = isDurum(sp.durum) ? sp.durum : undefined;
  const where: Prisma.SiparisWhereInput = {
    ...(durum && { durum }),
    cari: { tipi: tip, ...(sp.q && { unvan: { contains: sp.q, mode: "insensitive" } }) },
    ...((from || to) && { tarih: { ...(from && { gte: from }), ...(to && { lte: to }) } }),
  };
  const [rows, total, sayilar] = await Promise.all([
    db.siparis.findMany({
      where,
      orderBy: [{ tarih: "desc" }, { no: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { cari: { select: { id: true, unvan: true } }, kalemler: { include: { urun: { select: { ad: true } } } } },
    }),
    db.siparis.count({ where }),
    // Durum rozetleri: diğer filtreler uygulanır, durum filtresi hariç.
    db.siparis.groupBy({ by: ["durum"], where: { ...where, durum: undefined }, _count: { _all: true } }),
  ]);
  const sayi = Object.fromEntries(sayilar.map((s) => [s.durum, s._count._all]));
  const label = tip === "MUSTERI" ? "sipariş" : "alım";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="durum-chips flex flex-wrap items-center gap-1.5" aria-label="Duruma göre filtrele">
        <Link
          href={`?${new URLSearchParams({ tip, ...(sp.q && { q: sp.q }), ...(sp.from && { from: sp.from }), ...(sp.to && { to: sp.to }) })}`}
          className={`badge px-2 py-0.5 ${!durum ? "bg-slate-900 text-slate-50" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          Tümü
        </Link>
        {/* İptal rozeti, iptal edilmiş sipariş yokken gösterilmez (yer kazanır). */}
        {DURUMLAR.filter((d) => d !== "IPTAL" || (sayi.IPTAL ?? 0) > 0 || durum === "IPTAL").map((d) => (
          <Link
            key={d}
            href={`?${new URLSearchParams({ tip, durum: d, ...(sp.q && { q: sp.q }), ...(sp.from && { from: sp.from }), ...(sp.to && { to: sp.to }) })}`}
            className={`badge px-2 py-0.5 ${DURUM_BADGE[d]} ${durum === d ? "ring-2 ring-petrol-400" : "opacity-90 hover:opacity-100"}`}
          >
            {DURUM_LABELS[d]} · {sayi[d] ?? 0}
          </Link>
        ))}
      </div>
      <AutoForm className="toolbar ml-auto md:flex-nowrap">
        <DateFilters sp={sp} tip={tip} />
        {durum && <input type="hidden" name="durum" value={durum} />}
        <SearchInput defaultValue={sp.q ?? ""} placeholder={tip === "MUSTERI" ? "Müşteri ara…" : "Tedarikçi ara…"} className="w-52" />
        <button className="sr-only">Filtrele</button>
        {(sp.q || sp.from || sp.to || durum) && <Link href={`?tip=${tip}`} className="text-sm text-slate-500 hover:underline">Temizle</Link>}
      </AutoForm>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-300 bg-slate-50">
            <tr>
              <th className="th">No</th>
              <th className="th">Tarih</th>
              <th className="th">{tip === "MUSTERI" ? "Müşteri" : "Tedarikçi"}</th>
              <th className="th">Ürünler</th>
              <th className="th">Durum</th>
              <th className="th text-right">Toplam (KDV dahil)</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 && <tr><td colSpan={7} className="td py-8 text-center text-slate-400">Kayıt bulunamadı.</td></tr>}
            {rows.map((s) => {
              const adlar = [...new Set(s.kalemler.map((k) => k.urun.ad))];
              return (
                <tr key={s.id}>
                  <td className="td font-mono text-xs text-slate-500">#{s.no}</td>
                  <td className="td whitespace-nowrap">{formatDate(s.tarih)}</td>
                  <td className="td">
                    <Link href={`/cariler/${s.cari.id}`} className="font-medium text-petrol-700 hover:underline">{s.cari.unvan}</Link>
                  </td>
                  <td className="td max-w-xs truncate text-slate-500" title={adlar.join(", ")}>
                    {adlar.slice(0, 2).join(", ")}{adlar.length > 2 ? ` +${adlar.length - 2}` : ""}
                  </td>
                  <td className="td">
                    <DurumSelect id={s.id} durum={s.durum} action={setSiparisDurumAction} disabled={!canWrite} />
                  </td>
                  <td className={`td text-right font-medium tabular-nums ${s.durum === "IPTAL" ? "text-slate-400 line-through" : ""}`}>{formatMoney(siparisToplam(s.kalemler))}</td>
                  <td className="td">
                    {canWrite && (
                      <div className="flex items-center justify-end gap-4">
                        <Link href={`/siparisler/yeni?kopya=${s.id}`} className="text-sm font-medium text-slate-600 hover:underline" title="Bu siparişin aynısını yeni sipariş olarak aç">Kopyala</Link>
                        <Link href={`/siparisler/${s.id}`} className="text-sm font-medium text-petrol-700 hover:underline">Düzenle</Link>
                        <DeleteButton action={deleteSiparisAction} id={s.id} confirmText={`#${s.no} numaralı ${label} silinsin mi? Kalemleri de silinir.`} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pager page={page} total={total} pageSize={PAGE_SIZE} params={{ tip, q: sp.q, from: sp.from, to: sp.to, durum }} />
    </>
  );
}

async function AlimListesi({ sp, page, canWrite }: { sp: SP; page: number; canWrite: boolean }) {
  const from = parseDateInput(sp.from);
  const to = parseDateInput(sp.to);
  const where: Prisma.AlimWhereInput = {
    ...(sp.q && {
      OR: [
        { cari: { unvan: { contains: sp.q, mode: "insensitive" } } },
        { faturaNo: { contains: sp.q, mode: "insensitive" } },
        { aciklama: { contains: sp.q, mode: "insensitive" } },
      ],
    }),
    ...((from || to) && { tarih: { ...(from && { gte: from }), ...(to && { lte: to }) } }),
  };
  const [rows, total, sum, tedarikciler] = await Promise.all([
    db.alim.findMany({
      where,
      orderBy: [{ tarih: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { cari: { select: { id: true, unvan: true } } },
    }),
    db.alim.count({ where }),
    db.alim.aggregate({ where, _sum: { toplam: true } }),
    db.cari.findMany({ where: { tipi: "TEDARIKCI" }, orderBy: { unvan: "asc" }, select: { id: true, unvan: true, isActive: true } }),
  ]);
  const options = tedarikciler.map((c) => ({ value: c.id, label: c.isActive ? c.unvan : `${c.unvan} (pasif)` }));
  const fields = alimFields(options);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-slate-500">
          Alım toplamı (KDV dahil): <span className="text-base font-semibold tabular-nums text-slate-900">{formatMoney(sum._sum.toplam ?? 0)}</span>
        </p>
        {canWrite && (
          <RecordDialog
            autoOpen={sp.yeni === "1"}
            label="Yeni alım"
            title="Yeni tedarikçi alımı"
            fields={fields}
            initial={{ tarih: toDateInput(new Date()) }}
            action={saveAlimAction}
          />
        )}
      </div>

      <AutoForm className="toolbar">
        <DateFilters sp={sp} tip="TEDARIKCI" />
        <SearchInput defaultValue={sp.q ?? ""} placeholder="Tedarikçi, fatura no veya açıklama" className="w-72" />
        <button className="sr-only">Filtrele</button>
        {(sp.q || sp.from || sp.to) && <Link href="?tip=TEDARIKCI" className="text-sm text-slate-500 hover:underline">Temizle</Link>}
      </AutoForm>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-300 bg-slate-50">
            <tr>
              <th className="th">Tarih</th>
              <th className="th">Tedarikçi</th>
              <th className="th">Fatura no</th>
              <th className="th">Açıklama</th>
              <th className="th text-right">Miktar</th>
              <th className="th text-right">Toplam</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 && <tr><td colSpan={7} className="td py-8 text-center text-slate-400">Kayıt bulunamadı.</td></tr>}
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="td whitespace-nowrap">{formatDate(a.tarih)}</td>
                <td className="td">
                  <Link href={`/cariler/${a.cari.id}`} className="font-medium text-petrol-700 hover:underline">{a.cari.unvan}</Link>
                </td>
                <td className="td font-mono text-xs">{a.faturaNo ?? "—"}</td>
                <td className="td max-w-xs truncate text-slate-500" title={a.aciklama ?? ""}>{a.aciklama ?? "—"}</td>
                <td className="td text-right tabular-nums">{a.miktar ? formatQty(a.miktar) : "—"}</td>
                <td className="td text-right font-medium tabular-nums">{formatMoney(a.toplam)}</td>
                <td className="td">
                  {canWrite && (
                    <div className="flex items-center justify-end gap-4">
                      <RecordDialog
                        variant="link"
                        label="Düzenle"
                        title="Alım düzenle"
                        fields={fields}
                        hidden={{ id: a.id }}
                        initial={{
                          tarih: toDateInput(a.tarih),
                          cariId: a.cari.id,
                          faturaNo: a.faturaNo ?? "",
                          miktar: a.miktar?.toString() ?? "",
                          toplam: a.toplam.toString(),
                          aciklama: a.aciklama ?? "",
                        }}
                        action={saveAlimAction}
                      />
                      <DeleteButton action={deleteAlimAction} id={a.id} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} total={total} pageSize={PAGE_SIZE} params={{ tip: "TEDARIKCI", q: sp.q, from: sp.from, to: sp.to }} />
    </>
  );
}

export default async function SiparislerPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser("siparisler:read");
  const sp = await searchParams;
  // Ürünler artık ana menüde ayrı bir sayfa (eski bağlantılar buraya yönlenir).
  if (sp.tip === "URUN") redirect("/urunler");
  const tip = sp.tip === "TEDARIKCI" ? "TEDARIKCI" : "MUSTERI";
  const page = pageOf(sp.page);
  const canWrite = can(user, "siparisler:write");

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Siparişler</h1>
        <QueryTabs
          param="tip"
          items={[
            { value: "MUSTERI", label: "Müşteri Siparişleri" },
            { value: "TEDARIKCI", label: "Tedarikçi Alımları" },
          ]}
        />
        </div>
        {canWrite && tip === "MUSTERI" && (
          <Link href="/siparisler/yeni?tip=MUSTERI" className="btn-primary"><PlusIcon />Yeni sipariş</Link>
        )}
      </header>


      {tip === "TEDARIKCI" ? (
        <AlimListesi sp={sp} page={page} canWrite={canWrite} />
      ) : (
        <SiparisListesi sp={sp} tip="MUSTERI" page={page} canWrite={canWrite} />
      )}
    </div>
  );
}
