import { Prisma } from "@prisma/client";
import { db } from "./db";
import { odemeEtkisi, siparisToplam } from "./finance";
import { parseDateInput, todayInput } from "./format";

export const VARSAYILAN_VADE_GUN = 30;
const GUN_MS = 86_400_000;

export type VadesiGecen = {
  cariId: string;
  unvan: string;
  vadeGunu: number;
  /** Henüz kapanmamış toplam alacak. */
  acikAlacak: Prisma.Decimal;
  /** Bunun vadesi geçmiş kısmı. */
  gecikmis: Prisma.Decimal;
  /** En eski vadesi geçmiş kalemin gecikme günü (devreden bakiye için 0). */
  enEskiGecikmeGun: number;
};

type CariVeri = {
  id: string;
  unvan: string;
  vadeGunu: number | null;
  acilisBakiyesi: Prisma.Decimal;
  siparisler: { tarih: Date; createdAt: Date; kalemler: { adet: Prisma.Decimal; birimFiyat: Prisma.Decimal; kdvOrani: number }[] }[];
  odemeler: { islemTipi: "TAHSILAT" | "ODEME"; tutar: Prisma.Decimal }[];
};

const SELECT = {
  id: true,
  unvan: true,
  vadeGunu: true,
  acilisBakiyesi: true,
  siparisler: {
    where: { durum: { not: "IPTAL" as const } },
    select: { tarih: true, createdAt: true, kalemler: { select: { adet: true, birimFiyat: true, kdvOrani: true } } },
  },
  odemeler: { select: { islemTipi: true, tutar: true } },
} satisfies Prisma.CariSelect;

export const bugunTarihi = () => parseDateInput(todayInput())!;

/**
 * Vadesi geçen alacak: tahsilatlar en eski borçtan başlayarak (FIFO) kapatılır; kalan açık kalemlerden
 * "sipariş tarihi + vade günü" geçmiş olanların toplamı gecikmiş alacaktır. Açılış (devreden) bakiyesi en eski borç sayılır ve her zaman vadesi geçmiştir.
 */
export function vadesiGecenHesapla(c: CariVeri, bugun: Date): VadesiGecen | null {
  const vade = c.vadeGunu ?? VARSAYILAN_VADE_GUN;
  type Kalem = { tarih: Date | null; sira: number; tutar: Prisma.Decimal };
  const kalemler: Kalem[] = [];
  let kredi = new Prisma.Decimal(0);

  if (c.acilisBakiyesi.gt(0)) kalemler.push({ tarih: null, sira: -1, tutar: c.acilisBakiyesi });
  else kredi = kredi.add(c.acilisBakiyesi.neg());
  for (const s of c.siparisler) kalemler.push({ tarih: s.tarih, sira: s.createdAt.getTime(), tutar: siparisToplam(s.kalemler) });
  // Tahsilat bakiyeyi azaltır (etki −), iade artırır; kredi = toplam net tahsilat.
  for (const o of c.odemeler) kredi = kredi.sub(odemeEtkisi("MUSTERI", o.islemTipi, o.tutar));

  const t = (k: Kalem) => (k.tarih ? k.tarih.getTime() : Number.MIN_SAFE_INTEGER);
  kalemler.sort((a, b) => t(a) - t(b) || a.sira - b.sira);

  let kalan = kredi.gt(0) ? kredi : new Prisma.Decimal(0);
  let acik = new Prisma.Decimal(0);
  let gecikmis = new Prisma.Decimal(0);
  let enEski = -1;

  for (const k of kalemler) {
    const kapanan = Prisma.Decimal.min(k.tutar, kalan);
    kalan = kalan.sub(kapanan);
    const kalanTutar = k.tutar.sub(kapanan);
    if (!kalanTutar.gt(0)) continue;
    acik = acik.add(kalanTutar);

    if (k.tarih === null) {
      gecikmis = gecikmis.add(kalanTutar);
      enEski = Math.max(enEski, 0);
      continue;
    }
    const vadeTarihi = k.tarih.getTime() + vade * GUN_MS;
    if (vadeTarihi < bugun.getTime()) {
      gecikmis = gecikmis.add(kalanTutar);
      enEski = Math.max(enEski, Math.floor((bugun.getTime() - vadeTarihi) / GUN_MS));
    }
  }

  if (!gecikmis.gt(0)) return null;
  return { cariId: c.id, unvan: c.unvan, vadeGunu: vade, acikAlacak: acik, gecikmis, enEskiGecikmeGun: Math.max(enEski, 0) };
}

/** Tüm aktif müşterilerin vadesi geçen alacakları (gecikmiş tutara göre büyükten küçüğe). */
export async function getVadesiGecenAlacaklar(bugun = bugunTarihi()): Promise<VadesiGecen[]> {
  const cariler = await db.cari.findMany({ where: { tipi: "MUSTERI", isActive: true }, select: SELECT });
  return cariler
    .map((c) => vadesiGecenHesapla(c as CariVeri, bugun))
    .filter((x): x is VadesiGecen => x !== null)
    .sort((a, b) => b.gecikmis.comparedTo(a.gecikmis));
}

/** Tek bir müşterinin vadesi geçen alacağı (yoksa null). */
export async function getVadesiGecenCari(cariId: string, bugun = bugunTarihi()): Promise<VadesiGecen | null> {
  const c = await db.cari.findFirst({ where: { id: cariId, tipi: "MUSTERI" }, select: SELECT });
  return c ? vadesiGecenHesapla(c as CariVeri, bugun) : null;
}
