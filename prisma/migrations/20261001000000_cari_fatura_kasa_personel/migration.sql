-- CreateEnum
CREATE TYPE "CariTipi" AS ENUM ('MUSTERI', 'TEDARIKCI');

-- CreateEnum
CREATE TYPE "IslemTipi" AS ENUM ('TAHSILAT', 'ODEME');

-- CreateEnum
CREATE TYPE "OdemeSekli" AS ENUM ('NAKIT', 'HAVALE_EFT', 'CEK', 'SENET', 'KREDI_KARTI', 'DIGER');

-- CreateEnum
CREATE TYPE "PersonelDurum" AS ENUM ('AKTIF', 'PASIF');

-- CreateEnum
CREATE TYPE "HareketTuru" AS ENUM ('GIRIS_CIKIS', 'IZIN');

-- CreateEnum
CREATE TYPE "IzinTuru" AS ENUM ('YILLIK', 'RAPORLU', 'UCRETSIZ', 'MAZERET', 'DIGER');

-- CreateTable
CREATE TABLE "Cari" (
    "id" TEXT NOT NULL,
    "tipi" "CariTipi" NOT NULL,
    "unvan" TEXT NOT NULL,
    "yetkili" TEXT,
    "telefon" TEXT,
    "eposta" TEXT,
    "adres" TEXT,
    "vergiNo" TEXT,
    "acilisBakiyesi" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notlar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Urun" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "birim" TEXT NOT NULL DEFAULT 'Adet',
    "birimFiyat" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "kdvOrani" INTEGER NOT NULL DEFAULT 20,
    "aciklama" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Urun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Siparis" (
    "id" TEXT NOT NULL,
    "no" SERIAL NOT NULL,
    "tarih" DATE NOT NULL,
    "cariId" TEXT NOT NULL,
    "aciklama" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Siparis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiparisKalem" (
    "id" TEXT NOT NULL,
    "siparisId" TEXT NOT NULL,
    "urunId" TEXT NOT NULL,
    "adet" DECIMAL(14,3) NOT NULL,
    "birimFiyat" DECIMAL(14,2) NOT NULL,
    "kdvOrani" INTEGER NOT NULL DEFAULT 20,
    "aciklama" TEXT,

    CONSTRAINT "SiparisKalem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Odeme" (
    "id" TEXT NOT NULL,
    "tarih" DATE NOT NULL,
    "cariId" TEXT NOT NULL,
    "islemTipi" "IslemTipi" NOT NULL,
    "tutar" DECIMAL(14,2) NOT NULL,
    "odemeSekli" "OdemeSekli" NOT NULL DEFAULT 'NAKIT',
    "aciklama" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Odeme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Masraf" (
    "id" TEXT NOT NULL,
    "tarih" DATE NOT NULL,
    "kategori" TEXT,
    "aciklama" TEXT NOT NULL,
    "tutar" DECIMAL(14,2) NOT NULL,
    "odemeSekli" "OdemeSekli",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Masraf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Personel" (
    "id" TEXT NOT NULL,
    "adSoyad" TEXT NOT NULL,
    "sicilNo" TEXT NOT NULL,
    "departman" TEXT,
    "telefon" TEXT,
    "iseGirisTarihi" DATE NOT NULL,
    "durum" "PersonelDurum" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Personel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonelHareket" (
    "id" TEXT NOT NULL,
    "personelId" TEXT NOT NULL,
    "islemTuru" "HareketTuru" NOT NULL,
    "tarih" DATE NOT NULL,
    "girisSaati" TEXT,
    "cikisSaati" TEXT,
    "izinTuru" "IzinTuru",
    "izinBaslangic" DATE,
    "izinBitis" DATE,
    "aciklama" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonelHareket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cari_tipi_idx" ON "Cari"("tipi");

-- CreateIndex
CREATE INDEX "Cari_unvan_idx" ON "Cari"("unvan");

-- CreateIndex
CREATE INDEX "Urun_ad_idx" ON "Urun"("ad");

-- CreateIndex
CREATE UNIQUE INDEX "Siparis_no_key" ON "Siparis"("no");

-- CreateIndex
CREATE INDEX "Siparis_tarih_idx" ON "Siparis"("tarih");

-- CreateIndex
CREATE INDEX "Siparis_cariId_idx" ON "Siparis"("cariId");

-- CreateIndex
CREATE INDEX "SiparisKalem_siparisId_idx" ON "SiparisKalem"("siparisId");

-- CreateIndex
CREATE INDEX "SiparisKalem_urunId_idx" ON "SiparisKalem"("urunId");

-- CreateIndex
CREATE INDEX "Odeme_tarih_idx" ON "Odeme"("tarih");

-- CreateIndex
CREATE INDEX "Odeme_cariId_idx" ON "Odeme"("cariId");

-- CreateIndex
CREATE INDEX "Masraf_tarih_idx" ON "Masraf"("tarih");

-- CreateIndex
CREATE INDEX "Masraf_kategori_idx" ON "Masraf"("kategori");

-- CreateIndex
CREATE UNIQUE INDEX "Personel_sicilNo_key" ON "Personel"("sicilNo");

-- CreateIndex
CREATE INDEX "Personel_durum_idx" ON "Personel"("durum");

-- CreateIndex
CREATE INDEX "PersonelHareket_personelId_tarih_idx" ON "PersonelHareket"("personelId", "tarih");

-- CreateIndex
CREATE INDEX "PersonelHareket_tarih_idx" ON "PersonelHareket"("tarih");

-- AddForeignKey
ALTER TABLE "Siparis" ADD CONSTRAINT "Siparis_cariId_fkey" FOREIGN KEY ("cariId") REFERENCES "Cari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiparisKalem" ADD CONSTRAINT "SiparisKalem_siparisId_fkey" FOREIGN KEY ("siparisId") REFERENCES "Siparis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiparisKalem" ADD CONSTRAINT "SiparisKalem_urunId_fkey" FOREIGN KEY ("urunId") REFERENCES "Urun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Odeme" ADD CONSTRAINT "Odeme_cariId_fkey" FOREIGN KEY ("cariId") REFERENCES "Cari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonelHareket" ADD CONSTRAINT "PersonelHareket_personelId_fkey" FOREIGN KEY ("personelId") REFERENCES "Personel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

