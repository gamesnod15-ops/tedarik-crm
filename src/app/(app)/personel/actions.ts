"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { dateField, dbErrorMessage, firstIssue, moneyField, optDate, optText, reqText, type FormState } from "@/lib/crud";

const hhmm = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) ctx.addIssue({ code: "custom", message: `${label} SS:DD biçiminde olmalı.` });
      return v;
    });

function refresh() {
  // Liste ve tüm personel detay sayfaları
  revalidatePath("/personel", "layout");
}

// ── Personel ──
const personelSchema = z.object({
  id: z.string().optional(),
  adSoyad: reqText("Ad soyad", 150),
  aciklama: optText(2000),
});

export async function savePersonelAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("personel:write");
  const parsed = personelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { id, ...data } = parsed.data;

  try {
    if (id) {
      await db.personel.update({ where: { id }, data });
      await audit({ userId: actor.id, action: "personel.update", entity: "Personel", entityId: id, meta: { adSoyad: data.adSoyad } });
    } else {
      const p = await db.personel.create({ data });
      await audit({ userId: actor.id, action: "personel.create", entity: "Personel", entityId: p.id, meta: { adSoyad: data.adSoyad } });
    }
  } catch (err) {
    const e = dbErrorMessage(err);
    return { error: e === "Bu değerle kayıtlı başka bir kayıt zaten var." ? "Bu sicil numarası başka bir personelde kayıtlı." : e };
  }
  refresh();
  return { ok: "Kaydedildi." };
}

export async function deletePersonelAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("personel:write");
  const id = String(formData.get("id") ?? "");
  try {
    // Hareket ve ödeme kayıtları da (cascade) silinir.
    const p = await db.personel.delete({ where: { id } });
    await audit({ userId: actor.id, action: "personel.delete", entity: "Personel", entityId: id, meta: { adSoyad: p.adSoyad } });
  } catch (err) {
    return { error: dbErrorMessage(err) };
  }
  refresh();
  return { ok: "Silindi." };
}

// ── Personel ödemesi (maaş vb.) ──
// Yalnızca bilgi: finans, bakiye ve rapor hesaplarına katılmaz.
const odemeSchema = z.object({
  id: z.string().optional(),
  personelId: reqText("Personel"),
  tarih: dateField("Tarih"),
  tutar: moneyField("Tutar"),
  aciklama: optText(500),
});

export async function savePersonelOdemeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("personel:write");
  const parsed = odemeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { id, ...data } = parsed.data;
  try {
    if (!(await db.personel.findUnique({ where: { id: data.personelId }, select: { id: true } }))) return { error: "Personel bulunamadı." };
    if (id) {
      await db.personelOdeme.update({ where: { id }, data });
      await audit({ userId: actor.id, action: "personelOdeme.update", entity: "PersonelOdeme", entityId: id, meta: { tutar: data.tutar.toString() } });
    } else {
      const o = await db.personelOdeme.create({ data });
      await audit({ userId: actor.id, action: "personelOdeme.create", entity: "PersonelOdeme", entityId: o.id, meta: { tutar: data.tutar.toString() } });
    }
  } catch (err) {
    return { error: dbErrorMessage(err) };
  }
  refresh();
  return { ok: "Kaydedildi." };
}

export async function deletePersonelOdemeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("personel:write");
  const id = String(formData.get("id") ?? "");
  try {
    const o = await db.personelOdeme.delete({ where: { id } });
    await audit({ userId: actor.id, action: "personelOdeme.delete", entity: "PersonelOdeme", entityId: id, meta: { tutar: o.tutar.toString() } });
  } catch (err) {
    return { error: dbErrorMessage(err) };
  }
  refresh();
  return { ok: "Silindi." };
}

// ── İş hareketi ──
const hareketSchema = z
  .object({
    id: z.string().optional(),
    personelId: reqText("Personel"),
    islemTuru: z.enum(["GIRIS_CIKIS", "IZIN"], "İşlem türünü seçin."),
    tarih: dateField("Tarih"),
    girisSaati: hhmm("Giriş saati"),
    cikisSaati: hhmm("Çıkış saati"),
    izinTuru: z.union([z.literal(""), z.enum(["YILLIK", "RAPORLU", "UCRETSIZ", "MAZERET", "DIGER"])]).optional(),
    izinBaslangic: optDate("İzin başlangıç tarihi"),
    izinBitis: optDate("İzin bitiş tarihi"),
    aciklama: optText(500),
  })
  .superRefine((v, ctx) => {
    if (v.islemTuru === "GIRIS_CIKIS") {
      if (!v.girisSaati) ctx.addIssue({ code: "custom", message: "Giriş saati gerekli." });
      if (v.girisSaati && v.cikisSaati && v.cikisSaati < v.girisSaati) ctx.addIssue({ code: "custom", message: "Çıkış saati giriş saatinden önce olamaz." });
    } else {
      if (!v.izinTuru) ctx.addIssue({ code: "custom", message: "İzin türünü seçin." });
      if (!v.izinBaslangic || !v.izinBitis) ctx.addIssue({ code: "custom", message: "İzin başlangıç ve bitiş tarihlerini girin." });
      else if (v.izinBitis < v.izinBaslangic) ctx.addIssue({ code: "custom", message: "İzin bitişi başlangıçtan önce olamaz." });
    }
  });

export async function saveHareketAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("personel:write");
  const parsed = hareketSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { id, izinTuru, ...rest } = parsed.data;
  const isIzin = rest.islemTuru === "IZIN";
  // Türe ait olmayan alanlar temizlenir.
  const data = {
    ...rest,
    girisSaati: isIzin ? null : rest.girisSaati,
    cikisSaati: isIzin ? null : rest.cikisSaati,
    izinTuru: isIzin && izinTuru ? izinTuru : null,
    izinBaslangic: isIzin ? rest.izinBaslangic : null,
    izinBitis: isIzin ? rest.izinBitis : null,
  };

  try {
    if (!(await db.personel.findUnique({ where: { id: data.personelId }, select: { id: true } }))) return { error: "Personel bulunamadı." };
    if (id) {
      await db.personelHareket.update({ where: { id }, data });
      await audit({ userId: actor.id, action: "hareket.update", entity: "PersonelHareket", entityId: id, meta: { islemTuru: data.islemTuru } });
    } else {
      const h = await db.personelHareket.create({ data });
      await audit({ userId: actor.id, action: "hareket.create", entity: "PersonelHareket", entityId: h.id, meta: { islemTuru: data.islemTuru } });
    }
  } catch (err) {
    return { error: dbErrorMessage(err) };
  }
  refresh();
  return { ok: "Kaydedildi." };
}

export async function deleteHareketAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("personel:write");
  const id = String(formData.get("id") ?? "");
  try {
    await db.personelHareket.delete({ where: { id } });
    await audit({ userId: actor.id, action: "hareket.delete", entity: "PersonelHareket", entityId: id });
  } catch (err) {
    return { error: dbErrorMessage(err) };
  }
  refresh();
  return { ok: "Silindi." };
}
