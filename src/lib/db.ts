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
      async $allOperations({ model, operation, args, query }) {
        const basla = Date.now();
        for (let attempt = 0; ; attempt++) {
          const t0 = Date.now();
          try {
            const sonuc = await query(args);
            // Yavaş sorgular (çoğunlukla uykudaki veritabanının uyanması) sunucu günlüğünde görünsün.
            const sure = Date.now() - basla;
            if (sure > 1000) console.warn(`[db] yavaş sorgu ${model ?? ""}.${operation}: ${sure} ms (deneme ${attempt + 1})`);
            return sonuc;
          } catch (err) {
            const baglanti = isConnectionError(err);
            console.warn(
              `[db] ${model ?? ""}.${operation} hata (deneme ${attempt + 1}, ${Date.now() - t0} ms, bağlantı hatası: ${baglanti}): ${String((err as Error)?.message ?? err).replace(/\s+/g, " ").slice(0, 200)}`,
            );
            if (attempt >= RETRY_DELAYS_MS.length || !baglanti) throw err;
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
