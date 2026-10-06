-- Personel ödemeleri: bir personele birden fazla ödeme (tutar + açıklama) girilir.
-- Personel kartındaki maaş alanı ve değerleri olduğu gibi kalır.
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
