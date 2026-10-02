import type { Field } from "@/components/entity-form";

export const CARI_TIP_LABELS = { MUSTERI: "Müşteri", TEDARIKCI: "Tedarikçi" } as const;

const temelAlanlar: Field[] = [
  { name: "unvan", label: "Unvan", required: true, placeholder: "Firma / kişi adı" },
  { name: "telefon", label: "Telefon", type: "tel", half: true, placeholder: "0532 123 45 67" },
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

const vadeAlani: Field = {
  name: "vadeGunu",
  label: "Ödeme vadesi (gün)",
  type: "number",
  step: "1",
  half: true,
  placeholder: "30",
  hint: "Varsayılan 30 gün; isterseniz değiştirin. Vadesi geçen alacak uyarıları buna göre hesaplanır.",
};

/** Cari formu alanları: vade yalnızca müşteri için gösterilir. Yetkili, e-posta ve adres tutulmaz. */
export function cariFieldsFor(tipi: "MUSTERI" | "TEDARIKCI"): Field[] {
  if (tipi !== "MUSTERI") return temelAlanlar;
  const i = temelAlanlar.findIndex((f) => f.name === "acilisBakiyesi");
  return [...temelAlanlar.slice(0, i + 1), vadeAlani, ...temelAlanlar.slice(i + 1)];
}
