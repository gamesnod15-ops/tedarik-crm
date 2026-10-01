-- CreateTable
CREATE TABLE "Alim" (
    "id" TEXT NOT NULL,
    "tarih" DATE NOT NULL,
    "cariId" TEXT NOT NULL,
    "faturaNo" TEXT,
    "aciklama" TEXT,
    "miktar" DECIMAL(14,3),
    "toplam" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Alim_tarih_idx" ON "Alim"("tarih");

-- CreateIndex
CREATE INDEX "Alim_cariId_tarih_idx" ON "Alim"("cariId", "tarih");

-- CreateIndex
CREATE INDEX "Alim_faturaNo_idx" ON "Alim"("faturaNo");

-- AddForeignKey
ALTER TABLE "Alim" ADD CONSTRAINT "Alim_cariId_fkey" FOREIGN KEY ("cariId") REFERENCES "Cari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

