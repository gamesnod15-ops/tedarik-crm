import type { Field } from "@/components/entity-form";
import { Prisma } from "@prisma/client";
import { formatDate } from "@/lib/format";

export const IZIN_LABELS = { YILLIK: "Yıllık izin", RAPORLU: "Raporlu", UCRETSIZ: "Ücretsiz izin", MAZERET: "Mazeret izni", DIGER: "Diğer" } as const;
export const TUR_LABELS = { GIRIS_CIKIS: "Giriş / Çıkış", IZIN: "İzin" } as const;

// Personel kartı: ad soyad, maaş ve açıklama. Yapılan ödemeler personel detay sayfasında ayrı kayıtlar olarak tutulur.
// Kalan miktar = o ayın sabit maaşı − o ayın ödemeleri. Maaş ve ödemeler finans, bakiye ve rapor hesaplarına katılmaz.
export const personelFields: Field[] = [
  { name: "adSoyad", label: "Ad soyad", required: true, placeholder: "Adı Soyadı" },
  { name: "maas", label: "Sabit maaş (TL)", type: "number", placeholder: "0,00", hint: "Değişiklik bu aydan itibaren geçerlidir; önceki aylar eski maaşla kalır. Ödemeler bu tutardan düşülür. Finans ve raporlara katılmaz." },
  { name: "aciklama", label: "Açıklama", type: "textarea", placeholder: "İsteğe bağlı not" },
];

export function hareketFields(personelOptions: { value: string; label: string }[]): Field[] {
  return [
    { name: "personelId", label: "Personel", type: "select", required: true, options: personelOptions, placeholder: "Personel seçin…" },
    {
      name: "islemTuru",
      label: "İşlem türü",
      type: "select",
      required: true,
      half: true,
      options: Object.entries(TUR_LABELS).map(([value, label]) => ({ value, label })),
    },
    { name: "tarih", label: "Tarih", type: "date", required: true, half: true },
    { name: "girisSaati", label: "Giriş saati", type: "time", half: true, required: true, showIf: { field: "islemTuru", in: ["GIRIS_CIKIS"] } },
    { name: "cikisSaati", label: "Çıkış saati", type: "time", half: true, showIf: { field: "islemTuru", in: ["GIRIS_CIKIS"] } },
    {
      name: "izinTuru",
      label: "İzin türü",
      type: "select",
      required: true,
      options: Object.entries(IZIN_LABELS).map(([value, label]) => ({ value, label })),
      showIf: { field: "islemTuru", in: ["IZIN"] },
    },
    { name: "izinBaslangic", label: "İzin başlangıç tarihi", type: "date", half: true, required: true, showIf: { field: "islemTuru", in: ["IZIN"] } },
    { name: "izinBitis", label: "İzin bitiş tarihi", type: "date", half: true, required: true, showIf: { field: "islemTuru", in: ["IZIN"] } },
    { name: "aciklama", label: "Açıklama", type: "textarea", placeholder: "İsteğe bağlı not" },
  ];
}

/** Personel ödemesi (maaş vb.) formu. Yalnızca bilgi: hiçbir hesaplamaya katılmaz. */
export const odemeFields: Field[] = [
  { name: "tarih", label: "Tarih", type: "date", required: true, half: true },
  { name: "tutar", label: "Tutar (TL)", type: "number", required: true, half: true, placeholder: "0,00" },
  { name: "aciklama", label: "Açıklama", type: "textarea", placeholder: "Ör. Ekim maaşı, avans, prim" },
];

/** İş hareketinin tek satırlık özeti (giriş-çıkış saatleri ya da izin türü ve tarihleri). */
export function hareketAyrinti(h: {
  islemTuru: keyof typeof TUR_LABELS;
  girisSaati: string | null;
  cikisSaati: string | null;
  izinTuru: keyof typeof IZIN_LABELS | null;
  izinBaslangic: Date | null;
  izinBitis: Date | null;
}) {
  return h.islemTuru === "GIRIS_CIKIS"
    ? `${h.girisSaati ?? "—"} → ${h.cikisSaati ?? "—"}`
    : `${h.izinTuru ? IZIN_LABELS[h.izinTuru] : "İzin"}: ${formatDate(h.izinBaslangic)} – ${formatDate(h.izinBitis)}`;
}

/** Kalan miktar = sabit maaş − toplam ödeme. Maaş girilmemişse null. Negatifse maaştan fazla ödenmiştir. */
export function kalanMiktar(maas: Prisma.Decimal | null, toplamOdeme: Prisma.Decimal | null | undefined) {
  if (maas === null) return null;
  return maas.sub(toplamOdeme ?? 0);
}

export type MaasKaydi = { ay: Date; maas: Prisma.Decimal | null };

/**
 * Bir ayın sabit maaşı: o ay ya da öncesindeki en son maaş kaydı. `ay` ayın 1'idir (UTC). Kayıt yoksa null.
 * `buAy` verilirse gelecek aylar için null döner: maaş yalnızca içinde bulunulan aya kadar devreder, yeni ay başlayınca kendiliğinden geçer.
 */
export function aylikMaas(gecmis: MaasKaydi[], ay: Date, buAy?: Date) {
  if (buAy && ay > buAy) return null;
  let son: MaasKaydi | undefined;
  for (const k of gecmis) if (k.ay <= ay && (!son || k.ay > son.ay)) son = k;
  return son?.maas ?? null;
}

/** Toplam hak ediş: ilk maaş ayından `sonAy` dahil her ayın sabit maaşının toplamı. Maaş kaydı yoksa null. */
export function toplamHakedis(gecmis: MaasKaydi[], sonAy: Date) {
  if (gecmis.length === 0) return null;
  const ilk = gecmis.reduce((a, k) => (k.ay < a ? k.ay : a), gecmis[0].ay);
  let toplam = new Prisma.Decimal(0);
  for (let ay = ilk; ay <= sonAy; ay = new Date(Date.UTC(ay.getUTCFullYear(), ay.getUTCMonth() + 1, 1))) {
    toplam = toplam.add(aylikMaas(gecmis, ay) ?? 0);
  }
  return toplam;
}
