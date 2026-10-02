"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { checkbox, dbErrorMessage, firstIssue, optInt, optMoney, optPhone, optText, reqText, type FormState } from "@/lib/crud";

const schema = z.object({
  id: z.string().optional(),
  tipi: z.enum(["MUSTERI", "TEDARIKCI"], "Cari tipi geçersiz."),
  unvan: reqText("Unvan"),
  telefon: optPhone(),
  acilisBakiyesi: optMoney("Açılış bakiyesi", { allowNegative: true }),
  vadeGunu: optInt("Vade", 0, 365),
  notlar: optText(1000),
  isActive: checkbox,
});

export async function saveCariAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("cariler:write");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { id, tipi, ...data } = parsed.data;

  try {
    // Yetkili, e-posta ve adres artık tutulmuyor: eski kayıtlarda kalan değer de kaydedilince temizlenir.
    Object.assign(data, { yetkili: null, eposta: null, adres: null });

    if (id) {
      // Tip sonradan değiştirilmez: mevcut siparişlerin yönü bozulur.
      await db.cari.update({ where: { id }, data });
      await audit({ userId: actor.id, action: "cari.update", entity: "Cari", entityId: id, meta: { unvan: data.unvan } });
    } else {
      const c = await db.cari.create({ data: { ...data, tipi } });
      await audit({ userId: actor.id, action: "cari.create", entity: "Cari", entityId: c.id, meta: { unvan: data.unvan, tipi } });
    }
  } catch (err) {
    return { error: dbErrorMessage(err) };
  }
  revalidatePath("/cariler");
  if (id) revalidatePath(`/cariler/${id}`);
  return { ok: "Kaydedildi." };
}

export async function deleteCariAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("cariler:write");
  const id = String(formData.get("id") ?? "");
  try {
    const c = await db.cari.delete({ where: { id } });
    await audit({ userId: actor.id, action: "cari.delete", entity: "Cari", entityId: id, meta: { unvan: c.unvan } });
  } catch (err) {
    return { error: dbErrorMessage(err) };
  }
  revalidatePath("/cariler");
  return { ok: "Silindi." };
}
