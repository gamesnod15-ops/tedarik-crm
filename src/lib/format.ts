const TZ = process.env.APP_TIMEZONE || "Europe/Istanbul";

const fmt = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: TZ,
});

export function formatDateTime(date: Date | null | undefined) {
  return date ? fmt.format(date) : "—";
}

// Saf tarih alanları (@db.Date) UTC gece yarısı olarak saklanır; saat dilimi kayması olmasın diye UTC ile gösterilir.
const dateFmt = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

export function formatDate(date: Date | null | undefined) {
  return date ? dateFmt.format(date) : "—";
}

const moneyFmt = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Numeric = number | string | { toString(): string };

export function formatMoney(value: Numeric | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${moneyFmt.format(Number(value.toString()))} TL`;
}

const qtyFmt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 3 });

export function formatQty(value: Numeric | null | undefined) {
  if (value === null || value === undefined) return "—";
  return qtyFmt.format(Number(value.toString()));
}

/** <input type="date"> değeri (YYYY-MM-DD). */
export function toDateInput(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "";
}

/** "YYYY-MM-DD" → UTC gece yarısı Date; geçersizse null. */
export function parseDateInput(value: string | undefined | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function todayInput() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date());
}

export function monthStartInput() {
  return `${todayInput().slice(0, 8)}01`;
}
