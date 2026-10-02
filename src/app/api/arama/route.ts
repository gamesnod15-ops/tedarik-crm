import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { can, getCurrentUser } from "@/lib/session";

export type AramaSonuc = { grup: string; baslik: string; alt?: string; href: string };

const LIMIT = 5;

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ sonuclar: [] });

  const icerir = { contains: q, mode: "insensitive" as const };
  const no = /^#?\d{1,9}$/.test(q) ? Number(q.replace("#", "")) : null;
  const sonuclar: AramaSonuc[] = [];

  if (can(user, "cariler:read")) {
    const [cariler, urunler] = await Promise.all([
      db.cari.findMany({
        where: { OR: [{ unvan: icerir }, { telefon: icerir }] },
        orderBy: { unvan: "asc" },
        take: LIMIT,
        select: { id: true, unvan: true, tipi: true, telefon: true },
      }),
      db.urun.findMany({ where: { ad: icerir }, orderBy: { ad: "asc" }, take: LIMIT, select: { ad: true } }),
    ]);
    for (const c of cariler) {
      sonuclar.push({ grup: c.tipi === "MUSTERI" ? "Müşteriler" : "Tedarikçiler", baslik: c.unvan, alt: c.telefon ?? undefined, href: `/cariler/${c.id}` });
    }
    for (const u of urunler) sonuclar.push({ grup: "Ürünler", baslik: u.ad, href: `/urunler?q=${encodeURIComponent(u.ad)}` });
  }
  if (can(user, "siparisler:read")) {
    const siparisler = await db.siparis.findMany({
      where: { OR: [{ cari: { unvan: icerir } }, ...(no !== null ? [{ no }] : [])] },
      orderBy: { no: "desc" },
      take: LIMIT,
      select: { id: true, no: true, cari: { select: { unvan: true } } },
    });
    for (const s of siparisler) sonuclar.push({ grup: "Siparişler", baslik: `#${s.no} · ${s.cari.unvan}`, href: `/siparisler/${s.id}` });
  }
  if (can(user, "personel:read")) {
    const personel = await db.personel.findMany({
      where: { adSoyad: icerir },
      orderBy: { adSoyad: "asc" },
      take: LIMIT,
      select: { adSoyad: true },
    });
    for (const p of personel) sonuclar.push({ grup: "Personel", baslik: p.adSoyad, href: `/personel?q=${encodeURIComponent(p.adSoyad)}` });
  }
  return NextResponse.json({ sonuclar });
}
