export const DURUMLAR = ["BEKLIYOR", "HAZIRLANIYOR", "TESLIM_EDILDI", "FATURALANDI", "IPTAL"] as const;
export type SiparisDurumu = (typeof DURUMLAR)[number];

export const DURUM_LABELS: Record<SiparisDurumu, string> = {
  BEKLIYOR: "Bekliyor",
  HAZIRLANIYOR: "Hazırlanıyor",
  TESLIM_EDILDI: "Teslim edildi",
  FATURALANDI: "Faturalandı",
  IPTAL: "İptal",
};

export const DURUM_BADGE: Record<SiparisDurumu, string> = {
  BEKLIYOR: "bg-amber-50 text-amber-700",
  HAZIRLANIYOR: "bg-sky-50 text-sky-700",
  TESLIM_EDILDI: "bg-emerald-50 text-emerald-700",
  FATURALANDI: "bg-petrol-50 text-petrol-700",
  IPTAL: "bg-slate-100 text-slate-500 line-through",
};

export function isDurum(v: unknown): v is SiparisDurumu {
  return typeof v === "string" && (DURUMLAR as readonly string[]).includes(v);
}
