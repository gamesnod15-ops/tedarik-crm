-- CreateEnum
CREATE TYPE "SiparisDurumu" AS ENUM ('BEKLIYOR', 'HAZIRLANIYOR', 'TESLIM_EDILDI', 'FATURALANDI', 'IPTAL');

-- AlterTable
ALTER TABLE "Urun" ALTER COLUMN "kdvOrani" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Siparis" ADD COLUMN     "durum" "SiparisDurumu" NOT NULL DEFAULT 'BEKLIYOR';

-- AlterTable
ALTER TABLE "SiparisKalem" ALTER COLUMN "kdvOrani" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Siparis_durum_idx" ON "Siparis"("durum");

