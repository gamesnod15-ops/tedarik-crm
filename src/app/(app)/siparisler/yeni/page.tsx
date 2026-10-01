import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { todayInput } from "@/lib/format";
import { SiparisForm } from "../siparis-form";
import { loadSiparisFormData } from "../form-data";
import { saveSiparisAction, saveUrunAction } from "../actions";
import { RecordDialog } from "@/components/record-dialog";
import { urunFields, urunVarsayilan } from "../../urunler/fields";

export default async function YeniSiparisPage({ searchParams }: { searchParams: Promise<{ tip?: string; cari?: string; kopya?: string }> }) {
  await requireUser("siparisler:write");
  const sp = await searchParams;

  // Cari sayfasından geliyorsa tip ve cari otomatik belirlenir.
  const cari = sp.cari ? await db.cari.findUnique({ where: { id: sp.cari }, select: { id: true, tipi: true } }) : null;
  // Tedarikçi alımları basit "Alım" kaydıdır; çok kalemli sipariş formu yalnızca müşteri içindir.
  if (cari?.tipi === "TEDARIKCI" || sp.tip === "TEDARIKCI") redirect("/siparisler?tip=TEDARIKCI");
  const tip = "MUSTERI" as const;

  // "Kopyala": mevcut bir siparişin müşterisi ve kalemleri yeni siparişe önceden doldurulur (tarih bugün, durum Bekliyor).
  const kaynak = sp.kopya
    ? await db.siparis.findUnique({ where: { id: sp.kopya }, include: { cari: { select: { tipi: true } }, kalemler: { orderBy: { id: "asc" } } } })
    : null;
  const kopya = kaynak && kaynak.cari.tipi === "MUSTERI" ? kaynak : null;

  const { cariler, urunler } = await loadSiparisFormData(tip, { cariId: cari?.id ?? kopya?.cariId, urunIds: kopya?.kalemler.map((k) => k.urunId) });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/siparisler?tip=${tip}`} className="text-sm text-slate-500 hover:underline">← Siparişler</Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Yeni müşteri siparişi</h1>
          {kopya && <p className="mt-0.5 text-sm text-slate-500">#{kopya.no} numaralı siparişten kopyalandı. Tarihi ve fiyatları kontrol edip kaydedin.</p>}
        </div>
        {/* Listede olmayan ürün için formdan ayrılmadan ürün eklenir; kaydedince listeye gelir. */}
        <RecordDialog variant="secondary" label="+ Yeni ürün" title="Yeni ürün" fields={urunFields} initial={urunVarsayilan} action={saveUrunAction} />
      </header>
      <SiparisForm
        tip={tip}
        cariler={cariler}
        urunler={urunler}
        initial={{
          cariId: cari?.id ?? kopya?.cariId ?? "",
          tarih: todayInput(),
          aciklama: kopya?.aciklama ?? "",
          durum: "BEKLIYOR",
          kalemler: (kopya?.kalemler ?? []).map((k) => ({
            urunId: k.urunId,
            adet: k.adet.toString(),
            birimFiyat: k.birimFiyat.toString(),
            kdvOrani: String(k.kdvOrani),
            aciklama: k.aciklama ?? "",
          })),
        }}
        action={saveSiparisAction}
      />
    </div>
  );
}
