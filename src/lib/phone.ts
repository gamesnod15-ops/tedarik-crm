// Telefon biçimi: 0XXX XXX XX XX (ör. 0532 123 45 67). Hem tarayıcıda (yazarken maske) hem sunucuda (doğrulama) kullanılır.

/** Yazılan değeri maskeler: yalnızca rakam, başına 0 eklenir, en fazla 11 hane. +90 / 90 ile başlayan yapıştırmalar da çözülür. */
export function formatPhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("90")) d = d.slice(2);
  if (d.length > 0 && d[0] !== "0") d = "0" + d;
  // Ülke kodu (90) tek tek yazılırken de atılır: "0" + "90" → geçerli bir alan kodu olamaz.
  if (d.startsWith("090")) d = "0" + d.slice(3);
  d = d.slice(0, 11);
  return [d.slice(0, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)].filter(Boolean).join(" ");
}

const VALID = /^0[2-58]\d{2} \d{3} \d{2} \d{2}$/;

/** Geçerliyse biçimli telefonu, değilse null döner. */
export function normalizePhone(raw: string): string | null {
  const f = formatPhone(raw);
  return VALID.test(f) ? f : null;
}

export const PHONE_PATTERN = "0[2-58]\\d{2} \\d{3} \\d{2} \\d{2}";
export const PHONE_HINT = "0532 123 45 67 biçiminde girin";
