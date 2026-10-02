-- Sipariş kalemi ile ürün kartı arasındaki bağ kaldırılır: ürün, kalemin metin olarak saklanan bir bilgisi olur.
-- Mevcut kalemlerin ürün adı önce metne kopyalanır, sonra yabancı anahtar ve urunId sütunu kaldırılır (veri kaybı yok).

ALTER TABLE "SiparisKalem" ADD COLUMN "urunAdi" TEXT;

UPDATE "SiparisKalem" k SET "urunAdi" = u."ad" FROM "Urun" u WHERE u."id" = k."urunId";

ALTER TABLE "SiparisKalem" ALTER COLUMN "urunAdi" SET NOT NULL;

ALTER TABLE "SiparisKalem" DROP CONSTRAINT "SiparisKalem_urunId_fkey";

DROP INDEX "SiparisKalem_urunId_idx";

ALTER TABLE "SiparisKalem" DROP COLUMN "urunId";
