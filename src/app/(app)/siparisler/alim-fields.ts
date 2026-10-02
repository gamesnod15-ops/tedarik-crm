import type { Field, Option } from "@/components/entity-form";

/** Tedarikçi listesinde "yeni tedarikçi ekle" seçeneğinin değeri: seçilince unvan/telefon alanları açılır, tedarikçi alımla birlikte oluşturulur. */
export const YENI_TEDARIKCI = "__yeni__";

/** Tedarikçi (malzemeci) alım formu. cariOptions: sadece tedarikçiler. */
export function alimFields(cariOptions: Option[]): Field[] {
  const yeni = { field: "cariId", in: [YENI_TEDARIKCI] };
  return [
    { name: "tarih", label: "Tarih", type: "date", required: true, half: true },
    { name: "faturaNo", label: "Fatura no", half: true, placeholder: "Ör. A-2026-0142" },
    {
      name: "cariId",
      label: "Tedarikçi",
      type: "select",
      required: true,
      options: [{ value: YENI_TEDARIKCI, label: "+ Yeni tedarikçi ekle" }, ...cariOptions],
      placeholder: "Tedarikçi seçin…",
      hint: "Listede yoksa \"+ Yeni tedarikçi ekle\" ile buradan ekleyebilirsiniz.",
    },
    { name: "yeniUnvan", label: "Yeni tedarikçi unvanı", required: true, half: true, placeholder: "Firma / kişi adı", showIf: yeni },
    { name: "yeniTelefon", label: "Telefon", type: "tel", half: true, placeholder: "0532 123 45 67", showIf: yeni },
    { name: "miktar", label: "Miktar", type: "number", step: "0.001", half: true, placeholder: "İsteğe bağlı" },
    { name: "toplam", label: "Toplam (KDV dahil, TL)", type: "number", required: true, half: true, placeholder: "0,00" },
    { name: "aciklama", label: "Açıklama", type: "textarea", placeholder: "Ör. kumaş, iplik, etiket" },
  ];
}

/** Cari sayfasından, tedarikçi sabitken kullanılan sürüm. */
export function alimFieldsForCari(): Field[] {
  return alimFields([]).filter((f) => !["cariId", "yeniUnvan", "yeniTelefon"].includes(f.name));
}
