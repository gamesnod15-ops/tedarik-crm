-- CreateTable
CREATE TABLE `PersonelMaas` (
    `id` VARCHAR(191) NOT NULL,
    `personelId` VARCHAR(191) NOT NULL,
    `ay` DATE NOT NULL,
    `maas` DECIMAL(14, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PersonelMaas_personelId_ay_key`(`personelId`, `ay`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PersonelMaas` ADD CONSTRAINT `PersonelMaas_personelId_fkey` FOREIGN KEY (`personelId`) REFERENCES `Personel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Mevcut sabit maaşlar geçmişe aktarılır: personel kartının açıldığı ay ile ilk ödeme ayından hangisi önceyse o aydan geçerli sayılır.
INSERT INTO `PersonelMaas` (`id`, `personelId`, `ay`, `maas`, `createdAt`, `updatedAt`)
SELECT
    UUID(),
    p.`id`,
    DATE_FORMAT(LEAST(DATE(p.`createdAt`), COALESCE((SELECT MIN(o.`tarih`) FROM `PersonelOdeme` o WHERE o.`personelId` = p.`id`), DATE(p.`createdAt`))), '%Y-%m-01'),
    p.`maas`,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `Personel` p
WHERE p.`maas` IS NOT NULL;
