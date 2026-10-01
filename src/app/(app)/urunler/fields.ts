import type { Field } from "@/components/entity-form";

export const urunFields: Field[] = [
  { name: "ad", label: "Ürün adı", required: true, placeholder: "Ör. Etiket, kumaş, iplik" },
  { name: "birim", label: "Birim", required: true, half: true, placeholder: "Adet, kg, metre…" },
  { name: "birimFiyat", label: "Varsayılan birim fiyat (TL)", type: "number", half: true, placeholder: "0,00", hint: "KDV hariç. Siparişte değiştirilebilir." },
  { name: "kdvOrani", label: "KDV oranı (%)", type: "number", step: "1", required: true, half: true, placeholder: "Ör. 10 veya 20", hint: "Elle girilir; siparişe otomatik gelir, orada da değiştirilebilir." },
  { name: "aciklama", label: "Açıklama", type: "textarea", placeholder: "İsteğe bağlı not" },
  { name: "isActive", label: "Aktif", type: "checkbox" },
];

export const urunVarsayilan = { birim: "Adet", isActive: "on" };
