import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { toDateInput } from "@/lib/format";
import { SiparisForm } from "../siparis-form";
import { loadSiparisFormData } from "../form-data";
import { saveSiparisAction } from "../actions";

export default async function SiparisDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("siparisler:write");
  const { id } = await params;

  const siparis = await db.siparis.findUnique({
    where: { id },
    include: { cari: { select: { tipi: true } }, kalemler: { orderBy: { id: "asc" } } },
  });
  if (!siparis) notFound();

  const tip = siparis.cari.tipi;
  const { cariler, urunler } = await loadSiparisFormData(tip, {
    cariId: siparis.cariId,
    urunIds: siparis.kalemler.map((k) => k.urunId),
  });

  return (
    <div className="space-y-5">
      <header>
        <Link href={`/siparisler?tip=${tip}`} className="text-sm text-slate-500 hover:underline">← Siparişler</Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
          {tip === "MUSTERI" ? "Müşteri siparişi" : "Tedarikçi alımı"} #{siparis.no}
        </h1>
      </header>
      <SiparisForm
        tip={tip}
        cariler={cariler}
        urunler={urunler}
        initial={{
          id: siparis.id,
          cariId: siparis.cariId,
          tarih: toDateInput(siparis.tarih),
          aciklama: siparis.aciklama ?? "",
          durum: siparis.durum,
          kalemler: siparis.kalemler.map((k) => ({
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
