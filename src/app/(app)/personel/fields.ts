import type { Field } from "@/components/entity-form";
import { formatDate } from "@/lib/format";

export const IZIN_LABELS = { YILLIK: "Yıllık izin", RAPORLU: "Raporlu", UCRETSIZ: "Ücretsiz izin", MAZERET: "Mazeret izni", DIGER: "Diğer" } as const;
export const TUR_LABELS = { GIRIS_CIKIS: "Giriş / Çıkış", IZIN: "İzin" } as const;

// Personel kartı: ad soyad, maaş ve açıklama. Yapılan ödemeler personel detay sayfasında ayrı kayıtlar olarak tutulur.
// Maaş ve ödemeler yalnızca bilgi amaçlıdır, hiçbir hesaplamaya katılmaz.
export const personelFields: Field[] = [
  { name: "adSoyad", label: "Ad soyad", required: true, placeholder: "Adı Soyadı" },
  { name: "maas", label: "Maaş (TL)", type: "number", placeholder: "0,00", hint: "İsteğe bağlı. Bilgi amaçlıdır, hesaplamalara katılmaz." },
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
