const TZ = process.env.APP_TIMEZONE || "Europe/Istanbul";

const fmt = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: TZ,
});

export function formatDateTime(date: Date | null | undefined) {
  return date ? fmt.format(date) : "—";
}
