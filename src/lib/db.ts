import { Prisma, PrismaClient } from "@prisma/client";

// Veritabanına ulaşılamadığında (Neon uykudan uyanırken ya da ağ gecikmesinde) istek hata vermeden önce yeniden denenir.
// Yalnızca "bağlantı kurulamadı" hataları yeniden denenir: bunlar sorgu çalışmadan önce oluştuğu için
// yazma işleminin iki kez uygulanma riski yoktur.
const RETRY_DELAYS_MS = [400, 1000, 2000, 3000];
const CONNECTION_CODES = new Set(["P1001", "P1002"]);

function isConnectionError(err: unknown) {
  // İlk bağlantı hatası PrismaClientInitializationError olarak, kod alanı boş gelebilir.
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  const code = (err as { code?: string } | null)?.code;
  if (typeof code === "string" && CONNECTION_CODES.has(code)) return true;
  return /Can't reach database server/i.test(String((err as Error | null)?.message ?? ""));
}

function createClient() {
  return new PrismaClient().$extends({
    query: {
      async $allOperations({ args, query }) {
        for (let attempt = 0; ; attempt++) {
          try {
            return await query(args);
          } catch (err) {
            if (attempt >= RETRY_DELAYS_MS.length || !isConnectionError(err)) throw err;
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
          }
        }
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
