import Link from "next/link";
import { SearchInput } from "@/components/search-input";
import { AutoForm } from "@/components/auto-form";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/session";
import { getBakiyeler } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { PAGE_SIZE, pageOf } from "@/lib/crud";
import { Pager } from "@/components/pager";
import { QueryTabs } from "@/components/query-tabs";
import { RecordDialog } from "@/components/record-dialog";
import { DeleteButton } from "@/components/delete-button";
import { deleteCariAction, saveCariAction } from "./actions";
import { CARI_TIP_LABELS, cariFieldsFor } from "./fields";
import { SegmentFilter } from "@/components/segment-filter";

type SP = { tip?: string; q?: string; durum?: string; page?: string; yeni?: string };

export default async function CarilerPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser("cariler:read");
  const sp = await searchParams;
  const tipi = sp.tip === "TEDARIKCI" ? "TEDARIKCI" : "MUSTERI";
  const page = pageOf(sp.page);
  const canWrite = can(user, "cariler:write");

  const where: Prisma.CariWhereInput = {
    tipi,
    ...(sp.q && {
      OR: [
        { unvan: { contains: sp.q, mode: "insensitive" } },
        { telefon: { contains: sp.q, mode: "insensitive" } },
      ],
    }),
    ...(sp.durum === "aktif" && { isActive: true }),
    ...(sp.durum === "pasif" && { isActive: false }),
  };

  const [rows, total] = await Promise.all([
    db.cari.findMany({ where, orderBy: { unvan: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.cari.count({ where }),
  ]);
  const bakiyeler = await getBakiyeler(rows.map((r) => r.id));
  const label = CARI_TIP_LABELS[tipi];

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Cariler</h1>
        <QueryTabs
          param="tip"
          items={[
            { value: "MUSTERI", label: "Müşteriler" },
            { value: "TEDARIKCI", label: "Tedarikçiler" },
          ]}
        />
        </div>
        {canWrite && (
          <RecordDialog
            autoOpen={sp.yeni === "1"}
            label={`Yeni ${label.toLowerCase()}`}
            title={`Yeni ${label.toLowerCase()}`}
            fields={cariFieldsFor(tipi)}
            initial={{ isActive: "on" }}
            hidden={{ tipi }}
            action={saveCariAction}
          />
        )}
      </header>


      <AutoForm className="toolbar">
        <input type="hidden" name="tip" value={tipi} />
        <SearchInput defaultValue={sp.q ?? ""} placeholder="Unvan veya telefon" className="w-72" />
        <SegmentFilter name="durum" label="Durum" value={sp.durum} options={[{ value: "aktif", label: "Aktif" }, { value: "pasif", label: "Pasif" }]} />
        <button className="sr-only">Filtrele</button>
        {(sp.q || sp.durum) && <Link href={`?tip=${tipi}`} className="text-sm text-slate-500 hover:underline">Temizle</Link>}
      </AutoForm>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-300 bg-slate-50">
            <tr>
              <th className="th">Unvan</th>
              <th className="th">Telefon</th>
              <th className="th text-right">{tipi === "MUSTERI" ? "Bakiye (alacağımız)" : "Bakiye (borcumuz)"}</th>
              <th className="th">Durum</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 && (
              <tr><td colSpan={5} className="td py-8 text-center text-slate-400">Kayıt bulunamadı.</td></tr>
            )}
            {rows.map((c) => {
              const bakiye = bakiyeler.get(c.id);
              return (
                <tr key={c.id}>
                  <td className="td">
                    <Link href={`/cariler/${c.id}`} className="font-medium text-petrol-700 hover:underline">{c.unvan}</Link>
                  </td>
                  <td className="td">{c.telefon ?? "—"}</td>
                  <td className="td text-right font-medium tabular-nums">{formatMoney(bakiye)}</td>
                  <td className="td">
                    <span className={`badge ${c.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {c.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-4">
                      <Link href={`/cariler/${c.id}`} className="text-sm font-medium text-slate-600 hover:underline">Ekstre</Link>
                      {canWrite && (
                        <>
                          <RecordDialog
                            variant="link"
                            label="Düzenle"
                            title={`${label} düzenle`}
                            fields={cariFieldsFor(c.tipi)}
                            hidden={{ id: c.id, tipi: c.tipi }}
                            initial={{
                              unvan: c.unvan,
                              telefon: c.telefon ?? "",
                              acilisBakiyesi: c.acilisBakiyesi.toString(),
                              vadeGunu: c.vadeGunu?.toString() ?? "",
                              notlar: c.notlar ?? "",
                              isActive: c.isActive ? "on" : "",
                            }}
                            action={saveCariAction}
                          />
                          <DeleteButton action={deleteCariAction} id={c.id} confirmText={`"${c.unvan}" silinsin mi? Siparişi veya ödemesi olan kayıt silinemez.`} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pager page={page} total={total} pageSize={PAGE_SIZE} params={{ tip: tipi, q: sp.q, durum: sp.durum }} />
    </div>
  );
}
