"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { dateField, dbErrorMessage, firstIssue, moneyField, optText, reqText, type FormState } from "@/lib/crud";

const odemeSekli = z
  .union([z.literal(""), z.enum(["NAKIT", "HAVALE_EFT", "CEK", "SENET", "KREDI_KARTI", "DIGER"])])
  .optional();

function refresh(cariId?: string) {
  for (const p of ["/finans", "/cariler", "/raporlar", "/"]) revalidatePath(p);
  if (cariId) revalidatePath(`/cariler/${cariId}`);
}

// ── Tahsilat / Ödeme ──
const odemeSchema = z.object({
  id: z.string().optional(),
  tarih: dateField("Tarih"),
  cariId: reqText("Cari"),
  islemTipi: z.enum(["TAHSILAT", "ODEME"], "İşlem tipini seçin."),
  tutar: moneyField("Tutar"),
  odemeSekli: z.enum(["NAKIT", "HAVALE_EFT", "CEK", "SENET", "KREDI_KARTI", "DIGER"], "Ödeme şeklini seçin."),
  aciklama: optText(500),
});

export async function saveOdemeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("finans:write");
  const parsed = odemeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { id, ...data } = parsed.data;

  try {
    if (!(await db.cari.findUnique({ where: { id: data.cariId }, select: { id: true } }))) return { error: "Cari bulunamadı." };
    if (id) {
      await db.odeme.update({ where: { id }, data });
      await audit({ userId: actor.id, action: "odeme.update", entity: "Odeme", entityId: id, meta: { tutar: data.tutar.toString() } });
    } else {
      const o = await db.odeme.create({ data });
      await audit({ userId: actor.id, action: "odeme.create", entity: "Odeme", entityId: o.id, meta: { tutar: data.tutar.toString(), islemTipi: data.islemTipi } });
    }
  } catch (err) {
    return { error: dbErrorMessage(err) };
  }
  refresh(data.cariId);
  return { ok: "Kaydedildi." };
}

export async function deleteOdemeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("finans:write");
  const id = String(formData.get("id") ?? "");
  try {
    const o = await db.odeme.delete({ where: { id } });
    await audit({ userId: actor.id, action: "odeme.delete", entity: "Odeme", entityId: id, meta: { tutar: o.tutar.toString() } });
    refresh(o.cariId);
  } catch (err) {
    return { error: dbErrorMessage(err) };
  }
  return { ok: "Silindi." };
}

// ── Masraf ──
const masrafSchema = z.object({
  id: z.string().optional(),
  tarih: dateField("Tarih"),
  kategori: optText(100),
  aciklama: reqText("Açıklama", 300),
  tutar: moneyField("Tutar"),
  odemeSekli: odemeSekli.transform((v) => (v ? v : null)),
});

export async function saveMasrafAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("finans:write");
  const parsed = masrafSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { id, ...data } = parsed.data;

  try {
    if (id) {
      await db.masraf.update({ where: { id }, data });
      await audit({ userId: actor.id, action: "masraf.update", entity: "Masraf", entityId: id, meta: { tutar: data.tutar.toString() } });
    } else {
      const m = await db.masraf.create({ data });
      await audit({ userId: actor.id, action: "masraf.create", entity: "Masraf", entityId: m.id, meta: { tutar: data.tutar.toString() } });
    }
  } catch (err) {
    return { error: dbErrorMessage(err) };
  }
  refresh();
  return { ok: "Kaydedildi." };
}

export async function deleteMasrafAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("finans:write");
  const id = String(formData.get("id") ?? "");
  try {
    const m = await db.masraf.delete({ where: { id } });
    await audit({ userId: actor.id, action: "masraf.delete", entity: "Masraf", entityId: id, meta: { tutar: m.tutar.toString() } });
  } catch (err) {
    return { error: dbErrorMessage(err) };
  }
  refresh();
  return { ok: "Silindi." };
}
