import type { NextAuthConfig } from "next-auth";

export const SESSION_HOURS = 8; // "Beni hatırla" işaretli değilse oturum süresi
export const REMEMBER_DAYS = 30; // "Beni hatırla" işaretliyse

// Edge-safe yapılandırma (middleware bunu kullanır; Prisma/bcrypt burada YOK).
// Rol kontrolü burada yapılmaz: yetkinin tek kaynağı sunucu tarafında
// src/lib/session.ts içindeki requireUser() (DB'den güncel rolü okur).
export const authConfig = {
  pages: { signIn: "/login" },
  // Çerez en uzun süreye göre ayarlanır; her token'ın gerçek süresi src/auth.ts içindeki jwt.encode ile belirlenir.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * REMEMBER_DAYS },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      if (request.nextUrl.pathname === "/login") return true;
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.remember = !!user.remember;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
