// Excel'den kopyalanan satırları (sekme ile ayrılmış hücreler) sipariş kalemlerine çevirir. Tarayıcıda ve sunucuda kullanılabilir.

export type PasteRow = {
  /** Ürün / model adı (boşluklar sadeleştirilmiş). */
  ad: string;
  adet: string;
  /** Boşsa ürünün kayıtlı fiyatı kullanılır. */
  fiyat: string;
  /** Boşsa ürünün KDV'si ya da formdaki varsayılan KDV kullanılır. */
  kdv: string;
};

/** Ürün adı eşleştirme anahtarı: büyük/küçük harf ve fazla boşluk önemsiz. */
export const urunAnahtari = (ad: string) => ad.replace(/\s+/g, " ").trim().toLocaleLowerCase("tr");

/**
 * "1.065", "8,00 TL", "₺ 1.234,56", "12.5" gibi değerleri "1065", "8.00", "1234.56", "12.5" yapar.
 * Tanınmazsa null döner.
 */
export function sayiCoz(raw: string): string | null {
  let s = raw.replace(/[₺%]|TL|tl/g, "").replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  return /^-?\d+(\.\d+)?$/.test(s) ? s : null;
}

/**
 * Yapıştırılan metni ayrıştırır. Beklenen sütun sırası: Ürün/Model | Adet | Birim fiyat | (KDV %).
 * Adet sütunu sayı olmayan satırlar (başlık satırı gibi) atlanır.
 */
export function siparisYapistirmaCoz(text: string): { satirlar: PasteRow[]; atlanan: number } {
  const ayirici = text.includes("\t") ? "\t" : ";";
  const satirlar: PasteRow[] = [];
  let atlanan = 0;

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const hucre = line.split(ayirici).map((h) => h.trim());
    const ad = (hucre[0] ?? "").replace(/\s+/g, " ").trim();
    const adet = sayiCoz(hucre[1] ?? "");
    if (!ad || adet === null || Number(adet) <= 0) {
      atlanan++;
      continue;
    }
    satirlar.push({
      ad,
      adet,
      fiyat: sayiCoz(hucre[2] ?? "") ?? "",
      kdv: sayiCoz(hucre[3] ?? "") ?? "",
    });
  }
  return { satirlar, atlanan };
}
