import type { Field, Option } from "@/components/entity-form";

export const ODEME_SEKLI_LABELS = {
  NAKIT: "Nakit",
  HAVALE_EFT: "Havale / EFT",
  CEK: "Çek",
  SENET: "Senet",
  KREDI_KARTI: "Kredi kartı",
  DIGER: "Diğer",
} as const;

export const ISLEM_TIPI_LABELS = { TAHSILAT: "Tahsilat", ODEME: "Ödeme" } as const;

const sekliOptions: Option[] = Object.entries(ODEME_SEKLI_LABELS).map(([value, label]) => ({ value, label }));
const islemOptions: Option[] = Object.entries(ISLEM_TIPI_LABELS).map(([value, label]) => ({ value, label }));

/** cariOptions: group = cari tipi (MUSTERI / TEDARIKCI). Cari tipi seçilince cari listesi ve işlem tipi buna göre ayarlanır. */
export function odemeFields(cariOptions: Option[]): Field[] {
  return [
    { name: "tarih", label: "Tarih", type: "date", required: true, half: true },
    {
      name: "cariTipi",
      label: "Cari tipi",
      type: "select",
      half: true,
      options: [
        { value: "MUSTERI", label: "Müşteri" },
        { value: "TEDARIKCI", label: "Tedarikçi" },
      ],
      required: true,
    },
    { name: "cariId", label: "Cari", type: "select", required: true, options: cariOptions, groupBy: "cariTipi", placeholder: "Önce cari tipini seçin" },
    {
      name: "islemTipi",
      label: "İşlem tipi",
      type: "select",
      required: true,
      half: true,
      options: islemOptions,
      autoFrom: { field: "cariTipi", map: { MUSTERI: "TAHSILAT", TEDARIKCI: "ODEME" } },
    },
    { name: "tutar", label: "Tutar (TL)", type: "number", required: true, half: true, placeholder: "0,00" },
    { name: "odemeSekli", label: "Ödeme şekli", type: "select", required: true, options: sekliOptions },
    { name: "aciklama", label: "Açıklama", type: "textarea", placeholder: "İsteğe bağlı not" },
  ];
}

/** Cari sayfasından, cari sabitken kullanılan sürüm. */
export function odemeFieldsForCari(): Field[] {
  return [
    { name: "tarih", label: "Tarih", type: "date", required: true, half: true },
    { name: "islemTipi", label: "İşlem tipi", type: "select", required: true, half: true, options: islemOptions },
    { name: "tutar", label: "Tutar (TL)", type: "number", required: true, half: true, placeholder: "0,00" },
    { name: "odemeSekli", label: "Ödeme şekli", type: "select", required: true, half: true, options: sekliOptions },
    { name: "aciklama", label: "Açıklama", type: "textarea", placeholder: "İsteğe bağlı not" },
  ];
}

export const masrafFields: Field[] = [
  { name: "tarih", label: "Tarih", type: "date", required: true, half: true },
  { name: "tutar", label: "Tutar (TL)", type: "number", required: true, half: true, placeholder: "0,00" },
  { name: "aciklama", label: "Açıklama", required: true, placeholder: "Ör. Yakıt, kira, market" },
  { name: "kategori", label: "Kategori", half: true, placeholder: "Ör. Ulaşım" },
  { name: "odemeSekli", label: "Ödeme şekli", type: "select", half: true, options: sekliOptions, placeholder: "Belirtilmedi" },
];
