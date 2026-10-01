import { Prisma } from "@prisma/client";
import { db } from "./db";

type Dec = Prisma.Decimal | number | string;
const D = (v: Dec) => new Prisma.Decimal(v);
// Ham SQL'e tarih parametresi gönderirken saat dilimi kaymasın diye "YYYY-MM-DD" metni + ::date kullanılır.
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Satır tutarı: adet × birim fiyat (KDV hariç). */
export function kalemAra(k: { adet: Dec; birimFiyat: Dec }) {
  return D(k.adet).mul(D(k.birimFiyat)).toDecimalPlaces(2);
}

/** Satır toplamı: KDV üstüne eklenir. */
export function kalemToplam(k: { adet: Dec; birimFiyat: Dec; kdvOrani: number }) {
  return D(k.adet).mul(D(k.birimFiyat)).mul(100 + k.kdvOrani).div(100).toDecimalPlaces(2);
}

export function siparisToplam(kalemler: { adet: Dec; birimFiyat: Dec; kdvOrani: number }[]) {
  return kalemler.reduce((sum, k) => sum.add(kalemToplam(k)), new Prisma.Decimal(0));
}

// SQL tarafında aynı formül (Postgres ROUND ile JS toDecimalPlaces(2) pozitif değerlerde aynı sonucu verir).
const KALEM_SQL = Prisma.sql`ROUND(k."adet" * k."birimFiyat" * (100 + k."kdvOrani") / 100, 2)`;

/**
 * Bakiye = açılış + siparişler + alımlar ± ödemeler.
 * Tahsilat/ödemenin bakiyeye etkisi: carinin kendi yönündeki işlem (müşteri→tahsilat, tedarikçi→ödeme) bakiyeyi azaltır,
 * ters yöndeki (iade gibi) artırır. Bakiye = açılış + siparişler − yönlü ödemeler.
 */
export function odemeEtkisi(cariTipi: "MUSTERI" | "TEDARIKCI", islemTipi: "TAHSILAT" | "ODEME", tutar: Dec) {
  const sameDir = (cariTipi === "MUSTERI" && islemTipi === "TAHSILAT") || (cariTipi === "TEDARIKCI" && islemTipi === "ODEME");
  return sameDir ? D(tutar).neg() : D(tutar);
}

/** Cari bakiyeleri (açılış + siparişler − ödemeler). + değer: müşteri bize borçlu / tedarikçiye borcumuz var. */
export async function getBakiyeler(ids: string[]) {
  const map = new Map<string, Prisma.Decimal>();
  if (ids.length === 0) return map;
  const rows = await db.$queryRaw<{ id: string; bakiye: Prisma.Decimal }[]>(Prisma.sql`
    SELECT c."id",
      c."acilisBakiyesi"
      + COALESCE((SELECT SUM(${KALEM_SQL}) FROM "Siparis" s JOIN "SiparisKalem" k ON k."siparisId" = s."id" WHERE s."cariId" = c."id" AND s."durum" <> 'IPTAL'), 0)
      + COALESCE((SELECT SUM(a."toplam") FROM "Alim" a WHERE a."cariId" = c."id"), 0)
      + COALESCE((SELECT SUM(CASE WHEN (c."tipi" = 'MUSTERI' AND o."islemTipi" = 'TAHSILAT') OR (c."tipi" = 'TEDARIKCI' AND o."islemTipi" = 'ODEME')
                               THEN -o."tutar" ELSE o."tutar" END) FROM "Odeme" o WHERE o."cariId" = c."id"), 0) AS "bakiye"
    FROM "Cari" c WHERE c."id" = ANY(${ids}::text[])
  `);
  for (const r of rows) map.set(r.id, new Prisma.Decimal(r.bakiye));
  return map;
}

export type Ozet = {
  ciro: Prisma.Decimal;
  alis: Prisma.Decimal;
  gider: Prisma.Decimal;
  tahsilat: Prisma.Decimal;
  odeme: Prisma.Decimal;
  kar: Prisma.Decimal;
};

/** Tarih aralığı (iki uç dahil) için ciro, alış, gider, tahsilat, ödeme ve kâr. Kâr = ciro − alış − gider. */
export async function getOzet(from: Date, to: Date): Promise<Ozet> {
  const [sip, odm, msr, alm] = await Promise.all([
    db.$queryRaw<{ tipi: string; toplam: Prisma.Decimal }[]>(Prisma.sql`
      SELECT c."tipi"::text AS "tipi", COALESCE(SUM(${KALEM_SQL}), 0) AS "toplam"
      FROM "Siparis" s JOIN "SiparisKalem" k ON k."siparisId" = s."id" JOIN "Cari" c ON c."id" = s."cariId"
      WHERE s."durum" <> 'IPTAL' AND s."tarih" >= ${iso(from)}::date AND s."tarih" <= ${iso(to)}::date GROUP BY c."tipi"`),
    db.odeme.groupBy({ by: ["islemTipi"], where: { tarih: { gte: from, lte: to } }, _sum: { tutar: true } }),
    db.masraf.aggregate({ where: { tarih: { gte: from, lte: to } }, _sum: { tutar: true } }),
    db.alim.aggregate({ where: { tarih: { gte: from, lte: to } }, _sum: { toplam: true } }),
  ]);
  const z = new Prisma.Decimal(0);
  const ciro = new Prisma.Decimal(sip.find((r) => r.tipi === "MUSTERI")?.toplam ?? 0);
  // Alış: malzemeci alım kayıtları (+ varsa eski tip tedarikçi siparişleri).
  const alis = new Prisma.Decimal(sip.find((r) => r.tipi === "TEDARIKCI")?.toplam ?? 0).add(alm._sum.toplam ?? z);
  const gider = msr._sum.tutar ?? z;
  return {
    ciro,
    alis,
    gider,
    tahsilat: odm.find((r) => r.islemTipi === "TAHSILAT")?._sum.tutar ?? z,
    odeme: odm.find((r) => r.islemTipi === "ODEME")?._sum.tutar ?? z,
    kar: ciro.sub(alis).sub(gider),
  };
}
