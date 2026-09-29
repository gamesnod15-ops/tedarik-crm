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
