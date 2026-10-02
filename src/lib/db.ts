import { Prisma, PrismaClient } from "@prisma/client";

// Veritabanına ulaşılamadığında (Neon uykudan uyanırken ya da ağ gecikmesinde) istek hata vermeden önce yeniden denenir.
// Yalnızca "bağlantı kurulamadı" hataları yeniden denenir: bunlar sorgu çalışmadan önce oluştuğu için
// yazma işleminin iki kez uygulanma riski yoktur.
// Bağlantı zaman aşımı uzun olduğu için (aşağıda) tek deneme uyanmayı zaten bekler; bir kez daha denemek yeterli.
// Daha fazla deneme, gerçek bir kesintide kullanıcıyı dakikalarca bekletirdi.
const RETRY_DELAYS_MS = [1000];
const CONNECTION_CODES = new Set(["P1001", "P1002"]);

function isConnectionError(err: unknown) {
  // İlk bağlantı hatası PrismaClientInitializationError olarak, kod alanı boş gelebilir.
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  const code = (err as { code?: string } | null)?.code;
  if (typeof code === "string" && CONNECTION_CODES.has(code)) return true;
  return /Can't reach database server/i.test(String((err as Error | null)?.message ?? ""));
}

/**
 * Bağlantı zaman aşımları: Prisma'nın varsayılanları bağlantı için 5 sn, havuzdan bağlantı beklemek için 10 sn.
 * Neon uykudan uyanırken 5 sn bazen yetmiyor; bağlantı kesilip baştan deneniyor, her deneme yine bekliyordu
 * (girişte 14 sn'ye varan takılma). Adreste tanımlı değilse bağlantıya 15 sn, havuz beklemesine (bağlantıdan uzun olmalı)
 * 20 sn verilir: tek deneme uyanmayı bekler. Ortam değişkeninde açıkça verilen değerler korunur.
 */
function databaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "15");
    if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "20");
    return url.toString();
  } catch {
    return raw;
  }
}

function createClient() {
  return new PrismaClient({ datasourceUrl: databaseUrl() }).$extends({
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
