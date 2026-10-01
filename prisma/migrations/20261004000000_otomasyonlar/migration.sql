-- AlterTable
ALTER TABLE "Cari" ADD COLUMN     "vadeGunu" INTEGER;

-- CreateTable
CREATE TABLE "TekrarlayanMasraf" (
    "id" TEXT NOT NULL,
    "aciklama" TEXT NOT NULL,
    "kategori" TEXT,
    "tutar" DECIMAL(14,2) NOT NULL,
    "odemeSekli" "OdemeSekli",
    "gun" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sonOlusturma" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TekrarlayanMasraf_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TekrarlayanMasraf_isActive_idx" ON "TekrarlayanMasraf"("isActive");

