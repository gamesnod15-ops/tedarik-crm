import type { Field, Option } from "@/components/entity-form";

/** Tedarikçi (malzemeci) alım formu. cariOptions: sadece tedarikçiler. */
export function alimFields(cariOptions: Option[]): Field[] {
  return [
    { name: "tarih", label: "Tarih", type: "date", required: true, half: true },
    { name: "faturaNo", label: "Fatura no", half: true, placeholder: "Ör. A-2026-0142" },
    { name: "cariId", label: "Tedarikçi", type: "select", required: true, options: cariOptions, placeholder: "Tedarikçi seçin…" },
    { name: "miktar", label: "Miktar", type: "number", step: "0.001", half: true, placeholder: "İsteğe bağlı" },
    { name: "toplam", label: "Toplam (KDV dahil, TL)", type: "number", required: true, half: true, placeholder: "0,00" },
    { name: "aciklama", label: "Açıklama", type: "textarea", placeholder: "Ör. kumaş, iplik, etiket" },
  ];
}

/** Cari sayfasından, tedarikçi sabitken kullanılan sürüm. */
export function alimFieldsForCari(): Field[] {
  return alimFields([]).filter((f) => f.name !== "cariId");
}
