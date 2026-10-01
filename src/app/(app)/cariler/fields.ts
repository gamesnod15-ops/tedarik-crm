import type { Field } from "@/components/entity-form";

export const CARI_TIP_LABELS = { MUSTERI: "Müşteri", TEDARIKCI: "Tedarikçi" } as const;

export const cariFields: Field[] = [
  { name: "unvan", label: "Unvan", required: true, placeholder: "Firma / kişi adı" },
  { name: "yetkili", label: "Yetkili", half: true, placeholder: "Yetkili kişi" },
  { name: "telefon", label: "Telefon", type: "tel", half: true, placeholder: "0532 123 45 67" },
  { name: "eposta", label: "E-posta", type: "email", half: true, placeholder: "ornek@firma.com" },
  { name: "adres", label: "Adres", type: "textarea", placeholder: "Açık adres" },
  {
    name: "acilisBakiyesi",
    label: "Açılış bakiyesi (TL)",
    type: "number",
    half: true,
    placeholder: "0,00",
    hint: "Devreden bakiye. + değer: müşteri bize borçlu / tedarikçiye borcumuz var.",
  },
  { name: "notlar", label: "Notlar", type: "textarea", placeholder: "İç not" },
  { name: "isActive", label: "Aktif", type: "checkbox" },
];
