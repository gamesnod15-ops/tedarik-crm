import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

export const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Giriş yapıldı",
  "auth.login_failed": "Hatalı giriş denemesi",
  "auth.locked": "Hesap kilitlendi",
  "auth.logout": "Çıkış yapıldı",
  "auth.password_change": "Kullanıcı şifresini değiştirdi",
  "user.profile_update": "Profil bilgileri güncellendi",
  "user.create": "Kullanıcı oluşturuldu",
  "cari.create": "Cari oluşturuldu",
  "cari.update": "Cari güncellendi",
  "cari.delete": "Cari silindi",
  "urun.create": "Ürün oluşturuldu",
  "urun.update": "Ürün güncellendi",
  "urun.delete": "Ürün silindi",
  "siparis.create": "Sipariş / alım oluşturuldu",
  "siparis.update": "Sipariş / alım güncellendi",
  "siparis.durum": "Sipariş durumu değiştirildi",
  "siparis.delete": "Sipariş / alım silindi",
  "alim.create": "Tedarikçi alımı oluşturuldu",
  "alim.update": "Tedarikçi alımı güncellendi",
  "alim.delete": "Tedarikçi alımı silindi",
  "odeme.create": "Tahsilat / ödeme oluşturuldu",
  "odeme.update": "Tahsilat / ödeme güncellendi",
  "odeme.delete": "Tahsilat / ödeme silindi",
  "masraf.create": "Masraf oluşturuldu",
  "masraf.update": "Masraf güncellendi",
  "masraf.delete": "Masraf silindi",
  "personel.create": "Personel oluşturuldu",
  "personel.update": "Personel güncellendi",
  "personel.delete": "Personel silindi",
  "hareket.create": "İş hareketi oluşturuldu",
  "hareket.update": "İş hareketi güncellendi",
  "hareket.delete": "İş hareketi silindi",
  "user.update": "Kullanıcı güncellendi",
  "user.password_reset": "Şifre sıfırlandı",
  "user.unlock": "Hesap kilidi açıldı",
};

export function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

type AuditInput = {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Prisma.InputJsonValue;
};

/** Denetim kaydı yazar. Hata durumunda ana işlemi bozmaz. */
export async function audit(input: AuditInput) {
  let ip: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  } catch {
    // istek bağlamı yoksa (ör. seed) IP boş kalır
  }
  try {
    await db.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        meta: input.meta,
        ip,
      },
    });
  } catch (err) {
    console.error("[audit] kayıt yazılamadı", err);
  }
}
