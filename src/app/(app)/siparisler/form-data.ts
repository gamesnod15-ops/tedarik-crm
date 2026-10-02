import { db } from "@/lib/db";
import { urunAnahtari } from "@/lib/paste";

/** Sipariş formu için seçenekler: aktif cariler (+ düzenlenen siparişin carisi) ve öneri olarak aktif ürün kartları. */
export async function loadSiparisFormData(tip: "MUSTERI" | "TEDARIKCI", keep?: { cariId?: string }) {
  const [cariler, urunler, kullanim] = await Promise.all([
    db.cari.findMany({
      where: { tipi: tip, OR: [{ isActive: true }, ...(keep?.cariId ? [{ id: keep.cariId }] : [])] },
      orderBy: { unvan: "asc" },
      select: { id: true, unvan: true },
    }),
    db.urun.findMany({
      where: { isActive: true },
      orderBy: { ad: "asc" },
    }),
    db.siparisKalem.groupBy({ by: ["urunAdi"], _count: { _all: true } }),
  ]);
  // Sık kullanılan ürünler listenin başında çıkar (aynı sıklıkta olanlar ada göre).
  const sayi = new Map<string, number>();
  for (const k of kullanim) sayi.set(urunAnahtari(k.urunAdi), (sayi.get(urunAnahtari(k.urunAdi)) ?? 0) + k._count._all);
  const kac = (ad: string) => sayi.get(urunAnahtari(ad)) ?? 0;
  urunler.sort((a, b) => kac(b.ad) - kac(a.ad) || a.ad.localeCompare(b.ad, "tr"));
  return {
    cariler,
    urunler: urunler.map((u) => ({ id: u.id, ad: u.ad, birim: u.birim, birimFiyat: u.birimFiyat.toString(), kdvOrani: u.kdvOrani })),
  };
}
