"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { siparisToplam } from "@/lib/finance";
import { formatDate } from "@/lib/format";
import { urunAnahtari } from "@/lib/paste";
import { DURUMLAR, DURUM_LABELS } from "./durum";
import {
  checkbox,
  dateField,
  dbErrorMessage,
  firstIssue,
  kdvField,
  moneyField,
  optMoney,
  optQuantity,
  optText,
  quantityField,
  reqText,
  type FormState,
} from "@/lib/crud";

function refresh(cariId?: string) {
  for (const p of ["/siparisler", "/siparisler/yeni", "/urunler", "/cariler", "/raporlar", "/"]) revalidatePath(p);
  if (cariId) revalidatePath(`/cariler/${cariId}`);
}

// ── Sipariş / Alım ──
const kalemSchema = z.object({
  urunAdi: reqText("Ürün", 200),
  adet: quantityField("Adet"),
  birimFiyat: moneyField("Birim fiyat", { allowZero: true }),
  kdvOrani: kdvField,
  aciklama: optText(300),
});

const siparisSchema = z.object({
  id: z.string().optional(),
  tip: z.enum(["MUSTERI", "TEDARIKCI"]),
  cariId: reqText("Cari"),
  tarih: dateField("Tarih"),
  aciklama: optText(500),
  durum: z.enum(DURUMLAR, "Sipariş durumunu seçin."),
  kalemler: z.string().transform((v, ctx) => {
    try {
      return JSON.parse(v) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "Sipariş kalemleri okunamadı." });
      return [];
    }
  }),
});

export async function saveSiparisAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("siparisler:write");
  const parsed = siparisSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { id, tip, cariId, tarih, aciklama, durum } = parsed.data;

  const kalemler = z.array(kalemSchema).min(1, "En az bir ürün satırı ekleyin.").max(100, "En fazla 100 satır eklenebilir.").safeParse(parsed.data.kalemler);
  if (!kalemler.success) return { error: firstIssue(kalemler.error) };

  try {
    const cari = await db.cari.findUnique({ where: { id: cariId }, select: { tipi: true } });
    if (!cari) return { error: "Cari bulunamadı." };
    if (cari.tipi !== tip) return { error: tip === "MUSTERI" ? "Müşteri siparişi için müşteri seçin." : "Tedarikçi alımı için tedarikçi seçin." };
    if (!id && tip !== "MUSTERI") return { error: "Tedarikçi alımları Alım kaydı olarak girilir." };

    const rows = kalemler.data.map((k) => ({
      urunAdi: k.urunAdi.replace(/\s+/g, " "),
      adet: k.adet,
      birimFiyat: k.birimFiyat,
      kdvOrani: k.kdvOrani,
      aciklama: k.aciklama,
    }));
    const toplam = siparisToplam(rows).toString();

    if (id) {
      await db.$transaction([
        db.siparisKalem.deleteMany({ where: { siparisId: id } }),
        db.siparis.update({ where: { id }, data: { cariId, tarih, aciklama, durum, kalemler: { createMany: { data: rows } } } }),
      ]);
      await audit({ userId: actor.id, action: "siparis.update", entity: "Siparis", entityId: id, meta: { tip, toplam } });
    } else {
      const s = await db.siparis.create({ data: { cariId, tarih, aciklama, durum, kalemler: { createMany: { data: rows } } } });
      await audit({ userId: actor.id, action: "siparis.create", entity: "Siparis", entityId: s.id, meta: { tip, no: s.no, toplam } });
    }
    refresh(cariId);
  } catch (err) {
    return { error: dbErrorMessage(err) };
  }
  // Pencere (cari sayfası) içinden kaydedildiyse yönlendirme yok; sayfa verisi zaten yenilendi.
  if (formData.get("inline") === "1") return { ok: "Sipariş kaydedildi." };
  redirect(`/siparisler?tip=${tip}&flash=kaydedildi`);
}

export async function deleteSiparisAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("siparisler:write");
  const id = String(formData.get("id") ?? "");
  try {
    const s = await db.siparis.delete({ where: { id } });
    await audit({ userId: actor.id, action: "siparis.delete", entity: "Siparis", entityId: id, meta: { no: s.no } });
    refresh(s.cariId);
  } catch (err) {
    return { error: dbErrorMessage(err) };
  }
  return { ok: "Silindi." };
}

// ── Ürün ──
const urunSchema = z.object({
  id: z.string().optional(),
  ad: reqText("Ürün adı"),
  birim: reqText("Birim", 30),
  birimFiyat: optMoney("Birim fiyat"),
  kdvOrani: kdvField,
  aciklama: optText(500),
  isActive: checkbox,
});

export async function saveUrunAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("siparisler:write");
  const parsed = urunSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { id, ...data } = parsed.data;

  try {
    if (id) {
      await db.urun.update({ where: { id }, data });
      await audit({ userId: actor.id, action: "urun.update", entity: "Urun", entityId: id, meta: { ad: data.ad } });
    } else {
      const u = await db.urun.create({ data });
      await audit({ userId: actor.id, action: "urun.create", entity: "Urun", entityId: u.id, meta: { ad: data.ad } });
    }
  } catch (err) {
    return { error: dbErrorMessage(err) };
  }
  refresh();
  return { ok: "Kaydedildi." };
}

export async function deleteUrunAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("siparisler:write");
  const id = String(formData.get("id") ?? "");
  try {
    const u = await db.urun.delete({ where: { id } });
    await audit({ userId: actor.id, action: "urun.delete", entity: "Urun", entityId: id, meta: { ad: u.ad } });
  } catch (err) {
    return { error: dbErrorMessage(err, "Ürün silinemedi.") };
  }
  refresh();
  return { ok: "Silindi." };
}

// ── Tedarikçi (malzemeci) alımı: günlük, basit kayıt ──
const alimSchema = z.object({
  id: z.string().optional(),
  tarih: dateField("Tarih"),
  cariId: reqText("Tedarikçi"),
  faturaNo: optText(50),
  aciklama: optText(300),
  miktar: optQuantity("Miktar"),
  toplam: moneyField("Toplam"),
});

export async function saveAlimAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("siparisler:write");
  const parsed = alimSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { id, ...data } = parsed.data;

  try {
    const cari = await db.cari.findUnique({ where: { id: data.cariId }, select: { tipi: true } });
    if (!cari) return { error: "Tedarikçi bulunamadı." };
    if (cari.tipi !== "TEDARIKCI") return { error: "Alım kaydı için tedarikçi seçin." };

    if (id) {
      await db.alim.update({ where: { id }, data });
      await audit({ userId: actor.id, action: "alim.update", entity: "Alim", entityId: id, meta: { toplam: data.toplam.toString() } });
    } else {
      const a = await db.alim.create({ data });
      await audit({ userId: actor.id, action: "alim.create", entity: "Alim", entityId: a.id, meta: { toplam: data.toplam.toString(), faturaNo: data.faturaNo } });
    }
    refresh(data.cariId);
  } catch (err) {
    return { error: dbErrorMessage(err) };
  }
  return { ok: "Kaydedildi." };
}

export async function deleteAlimAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("siparisler:write");
  const id = String(formData.get("id") ?? "");
  try {
    const a = await db.alim.delete({ where: { id } });
    await audit({ userId: actor.id, action: "alim.delete", entity: "Alim", entityId: id, meta: { toplam: a.toplam.toString() } });
    refresh(a.cariId);
  } catch (err) {
    return { error: dbErrorMessage(err) };
  }
  return { ok: "Silindi." };
}

// ── Sipariş durumu (listeden hızlı değişiklik) ──
const durumSchema = z.object({ id: reqText("Sipariş"), durum: z.enum(DURUMLAR, "Sipariş durumunu seçin.") });

export async function setSiparisDurumAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser("siparisler:write");
  const parsed = durumSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { id, durum } = parsed.data;

  try {
    const onceki = await db.siparis.findUnique({ where: { id }, select: { durum: true, no: true, cariId: true } });
    if (!onceki) return { error: "Sipariş bulunamadı." };
    if (onceki.durum === durum) return { ok: "Durum zaten bu." };
    await db.siparis.update({ where: { id }, data: { durum } });
    await audit({ userId: actor.id, action: "siparis.durum", entity: "Siparis", entityId: id, meta: { no: onceki.no, from: onceki.durum, to: durum } });
    refresh(onceki.cariId);
    return { ok: `#${onceki.no} → ${DURUM_LABELS[durum]}` };
  } catch (err) {
    return { error: dbErrorMessage(err) };
  }
}

// ── Akıllı varsayılanlar ──

/** Bir müşteri için her ürünün en son kullanılan birim fiyatı (iptal edilen siparişler sayılmaz). Anahtar: urunAnahtari(ürün adı). */
export async function sonFiyatlarAction(cariId: string): Promise<Record<string, { fiyat: string; tarih: string }>> {
  await requireUser("siparisler:read");
  if (!cariId) return {};
  const kalemler = await db.siparisKalem.findMany({
    where: { siparis: { cariId, durum: { not: "IPTAL" } } },
    orderBy: [{ siparis: { tarih: "desc" } }, { siparis: { createdAt: "desc" } }],
    select: { urunAdi: true, birimFiyat: true, siparis: { select: { tarih: true } } },
    take: 1000,
  });
  const sonuc: Record<string, { fiyat: string; tarih: string }> = {};
  for (const k of kalemler) {
    const anahtar = urunAnahtari(k.urunAdi);
    if (!(anahtar in sonuc)) sonuc[anahtar] = { fiyat: k.birimFiyat.toString(), tarih: formatDate(k.siparis.tarih) };
  }
  return sonuc;
}
