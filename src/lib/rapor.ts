import { db } from "./db";
import { getOzet, siparisToplam } from "./finance";
import { ISLEM_TIPI_LABELS, ODEME_SEKLI_LABELS } from "@/app/(app)/finans/fields";

export const RAPOR_LIMIT = 500;

/** Genel finans raporu: özet kutuları + tarih sıralı hareket listesi. Sayfa ve PDF aynı veriyi kullanır. */
export async function getRapor(from: Date, to: Date) {
  const aralik = { gte: from, lte: to };

  const [ozet, siparisler, masraflar, odemeler, alimlar] = await Promise.all([
    getOzet(from, to),
    db.siparis.findMany({
      where: { tarih: aralik, durum: { not: "IPTAL" } },
      orderBy: [{ tarih: "asc" }, { no: "asc" }],
      take: RAPOR_LIMIT,
      include: { cari: { select: { unvan: true, tipi: true } }, kalemler: { include: { urun: { select: { ad: true } } } } },
    }),
    db.masraf.findMany({ where: { tarih: aralik }, orderBy: [{ tarih: "asc" }, { createdAt: "asc" }], take: RAPOR_LIMIT }),
    db.odeme.findMany({
      where: { tarih: aralik },
      orderBy: [{ tarih: "asc" }, { createdAt: "asc" }],
      take: RAPOR_LIMIT,
      include: { cari: { select: { unvan: true } } },
    }),
    db.alim.findMany({
      where: { tarih: aralik },
      orderBy: [{ tarih: "asc" }, { createdAt: "asc" }],
      take: RAPOR_LIMIT,
      include: { cari: { select: { unvan: true } } },
    }),
  ]);

  // Tutar işareti nakit yönünü gösterir: gelir (+) / gider (−).
  const satirlar = [
    ...siparisler.map((s) => {
      const toplam = siparisToplam(s.kalemler);
      const musteri = s.cari.tipi === "MUSTERI";
      return {
        key: `s${s.id}`,
        tarih: s.tarih,
        tur: musteri ? "Müşteri Siparişi" : "Tedarikçi Alımı",
        ad: s.cari.unvan,
        aciklama: [...new Set(s.kalemler.map((k) => k.urun.ad))].join(", "),
        tutar: musteri ? toplam : toplam.neg(),
      };
    }),
    ...alimlar.map((a) => ({
      key: `a${a.id}`,
      tarih: a.tarih,
      tur: "Tedarikçi Alımı",
      ad: a.cari.unvan,
      aciklama: [a.faturaNo && `Fatura: ${a.faturaNo}`, a.aciklama].filter(Boolean).join(" · "),
      tutar: a.toplam.neg(),
    })),
    ...masraflar.map((m) => ({
      key: `m${m.id}`,
      tarih: m.tarih,
      tur: "Gider",
      ad: m.aciklama,
      aciklama: m.kategori ?? "",
      tutar: m.tutar.neg(),
    })),
    ...odemeler.map((o) => ({
      key: `o${o.id}`,
      tarih: o.tarih,
      tur: ISLEM_TIPI_LABELS[o.islemTipi],
      ad: o.cari.unvan,
      aciklama: ODEME_SEKLI_LABELS[o.odemeSekli],
      tutar: o.islemTipi === "TAHSILAT" ? o.tutar : o.tutar.neg(),
    })),
  ]
    .sort((a, b) => a.tarih.getTime() - b.tarih.getTime())
    .slice(0, RAPOR_LIMIT);

  const kesildi = [siparisler, masraflar, odemeler, alimlar].some((l) => l.length === RAPOR_LIMIT);
  return { ozet, satirlar, kesildi };
}
