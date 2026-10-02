import { Prisma } from "@prisma/client";
import { db } from "./db";
import { kalemAra, kalemToplam, odemeEtkisi } from "./finance";

const D = (v: Prisma.Decimal | number | string) => new Prisma.Decimal(v);

export type EkstreSatiri = {
  key: string;
  tarih: Date;
  tur: "SIPARIS" | "ALIM" | "ODEME";
  /** Excel'deki MODEL sütunu: ürün adı, fatura/açıklama ya da ödeme türü. */
  model: string;
  detay?: string;
  miktar?: Prisma.Decimal | null;
  fiyat?: Prisma.Decimal;
  tutar?: Prisma.Decimal; // KDV hariç
  kdv?: Prisma.Decimal;
  toplam?: Prisma.Decimal; // borçlanma (sipariş/alım, KDV dahil)
  odeme?: Prisma.Decimal; // + ödeme/tahsilat, − iade
  etki: Prisma.Decimal; // bakiyeye etkisi
  bakiye: Prisma.Decimal; // satır sonrası bakiye
  href?: string;
};

export type Donem = { tip: "TUM" } | { tip: "AY"; yil: number; ay: number };

export function parseDonem(raw: string | undefined, varsayilan: "TUM" | "AY"): Donem {
  if (raw === "tum") return { tip: "TUM" };
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(raw ?? "");
  if (m) return { tip: "AY", yil: Number(m[1]), ay: Number(m[2]) };
  if (varsayilan === "TUM") return { tip: "TUM" };
  const now = new Date();
  return { tip: "AY", yil: now.getUTCFullYear(), ay: now.getUTCMonth() + 1 };
}

export const donemKey = (d: Donem) => (d.tip === "TUM" ? "tum" : `${d.yil}-${String(d.ay).padStart(2, "0")}`);

export function ayKaydir(d: Extract<Donem, { tip: "AY" }>, delta: number): Extract<Donem, { tip: "AY" }> {
  const dt = new Date(Date.UTC(d.yil, d.ay - 1 + delta, 1));
  return { tip: "AY", yil: dt.getUTCFullYear(), ay: dt.getUTCMonth() + 1 };
}

const AY_ADLARI = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export const donemAdi = (d: Donem) => (d.tip === "TUM" ? "Tüm hareketler" : `${AY_ADLARI[d.ay - 1]} ${d.yil}`);

/**
 * Cari hesap ekstresi. Devreden = açılış bakiyesi + dönemden önceki tüm hareketlerin etkisi (kayıt tutulmaz, hesaplanır).
 * Böylece eski bir kayıt düzeltilince sonraki tüm aylar kendiliğinden doğru olur.
 */
export async function getEkstre(cariId: string, donem: Donem) {
  const cari = await db.cari.findUnique({
    where: { id: cariId },
    include: {
      siparisler: { where: { durum: { not: "IPTAL" } }, include: { kalemler: { orderBy: { id: "asc" } } } },
      alimlar: true,
      odemeler: true,
    },
  });
  if (!cari) return null;

  type Ham = Omit<EkstreSatiri, "bakiye"> & { sira: number };
  const ham: Ham[] = [];

  for (const s of cari.siparisler) {
    s.kalemler.forEach((k, i) => {
      const toplam = kalemToplam(k);
      ham.push({
        key: `k-${k.id}`,
        tarih: s.tarih,
        sira: s.createdAt.getTime() + i,
        tur: "SIPARIS",
        model: k.urunAdi,
        detay: [`Sipariş #${s.no}`, k.aciklama].filter(Boolean).join(" · "),
        miktar: k.adet,
        fiyat: k.birimFiyat,
        tutar: kalemAra(k),
        kdv: toplam.sub(kalemAra(k)),
        toplam,
        etki: toplam,
        href: `/siparisler/${s.id}`,
      });
    });
  }
  for (const a of cari.alimlar) {
    ham.push({
      key: `a-${a.id}`,
      tarih: a.tarih,
      sira: a.createdAt.getTime(),
      tur: "ALIM",
      model: a.aciklama || "Alım",
      detay: a.faturaNo ? `Fatura: ${a.faturaNo}` : undefined,
      miktar: a.miktar,
      toplam: a.toplam,
      etki: a.toplam,
      href: `/siparisler?tip=TEDARIKCI&q=${encodeURIComponent(cari.unvan)}`,
    });
  }
  for (const o of cari.odemeler) {
    const etki = odemeEtkisi(cari.tipi, o.islemTipi, o.tutar);
    ham.push({
      key: `o-${o.id}`,
      tarih: o.tarih,
      sira: o.createdAt.getTime(),
      tur: "ODEME",
      model: o.islemTipi === "TAHSILAT" ? "Tahsilat" : "Ödeme",
      detay: o.aciklama ?? undefined,
      odeme: etki.neg(),
      etki,
    });
  }
  ham.sort((a, b) => a.tarih.getTime() - b.tarih.getTime() || a.sira - b.sira);

  const baslangic = donem.tip === "AY" ? new Date(Date.UTC(donem.yil, donem.ay - 1, 1)) : null;
  const bitis = donem.tip === "AY" ? new Date(Date.UTC(donem.yil, donem.ay, 1)) : null;

  let devreden = cari.acilisBakiyesi;
  if (baslangic) for (const h of ham) if (h.tarih < baslangic) devreden = devreden.add(h.etki);

  let bakiye = devreden;
  const satirlar: EkstreSatiri[] = [];
  for (const h of ham) {
    if (baslangic && h.tarih < baslangic) continue;
    if (bitis && h.tarih >= bitis) continue;
    bakiye = bakiye.add(h.etki);
    const { sira: _sira, ...rest } = h;
    satirlar.push({ ...rest, bakiye });
  }

  const sum = (f: (s: EkstreSatiri) => Prisma.Decimal | undefined) => satirlar.reduce((t, s) => t.add(f(s) ?? 0), D(0));
  return {
    cari,
    donem,
    devreden,
    satirlar,
    toplamTutar: sum((s) => s.tutar),
    toplamKdv: sum((s) => s.kdv),
    toplamBorclanma: sum((s) => s.toplam),
    toplamOdeme: sum((s) => s.odeme),
    sonBakiye: bakiye,
  };
}

/** Bir tipteki (müşteri/tedarikçi) tüm aktif carilerin dönem ekstreleri; hareketi ya da bakiyesi olmayanlar atlanır. */
export async function getEkstreler(tipi: "MUSTERI" | "TEDARIKCI", donem: Donem, limit = 300) {
  const cariler = await db.cari.findMany({ where: { tipi, isActive: true }, orderBy: { unvan: "asc" }, select: { id: true }, take: limit });
  const sonuc: NonNullable<Awaited<ReturnType<typeof getEkstre>>>[] = [];
  for (let i = 0; i < cariler.length; i += 10) {
    const grup = await Promise.all(cariler.slice(i, i + 10).map((c) => getEkstre(c.id, donem)));
    for (const e of grup) if (e && (e.satirlar.length > 0 || !e.devreden.isZero())) sonuc.push(e);
  }
  return sonuc;
}
