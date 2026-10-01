import type { BildirimTuru } from "@prisma/client";
import { db } from "./db";

type NotifyInput = {
  /** Belirli alıcılar. */
  userIds?: string[];
  /** true: tüm aktif yöneticilere. */
  toAdmins?: boolean;
  /** Bu kullanıcıya gönderilmez (ör. işlemi yapan kişi). */
  exceptUserId?: string;
  tur?: BildirimTuru;
  baslik: string;
  mesaj?: string;
  /** Tıklanınca gidilecek site içi adres. */
  href?: string;
};

/**
 * Uygulama içi bildirim oluşturur (zil ikonu). Başarısız olsa bile ana işlemi bozmaz.
 * Yeni bir olay için bildirim eklemek: ilgili eylemde `await notify({ toAdmins: true, baslik: "...", href: "/..." })`.
 */
export async function notify(input: NotifyInput) {
  try {
    const ids = new Set(input.userIds ?? []);
    if (input.toAdmins) {
      const admins = await db.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
      for (const a of admins) ids.add(a.id);
    }
    if (input.exceptUserId) ids.delete(input.exceptUserId);
    if (ids.size === 0) return;

    await db.notification.createMany({
      data: [...ids].map((userId) => ({
        userId,
        tur: input.tur ?? "BILGI",
        baslik: input.baslik,
        mesaj: input.mesaj,
        href: input.href,
      })),
    });
  } catch (err) {
    console.error("[notify] bildirim yazılamadı", err);
  }
}
