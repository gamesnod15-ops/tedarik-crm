import Link from "next/link";
import { SearchInput } from "@/components/search-input";
import { AutoForm } from "@/components/auto-form";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/session";
import { formatDate, formatMoney, parseDateInput, toDateInput } from "@/lib/format";
import { PAGE_SIZE, pageOf } from "@/lib/crud";
import { Pager } from "@/components/pager";
import { QueryTabs } from "@/components/query-tabs";
import { RecordDialog } from "@/components/record-dialog";
import { DeleteButton } from "@/components/delete-button";
import type { Option } from "@/components/entity-form";
import { deleteMasrafAction, deleteOdemeAction, saveMasrafAction, saveOdemeAction } from "./actions";
import { TekrarlayanBolumu } from "./tekrarlayan";
import { ISLEM_TIPI_LABELS, ODEME_SEKLI_LABELS, masrafFields, odemeFields } from "./fields";
import { SegmentFilter } from "@/components/segment-filter";

type SP = { tip?: string; from?: string; to?: string; q?: string; cariTipi?: string; islem?: string; page?: string; yeni?: string };

function Total({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <p className="text-sm text-slate-500">
      {label}: <span className={`text-base font-semibold tabular-nums ${tone ?? "text-slate-900"}`}>{value}</span>
    </p>
  );
}

function DateFilters({ sp, tip }: { sp: SP; tip: string }) {
  return (
    <>
      <input type="hidden" name="tip" value={tip} />
      <div>
        <label className="label" htmlFor="from">Tarih</label>
        <input id="from" name="from" type="date" defaultValue={sp.from} aria-label="Başlangıç tarihi" className="input" />
        <span aria-hidden="true" className="text-slate-400">–</span>
        <input id="to" name="to" type="date" defaultValue={sp.to} aria-label="Bitiş tarihi" className="input" />
      </div>
    </>
  );
}

// ── Tahsilat / Ödeme ──
type BolumProps = { sp: SP; page: number; tarih?: Prisma.DateTimeFilter; canWrite: boolean; hasFilter: boolean; baslik: React.ReactNode };

async function OdemeBolumu(p: BolumProps) {
  const where: Prisma.OdemeWhereInput = {
    ...(p.tarih && { tarih: p.tarih }),
    ...((p.sp.q || p.sp.cariTipi === "MUSTERI" || p.sp.cariTipi === "TEDARIKCI") && {
      cari: {
        ...(p.sp.q && { unvan: { contains: p.sp.q, mode: "insensitive" as const } }),
        ...((p.sp.cariTipi === "MUSTERI" || p.sp.cariTipi === "TEDARIKCI") && { tipi: p.sp.cariTipi }),
      },
    }),
    ...((p.sp.islem === "TAHSILAT" || p.sp.islem === "ODEME") && { islemTipi: p.sp.islem }),
  };
  const [rows, total, sums, cariler] = await Promise.all([
    db.odeme.findMany({
      where,
      orderBy: [{ tarih: "desc" }, { createdAt: "desc" }],
      skip: (p.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { cari: { select: { id: true, unvan: true, tipi: true } } },
    }),
    db.odeme.count({ where }),
    db.odeme.groupBy({ by: ["islemTipi"], where, _sum: { tutar: true } }),
    db.cari.findMany({ orderBy: { unvan: "asc" }, select: { id: true, unvan: true, tipi: true, isActive: true } }),
  ]);
  const cariOptions: Option[] = cariler.map((c) => ({ value: c.id, label: c.isActive ? c.unvan : `${c.unvan} (pasif)`, group: c.tipi }));
  const fields = odemeFields(cariOptions);
  const tahsilat = sums.find((s) => s.islemTipi === "TAHSILAT")?._sum.tutar ?? 0;
  const odeme = sums.find((s) => s.islemTipi === "ODEME")?._sum.tutar ?? 0;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {p.baslik}
        {p.canWrite && (
          <RecordDialog
            autoOpen={p.sp.yeni === "1"}
            label="Yeni tahsilat / ödeme"
            title="Yeni tahsilat / ödeme"
            fields={fields}
            initial={{ tarih: toDateInput(new Date()), odemeSekli: "NAKIT" }}
            action={saveOdemeAction}
          />
        )}
      </header>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <Total label="Tahsilat toplamı" value={formatMoney(tahsilat)} tone="text-emerald-700" />
        <Total label="Ödeme toplamı" value={formatMoney(odeme)} tone="text-red-700" />
      </div>

      <AutoForm className="toolbar">
        <DateFilters sp={p.sp} tip="ODEME" />
        <SegmentFilter name="cariTipi" label="Cari tipi" value={p.sp.cariTipi} options={[{ value: "MUSTERI", label: "Müşteri" }, { value: "TEDARIKCI", label: "Tedarikçi" }]} />
        <SegmentFilter name="islem" label="İşlem tipi" value={p.sp.islem} options={[{ value: "TAHSILAT", label: "Tahsilat" }, { value: "ODEME", label: "Ödeme" }]} />
        <SearchInput defaultValue={p.sp.q ?? ""} placeholder="Cari unvanı" className="w-64" />
        <button className="sr-only">Filtrele</button>
        {p.hasFilter && <Link href="?tip=ODEME" className="text-sm text-slate-500 hover:underline">Temizle</Link>}
      </AutoForm>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-300 bg-slate-50">
            <tr>
              <th className="th">Tarih</th>
              <th className="th">Cari</th>
              <th className="th">İşlem</th>
              <th className="th">Şekil</th>
              <th className="th text-right">Tutar</th>
              <th className="th">Açıklama</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 && <tr><td colSpan={7} className="td py-8 text-center text-slate-400">Kayıt bulunamadı.</td></tr>}
            {rows.map((o) => (
              <tr key={o.id}>
                <td className="td whitespace-nowrap">{formatDate(o.tarih)}</td>
                <td className="td">
                  <Link href={`/cariler/${o.cari.id}`} className="font-medium text-petrol-700 hover:underline">{o.cari.unvan}</Link>
                  <span className="ml-2 text-xs text-slate-400">{o.cari.tipi === "MUSTERI" ? "Müşteri" : "Tedarikçi"}</span>
                </td>
                <td className="td">
                  <span className={`badge ${o.islemTipi === "TAHSILAT" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {ISLEM_TIPI_LABELS[o.islemTipi]}
                  </span>
                </td>
                <td className="td">{ODEME_SEKLI_LABELS[o.odemeSekli]}</td>
                <td className="td text-right font-medium tabular-nums">{formatMoney(o.tutar)}</td>
                <td className="td max-w-xs truncate text-slate-500" title={o.aciklama ?? ""}>{o.aciklama ?? "—"}</td>
                <td className="td">
                  {p.canWrite && (
                    <div className="flex items-center justify-end gap-4">
                      <RecordDialog
                        variant="link"
                        label="Düzenle"
                        title="Tahsilat / ödeme düzenle"
                        fields={fields}
                        hidden={{ id: o.id }}
                        initial={{
                          tarih: toDateInput(o.tarih),
                          cariTipi: o.cari.tipi,
                          cariId: o.cari.id,
                          islemTipi: o.islemTipi,
                          tutar: o.tutar.toString(),
                          odemeSekli: o.odemeSekli,
                          aciklama: o.aciklama ?? "",
                        }}
                        action={saveOdemeAction}
                      />
                      <DeleteButton action={deleteOdemeAction} id={o.id} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={p.page} total={total} pageSize={PAGE_SIZE} params={{ tip: "ODEME", from: p.sp.from, to: p.sp.to, q: p.sp.q, cariTipi: p.sp.cariTipi, islem: p.sp.islem }} />
    </>
  );
}

// ── Masraflar ──
async function MasrafBolumu(p: BolumProps) {
  const where: Prisma.MasrafWhereInput = {
    ...(p.tarih && { tarih: p.tarih }),
    ...(p.sp.q && {
      OR: [
        { aciklama: { contains: p.sp.q, mode: "insensitive" as const } },
        { kategori: { contains: p.sp.q, mode: "insensitive" as const } },
      ],
    }),
  };
  const [rows, total, sum] = await Promise.all([
    db.masraf.findMany({ where, orderBy: [{ tarih: "desc" }, { createdAt: "desc" }], skip: (p.page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.masraf.count({ where }),
    db.masraf.aggregate({ where, _sum: { tutar: true } }),
  ]);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {p.baslik}
        {p.canWrite && (
          <RecordDialog
            autoOpen={p.sp.yeni === "1"}
            label="Yeni masraf"
            title="Yeni masraf"
            fields={masrafFields}
            initial={{ tarih: toDateInput(new Date()) }}
            action={saveMasrafAction}
          />
        )}
      </header>

      <Total label="Masraf toplamı" value={formatMoney(sum._sum.tutar ?? 0)} tone="text-red-700" />

      <AutoForm className="toolbar">
        <DateFilters sp={p.sp} tip="MASRAF" />
        <SearchInput defaultValue={p.sp.q ?? ""} placeholder="Açıklama veya kategori" className="w-72" />
        <button className="sr-only">Filtrele</button>
        {p.hasFilter && <Link href="?tip=MASRAF" className="text-sm text-slate-500 hover:underline">Temizle</Link>}
      </AutoForm>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-300 bg-slate-50">
            <tr>
              <th className="th">Tarih</th>
              <th className="th">Açıklama</th>
              <th className="th">Kategori</th>
              <th className="th">Şekil</th>
              <th className="th text-right">Tutar</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 && <tr><td colSpan={6} className="td py-8 text-center text-slate-400">Kayıt bulunamadı.</td></tr>}
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="td whitespace-nowrap">{formatDate(m.tarih)}</td>
                <td className="td font-medium text-slate-900">{m.aciklama}</td>
                <td className="td">{m.kategori ?? "—"}</td>
                <td className="td">{m.odemeSekli ? ODEME_SEKLI_LABELS[m.odemeSekli] : "—"}</td>
                <td className="td text-right font-medium tabular-nums">{formatMoney(m.tutar)}</td>
                <td className="td">
                  {p.canWrite && (
                    <div className="flex items-center justify-end gap-4">
                      <RecordDialog
                        variant="link"
                        label="Düzenle"
                        title="Masraf düzenle"
                        fields={masrafFields}
                        hidden={{ id: m.id }}
                        initial={{
                          tarih: toDateInput(m.tarih),
                          tutar: m.tutar.toString(),
                          aciklama: m.aciklama,
                          kategori: m.kategori ?? "",
                          odemeSekli: m.odemeSekli ?? "",
                        }}
                        action={saveMasrafAction}
                      />
                      <DeleteButton action={deleteMasrafAction} id={m.id} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={p.page} total={total} pageSize={PAGE_SIZE} params={{ tip: "MASRAF", from: p.sp.from, to: p.sp.to, q: p.sp.q }} />
        <TekrarlayanBolumu canWrite={p.canWrite} />
    </>
  );
}

export default async function FinansPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser("finans:read");
  const sp = await searchParams;
  const tip = sp.tip === "MASRAF" ? "MASRAF" : "ODEME";
  const page = pageOf(sp.page);
  const canWrite = can(user, "finans:write");

  const from = parseDateInput(sp.from);
  const to = parseDateInput(sp.to);
  const tarih: Prisma.DateTimeFilter | undefined = from || to ? { ...(from && { gte: from }), ...(to && { lte: to }) } : undefined;
  const hasFilter = !!(sp.from || sp.to || sp.q || sp.cariTipi || sp.islem);
  // Başlık + sekmeler; "Yeni …" butonu sekmeye göre değiştiği için başlık satırını bölümler oluşturur.
  const baslik = (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Finans</h1>
      <QueryTabs
        param="tip"
        items={[
          { value: "ODEME", label: "Tahsilat / Ödeme" },
          { value: "MASRAF", label: "Masraflar" },
        ]}
      />
    </div>
  );

  return (
    <div className="space-y-3">

      {tip === "ODEME" ? (
        <OdemeBolumu sp={sp} page={page} tarih={tarih} canWrite={canWrite} hasFilter={hasFilter} baslik={baslik} />
      ) : (
        <MasrafBolumu sp={sp} page={page} tarih={tarih} canWrite={canWrite} hasFilter={hasFilter} baslik={baslik} />
      )}
    </div>
  );
}
