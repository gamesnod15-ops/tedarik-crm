import { db } from "@/lib/db";

/** Sipariş formu için seçenekler: aktif cariler/ürünler (+ düzenlenen siparişte zaten kullanılanlar). */
export async function loadSiparisFormData(tip: "MUSTERI" | "TEDARIKCI", keep?: { cariId?: string; urunIds?: string[] }) {
  const [cariler, urunler] = await Promise.all([
    db.cari.findMany({
      where: { tipi: tip, OR: [{ isActive: true }, ...(keep?.cariId ? [{ id: keep.cariId }] : [])] },
      orderBy: { unvan: "asc" },
      select: { id: true, unvan: true },
    }),
    db.urun.findMany({
      where: { OR: [{ isActive: true }, ...(keep?.urunIds?.length ? [{ id: { in: keep.urunIds } }] : [])] },
      orderBy: { ad: "asc" },
    }),
  ]);
  return {
    cariler,
    urunler: urunler.map((u) => ({ id: u.id, ad: u.ad, birim: u.birim, birimFiyat: u.birimFiyat.toString(), kdvOrani: u.kdvOrani })),
  };
}
