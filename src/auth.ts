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

// Kullanıcı yokken de bcrypt çalıştırıp zamanlama farkını gizlemek için.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 12);

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

        const user = await db.user.findUnique({ where: { email } });

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

        await db.user.update({
          where: { id: user.id },
          data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
        });
        await audit({ userId: user.id, action: "auth.login", meta: { email } });

        return { id: user.id, email: user.email, name: user.name, remember: remember === "on" };
      },
    }),
  ],
});
