-- Personel ödemeleri: bir personele birden fazla ödeme (tutar + açıklama) girilir.
-- Yalnızca bilgi amaçlıdır; finans, bakiye ve rapor hesaplarına katılmaz.
CREATE TABLE "PersonelOdeme" (
    "id" TEXT NOT NULL,
    "personelId" TEXT NOT NULL,
    "tarih" DATE NOT NULL,
    "tutar" DECIMAL(14,2) NOT NULL,
    "aciklama" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonelOdeme_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PersonelOdeme_personelId_tarih_idx" ON "PersonelOdeme"("personelId", "tarih");

ALTER TABLE "PersonelOdeme" ADD CONSTRAINT "PersonelOdeme_personelId_fkey" FOREIGN KEY ("personelId") REFERENCES "Personel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Personel kartındaki tek maaş alanı ödeme kaydına dönüştürülür (veri kaybolmaz), sonra alan kaldırılır.
INSERT INTO "PersonelOdeme" ("id", "personelId", "tarih", "tutar", "aciklama", "createdAt")
SELECT 'mig' || substr(md5(p."id"), 1, 22), p."id", p."updatedAt"::date, p."maas", 'Maaş (önceki kayıttan aktarıldı)', CURRENT_TIMESTAMP
FROM "Personel" p
WHERE p."maas" IS NOT NULL AND p."maas" > 0;

ALTER TABLE "Personel" DROP COLUMN "maas";
