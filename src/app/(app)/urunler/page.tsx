import Link from "next/link";
import { SearchInput } from "@/components/search-input";
import { AutoForm } from "@/components/auto-form";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/session";
import { formatMoney } from "@/lib/format";
import { PAGE_SIZE, pageOf } from "@/lib/crud";
import { Pager } from "@/components/pager";
import { RecordDialog } from "@/components/record-dialog";
import { DeleteButton } from "@/components/delete-button";
import { deleteUrunAction, saveUrunAction } from "../siparisler/actions";
import { urunFields, urunVarsayilan } from "./fields";
import { SegmentFilter } from "@/components/segment-filter";

type SP = { q?: string; durum?: string; page?: string; yeni?: string };

export default async function UrunlerPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser("siparisler:read");
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const canWrite = can(user, "siparisler:write");

  const where: Prisma.UrunWhereInput = {
    ...(sp.q && { ad: { contains: sp.q, mode: "insensitive" } }),
    ...(sp.durum === "aktif" && { isActive: true }),
    ...(sp.durum === "pasif" && { isActive: false }),
  };
  const [rows, total, kullanim] = await Promise.all([
    db.urun.findMany({ where, orderBy: { ad: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.urun.count({ where }),
    db.siparisKalem.groupBy({ by: ["urunId"], _count: { _all: true } }),
  ]);
  const kullanimSayisi = new Map(kullanim.map((k) => [k.urunId, k._count._all]));

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Ürünler</h1>
        </div>
        {canWrite && (
          <RecordDialog autoOpen={sp.yeni === "1"} label="Yeni ürün" title="Yeni ürün" fields={urunFields} initial={urunVarsayilan} action={saveUrunAction} />
        )}
      </header>

      <AutoForm className="toolbar">
        <SearchInput defaultValue={sp.q ?? ""} placeholder="Ürün adı" className="w-72" />
        <SegmentFilter name="durum" label="Durum" value={sp.durum} options={[{ value: "aktif", label: "Aktif" }, { value: "pasif", label: "Pasif" }]} />
        <button className="sr-only">Filtrele</button>
        {(sp.q || sp.durum) && <Link href="/urunler" className="text-sm text-slate-500 hover:underline">Temizle</Link>}
      </AutoForm>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-300 bg-slate-50">
            <tr>
              <th className="th">Ürün</th>
              <th className="th">Birim</th>
              <th className="th text-right">Birim fiyat</th>
              <th className="th text-right">KDV</th>
              <th className="th text-right">Sipariş satırı</th>
              <th className="th">Durum</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="td py-10 text-center text-slate-400">
                  {sp.q || sp.durum ? "Kayıt bulunamadı." : "Henüz ürün yok. Sağ üstteki “Yeni ürün” ile ilk ürünü ekleyin."}
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="td font-medium text-slate-900">
                  {u.ad}
                  {u.aciklama && <span className="block max-w-sm truncate text-xs font-normal text-slate-500" title={u.aciklama}>{u.aciklama}</span>}
                </td>
                <td className="td">{u.birim}</td>
                <td className="td text-right tabular-nums">{formatMoney(u.birimFiyat)}</td>
                <td className="td text-right tabular-nums">%{u.kdvOrani}</td>
                <td className="td text-right tabular-nums text-slate-500">{kullanimSayisi.get(u.id) ?? 0}</td>
                <td className="td">
                  <span className={`badge ${u.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{u.isActive ? "Aktif" : "Pasif"}</span>
                </td>
                <td className="td">
                  {canWrite && (
                    <div className="flex items-center justify-end gap-4">
                      <RecordDialog
                        variant="link"
                        label="Düzenle"
                        title="Ürün düzenle"
                        fields={urunFields}
                        hidden={{ id: u.id }}
                        initial={{
                          ad: u.ad,
                          birim: u.birim,
                          birimFiyat: u.birimFiyat.toString(),
                          kdvOrani: String(u.kdvOrani),
                          aciklama: u.aciklama ?? "",
                          isActive: u.isActive ? "on" : "",
                        }}
                        action={saveUrunAction}
                      />
                      <DeleteButton
                        action={deleteUrunAction}
                        id={u.id}
                        confirmText={`"${u.ad}" silinsin mi? Siparişlerde kullanılan ürün silinemez; pasife alabilirsiniz.`}
                      />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} total={total} pageSize={PAGE_SIZE} params={{ q: sp.q, durum: sp.durum }} />
    </div>
  );
}
