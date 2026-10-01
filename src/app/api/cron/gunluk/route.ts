import { db } from "@/lib/db";
import { bugunTarihi, getVadesiGecenAlacaklar } from "@/lib/alacak";
import { formatMoney } from "@/lib/format";
import { notify } from "@/lib/notify";
import { tekrarlayanlariOlustur } from "@/lib/recurring";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UYARI_BASLIK = "Vadesi geçmiş alacak";
const TEKRAR_GUN = 7; // Aynı müşteri için uyarı en sık 7 günde bir tekrarlanır.

/** Vadesi geçen her müşteri için yöneticilere bildirim gönderir (aynı müşteri için son 7 günde gönderilmişse atlanır). */
async function alacakUyarilariniGonder() {
  const liste = await getVadesiGecenAlacaklar();
  const esik = new Date(Date.now() - TEKRAR_GUN * 86_400_000);
  let gonderilen = 0;

  for (const v of liste) {
    const href = `/cariler/${v.cariId}`;
    const yakin = await db.notification.findFirst({ where: { href, baslik: UYARI_BASLIK, createdAt: { gt: esik } }, select: { id: true } });
    if (yakin) continue;
    await notify({
      toAdmins: true,
      tur: "UYARI",
      baslik: UYARI_BASLIK,
      mesaj: `${v.unvan}: ${formatMoney(v.gecikmis)} vadesi geçmiş${v.enEskiGecikmeGun > 0 ? ` (en eski ${v.enEskiGecikmeGun} gün gecikmiş)` : " (devreden bakiye)"}.`,
      href,
    });
    gonderilen++;
  }
  return { vadesiGecen: liste.length, gonderilen };
}

/**
 * Günlük zamanlanmış görev (Vercel Cron, vercel.json): vadesi geçen alacak uyarıları + tekrarlayan masrafların oluşturulması.
 * Yetki: Vercel, CRON_SECRET ortam değişkeni tanımlıysa isteğe "Authorization: Bearer <CRON_SECRET>" ekler.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const alacak = await alacakUyarilariniGonder();
  const tekrarlayan = await tekrarlayanlariOlustur(bugunTarihi());
  return Response.json({ ok: true, alacak, tekrarlayan });
}
