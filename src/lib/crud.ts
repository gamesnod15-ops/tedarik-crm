import { Prisma } from "@prisma/client";
import { z } from "zod";
import { parseDateInput } from "./format";
import { normalizePhone } from "./phone";

export type FormState = { error?: string; ok?: string } | undefined;

export const PAGE_SIZE = 25;

export function pageOf(raw: string | undefined) {
  return Math.max(1, Number.parseInt(raw ?? "1", 10) || 1);
}

/** Veritabanı hatalarını kullanıcıya anlaşılır mesaja çevirir; bilinmeyenleri yeniden fırlatır. */
export function dbErrorMessage(err: unknown, fallback = "İşlem tamamlanamadı."): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2003") return "Bu kayıt başka kayıtlarda kullanıldığı için silinemez. Gerekirse pasife alın.";
    if (err.code === "P2002") return "Bu değerle kayıtlı başka bir kayıt zaten var.";
    if (err.code === "P2025") return "Kayıt bulunamadı (başka biri silmiş olabilir).";
  }
  // Postgres RESTRICT ihlali (23001) Prisma'da bilinen bir koda çevrilmiyor; mesajdan tanınır.
  if (err instanceof Prisma.PrismaClientUnknownRequestError && /23001|23503|violates RESTRICT|foreign key constraint/i.test(err.message)) {
    return "Bu kayıt başka kayıtlarda kullanıldığı için silinemez. Gerekirse pasife alın.";
  }
  console.error("[db]", err);
  return fallback;
}

export const reqText = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} gerekli.`).max(max, `${label} en fazla ${max} karakter olabilir.`);

export const optText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `En fazla ${max} karakter olabilir.`)
    .optional()
    .transform((v) => (v ? v : null));

export const dateField = (label: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const d = parseDateInput(v);
      if (!d) ctx.addIssue({ code: "custom", message: `${label} için geçerli bir tarih girin.` });
      return d as Date;
    });

export const optDate = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const d = parseDateInput(v);
      if (!d) ctx.addIssue({ code: "custom", message: `${label} için geçerli bir tarih girin.` });
      return d as Date;
    });

/** "1.234,56" / "1234,56" / "1234.56" kabul eder. */
function normalizeNumber(v: string) {
  const s = v.trim().replace(/\s/g, "");
  if (s.includes(",")) return s.replace(/\./g, "").replace(",", ".");
  return s;
}

export const moneyField = (label: string, opts: { allowZero?: boolean; allowNegative?: boolean } = {}) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = normalizeNumber(v);
      if (!/^-?\d+(\.\d{1,2})?$/.test(n)) {
        ctx.addIssue({ code: "custom", message: `${label} geçerli bir tutar olmalı (en fazla 2 ondalık).` });
        return new Prisma.Decimal(0);
      }
      const d = new Prisma.Decimal(n);
      if (!opts.allowNegative && d.isNegative()) ctx.addIssue({ code: "custom", message: `${label} negatif olamaz.` });
      if (!opts.allowZero && d.isZero()) ctx.addIssue({ code: "custom", message: `${label} sıfırdan büyük olmalı.` });
      if (d.abs().gte("1e12")) ctx.addIssue({ code: "custom", message: `${label} çok büyük.` });
      return d;
    });

export const optMoney = (label: string, opts: { allowNegative?: boolean } = {}) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return new Prisma.Decimal(0);
      const n = normalizeNumber(v);
      if (!/^-?\d+(\.\d{1,2})?$/.test(n)) {
        ctx.addIssue({ code: "custom", message: `${label} geçerli bir tutar olmalı (en fazla 2 ondalık).` });
        return new Prisma.Decimal(0);
      }
      const d = new Prisma.Decimal(n);
      if (!opts.allowNegative && d.isNegative()) ctx.addIssue({ code: "custom", message: `${label} negatif olamaz.` });
      return d;
    });

export const quantityField = (label: string) =>
  z
    .union([z.string(), z.number()])
    .transform((v, ctx) => {
      const n = normalizeNumber(String(v));
      if (!/^\d+(\.\d{1,3})?$/.test(n) || Number(n) <= 0) {
        ctx.addIssue({ code: "custom", message: `${label} sıfırdan büyük bir sayı olmalı (en fazla 3 ondalık).` });
        return new Prisma.Decimal(0);
      }
      return new Prisma.Decimal(n);
    });

export const optQuantity = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = normalizeNumber(v);
      if (!/^\d+(\.\d{1,3})?$/.test(n) || Number(n) <= 0) {
        ctx.addIssue({ code: "custom", message: `${label} sıfırdan büyük bir sayı olmalı (en fazla 3 ondalık).` });
        return null;
      }
      return new Prisma.Decimal(n);
    });

/** KDV oranı elle girilir; boş bırakılırsa sessizce 0 olmaz. */
export const kdvField = z
  .union([z.string(), z.number()], { error: "KDV oranı gerekli." })
  .transform((v) => String(v).trim())
  .pipe(z.string().min(1, "KDV oranı gerekli."))
  .transform((v, ctx) => {
    const n = Number(v.replace(",", "."));
    if (!Number.isInteger(n) || n < 0 || n > 100) {
      ctx.addIssue({ code: "custom", message: "KDV oranı 0-100 arasında tam sayı olmalı." });
      return 0;
    }
    return n;
  });

/** Telefon: 0XXX XXX XX XX biçimine çevrilir; boşsa null, geçersizse hata. */
export const optPhone = (label = "Telefon") =>
  z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = normalizePhone(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: `${label} 0XXX XXX XX XX biçiminde olmalı (ör. 0532 123 45 67).` });
        return null;
      }
      return n;
    });

/** E-posta: boşluklar atılır, küçük harfe çevrilir; boşsa null, geçersizse hata. */
export const optEmail = (label = "E-posta") =>
  z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      if (!z.email().safeParse(v).success) {
        ctx.addIssue({ code: "custom", message: `${label} geçerli bir adres olmalı (ör. ad@firma.com).` });
        return null;
      }
      return v;
    });

export const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on");

export function firstIssue(err: z.ZodError) {
  return err.issues[0]?.message ?? "Geçersiz değer.";
}
