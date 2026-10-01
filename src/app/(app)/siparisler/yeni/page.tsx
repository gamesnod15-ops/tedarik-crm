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

export default async function YeniSiparisPage({ searchParams }: { searchParams: Promise<{ tip?: string; cari?: string }> }) {
  await requireUser("siparisler:write");
  const sp = await searchParams;

  // Cari sayfasından geliyorsa tip ve cari otomatik belirlenir.
  const cari = sp.cari ? await db.cari.findUnique({ where: { id: sp.cari }, select: { id: true, tipi: true } }) : null;
  // Tedarikçi alımları basit "Alım" kaydıdır; çok kalemli sipariş formu yalnızca müşteri içindir.
  if (cari?.tipi === "TEDARIKCI" || sp.tip === "TEDARIKCI") redirect("/siparisler?tip=TEDARIKCI");
  const tip = "MUSTERI" as const;
  const { cariler, urunler } = await loadSiparisFormData(tip, { cariId: cari?.id });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/siparisler?tip=${tip}`} className="text-sm text-slate-500 hover:underline">← Siparişler</Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Yeni müşteri siparişi</h1>
        </div>
        {/* Listede olmayan ürün için formdan ayrılmadan ürün eklenir; kaydedince listeye gelir. */}
        <RecordDialog variant="secondary" label="+ Yeni ürün" title="Yeni ürün" fields={urunFields} initial={urunVarsayilan} action={saveUrunAction} />
      </header>
      <SiparisForm
        tip={tip}
        cariler={cariler}
        urunler={urunler}
        initial={{ cariId: cari?.id ?? "", tarih: todayInput(), aciklama: "", durum: "BEKLIYOR", kalemler: [] }}
        action={saveSiparisAction}
      />
    </div>
  );
}
