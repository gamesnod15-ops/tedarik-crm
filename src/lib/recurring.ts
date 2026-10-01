import { db } from "./db";

/**
 * Tekrarlayan masraf şablonlarından, bu ay için henüz oluşturulmamış olanların masraf kaydını açar.
 * Ayın günü gelmişse (ya da geçmişse) oluşturulur; aynı ay için ikinci kez oluşturulmaz. Günlük görev ve "şimdi oluştur" düğmesi bunu çağırır.
 */
export async function tekrarlayanlariOlustur(bugun: Date) {
  const yil = bugun.getUTCFullYear();
  const ay = bugun.getUTCMonth();
  const gun = bugun.getUTCDate();
  const ayKey = `${yil}-${String(ay + 1).padStart(2, "0")}`;
  const ayinSonGunu = new Date(Date.UTC(yil, ay + 1, 0)).getUTCDate();

  const sablonlar = await db.tekrarlayanMasraf.findMany({ where: { isActive: true } });
  let olusturulan = 0;

  for (const s of sablonlar) {
    const hedefGun = Math.min(s.gun, ayinSonGunu);
    if (gun < hedefGun) continue;

    // Aynı anda iki çalıştırma olsa bile tek kayıt: önce koşullu güncelleme ile "bu ay" işaretlenir.
    const kilit = await db.tekrarlayanMasraf.updateMany({
      where: { id: s.id, OR: [{ sonOlusturma: null }, { sonOlusturma: { not: ayKey } }] },
      data: { sonOlusturma: ayKey },
    });
    if (kilit.count !== 1) continue;

    try {
      await db.masraf.create({
        data: {
          tarih: new Date(Date.UTC(yil, ay, hedefGun)),
          kategori: s.kategori,
          aciklama: s.aciklama,
          tutar: s.tutar,
          odemeSekli: s.odemeSekli,
        },
      });
      olusturulan++;
    } catch (err) {
      // Kayıt açılamadıysa işaret geri alınır, bir sonraki çalıştırmada yeniden denenir.
      await db.tekrarlayanMasraf.update({ where: { id: s.id }, data: { sonOlusturma: s.sonOlusturma } });
      console.error("[tekrarlayan] masraf oluşturulamadı", s.id, err);
    }
  }
  return { olusturulan, toplam: sablonlar.length };
}
