import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { encode } from "next-auth/jwt";
import { authConfig, REMEMBER_DAYS, SESSION_HOURS } from "./auth.config";
import { db } from "./lib/db";
import { audit } from "./lib/audit";
import { notify } from "./lib/notify";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

// Kullanıcı yokken de bcrypt çalıştırıp zamanlama farkını gizlemek için (rastgele bir değerin önceden üretilmiş özeti).
// Modül yüklenirken hashSync çalıştırmak her soğuk başlangıçta yüzlerce ms işlemciyi kilitliyordu: bu dosya her sayfada yüklenir.
const DUMMY_HASH = "$2b$12$Qdbqb9nohyyudo5LwaY/EeHAGS6hmvn2t0bSAhFm1fiaHA4enK726";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
  remember: z.string().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  jwt: {
    // "Beni hatırla" seçiliyse token uzun, değilse kısa süreli olur.
    encode: (params) =>
      encode({
        ...params,
        maxAge: params.token?.remember ? 60 * 60 * 24 * REMEMBER_DAYS : 60 * 60 * SESSION_HOURS,
      }),
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, remember: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password, remember } = parsed.data;

        const t0 = Date.now();
        const user = await db.user.findUnique({ where: { email } });
        const tSorgu = Date.now();

        if (!user) {
          await bcrypt.compare(password, DUMMY_HASH);
          await audit({ action: "auth.login_failed", meta: { email, reason: "unknown_user" } });
          return null;
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await audit({ userId: user.id, action: "auth.login_failed", meta: { email, reason: "locked" } });
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        const tSifre = Date.now();

        if (!ok || !user.isActive) {
          if (!ok) {
            const failed = user.failedLogins + 1;
            const lock = failed >= MAX_FAILED_LOGINS;
            await db.user.update({
              where: { id: user.id },
              data: {
                failedLogins: lock ? 0 : failed,
                lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
              },
            });
            if (lock) {
              await audit({ userId: user.id, action: "auth.locked", meta: { email } });
              await notify({
                toAdmins: true,
                tur: "UYARI",
                baslik: "Hesap kilitlendi",
                mesaj: `${user.name} (${email}) çok sayıda hatalı girişten sonra ${LOCK_MINUTES} dakika kilitlendi.`,
                href: `/settings/users/${user.id}`,
              });
            }
          }
          await audit({
            userId: user.id,
            action: "auth.login_failed",
            meta: { email, reason: ok ? "inactive" : "bad_password" },
          });
          return null;
        }

        await Promise.all([
          db.user.update({
            where: { id: user.id },
            data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
          }),
          audit({ userId: user.id, action: "auth.login", meta: { email } }),
        ]);
        // Yavaş girişin hangi adımda takıldığı sunucu günlüğünde görünsün.
        const toplam = Date.now() - t0;
        if (toplam > 1500) {
          console.warn(`[giriş] yavaş: toplam ${toplam} ms (kullanıcı sorgusu ${tSorgu - t0}, şifre doğrulama ${tSifre - tSorgu}, kayıt ${Date.now() - tSifre})`);
        }

        return { id: user.id, email: user.email, name: user.name, remember: remember === "on" };
      },
    }),
  ],
});
