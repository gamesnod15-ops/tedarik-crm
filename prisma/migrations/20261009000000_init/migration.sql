-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN') NOT NULL DEFAULT 'ADMIN',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    `failedLogins` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `meta` JSON NULL,
    `ip` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    INDEX `AuditLog_action_idx`(`action`),
    INDEX `AuditLog_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cari` (
    `id` VARCHAR(191) NOT NULL,
    `tipi` ENUM('MUSTERI', 'TEDARIKCI') NOT NULL,
    `unvan` VARCHAR(255) NOT NULL,
    `yetkili` TEXT NULL,
    `telefon` TEXT NULL,
    `eposta` TEXT NULL,
    `adres` TEXT NULL,
    `acilisBakiyesi` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `notlar` TEXT NULL,
    `vadeGunu` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Cari_tipi_idx`(`tipi`),
    INDEX `Cari_unvan_idx`(`unvan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Urun` (
    `id` VARCHAR(191) NOT NULL,
    `ad` VARCHAR(255) NOT NULL,
    `birim` VARCHAR(191) NOT NULL DEFAULT 'Adet',
    `birimFiyat` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `kdvOrani` INTEGER NOT NULL,
    `aciklama` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Urun_ad_idx`(`ad`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Siparis` (
    `id` VARCHAR(191) NOT NULL,
    `no` INTEGER NOT NULL AUTO_INCREMENT,
    `tarih` DATE NOT NULL,
    `cariId` VARCHAR(191) NOT NULL,
    `aciklama` TEXT NULL,
    `durum` ENUM('BEKLIYOR', 'HAZIRLANIYOR', 'TESLIM_EDILDI', 'FATURALANDI', 'IPTAL') NOT NULL DEFAULT 'BEKLIYOR',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Siparis_no_key`(`no`),
    INDEX `Siparis_tarih_idx`(`tarih`),
    INDEX `Siparis_cariId_idx`(`cariId`),
    INDEX `Siparis_durum_idx`(`durum`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiparisKalem` (
    `id` VARCHAR(191) NOT NULL,
    `siparisId` VARCHAR(191) NOT NULL,
    `urunAdi` VARCHAR(255) NOT NULL,
    `adet` DECIMAL(14, 3) NOT NULL,
    `birimFiyat` DECIMAL(14, 2) NOT NULL,
    `kdvOrani` INTEGER NOT NULL,
    `aciklama` TEXT NULL,

    INDEX `SiparisKalem_siparisId_idx`(`siparisId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Odeme` (
    `id` VARCHAR(191) NOT NULL,
    `tarih` DATE NOT NULL,
    `cariId` VARCHAR(191) NOT NULL,
    `islemTipi` ENUM('TAHSILAT', 'ODEME') NOT NULL,
    `tutar` DECIMAL(14, 2) NOT NULL,
    `odemeSekli` ENUM('NAKIT', 'HAVALE_EFT', 'CEK', 'SENET', 'KREDI_KARTI', 'DIGER') NOT NULL DEFAULT 'NAKIT',
    `aciklama` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Odeme_tarih_idx`(`tarih`),
    INDEX `Odeme_cariId_idx`(`cariId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Masraf` (
    `id` VARCHAR(191) NOT NULL,
    `tarih` DATE NOT NULL,
    `kategori` VARCHAR(191) NULL,
    `aciklama` TEXT NOT NULL,
    `tutar` DECIMAL(14, 2) NOT NULL,
    `odemeSekli` ENUM('NAKIT', 'HAVALE_EFT', 'CEK', 'SENET', 'KREDI_KARTI', 'DIGER') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Masraf_tarih_idx`(`tarih`),
    INDEX `Masraf_kategori_idx`(`kategori`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Personel` (
    `id` VARCHAR(191) NOT NULL,
    `adSoyad` VARCHAR(255) NOT NULL,
    `sicilNo` VARCHAR(191) NULL,
    `departman` VARCHAR(191) NULL,
    `telefon` VARCHAR(191) NULL,
    `iseGirisTarihi` DATE NULL,
    `maas` DECIMAL(14, 2) NULL,
    `aciklama` TEXT NULL,
    `durum` ENUM('AKTIF', 'PASIF') NOT NULL DEFAULT 'AKTIF',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Personel_sicilNo_key`(`sicilNo`),
    INDEX `Personel_durum_idx`(`durum`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PersonelOdeme` (
    `id` VARCHAR(191) NOT NULL,
    `personelId` VARCHAR(191) NOT NULL,
    `tarih` DATE NOT NULL,
    `tutar` DECIMAL(14, 2) NOT NULL,
    `aciklama` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PersonelOdeme_personelId_tarih_idx`(`personelId`, `tarih`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PersonelHareket` (
    `id` VARCHAR(191) NOT NULL,
    `personelId` VARCHAR(191) NOT NULL,
    `islemTuru` ENUM('GIRIS_CIKIS', 'IZIN') NOT NULL,
    `tarih` DATE NOT NULL,
    `girisSaati` VARCHAR(191) NULL,
    `cikisSaati` VARCHAR(191) NULL,
    `izinTuru` ENUM('YILLIK', 'RAPORLU', 'UCRETSIZ', 'MAZERET', 'DIGER') NULL,
    `izinBaslangic` DATE NULL,
    `izinBitis` DATE NULL,
    `aciklama` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PersonelHareket_personelId_tarih_idx`(`personelId`, `tarih`),
    INDEX `PersonelHareket_tarih_idx`(`tarih`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tur` ENUM('BILGI', 'BASARI', 'UYARI', 'HATA') NOT NULL DEFAULT 'BILGI',
    `baslik` TEXT NOT NULL,
    `mesaj` TEXT NULL,
    `href` TEXT NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_readAt_idx`(`userId`, `readAt`),
    INDEX `Notification_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Alim` (
    `id` VARCHAR(191) NOT NULL,
    `tarih` DATE NOT NULL,
    `cariId` VARCHAR(191) NOT NULL,
    `faturaNo` VARCHAR(191) NULL,
    `aciklama` TEXT NULL,
    `miktar` DECIMAL(14, 3) NULL,
    `toplam` DECIMAL(14, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Alim_tarih_idx`(`tarih`),
    INDEX `Alim_cariId_tarih_idx`(`cariId`, `tarih`),
    INDEX `Alim_faturaNo_idx`(`faturaNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TekrarlayanMasraf` (
    `id` VARCHAR(191) NOT NULL,
    `aciklama` TEXT NOT NULL,
    `kategori` VARCHAR(191) NULL,
    `tutar` DECIMAL(14, 2) NOT NULL,
    `odemeSekli` ENUM('NAKIT', 'HAVALE_EFT', 'CEK', 'SENET', 'KREDI_KARTI', 'DIGER') NULL,
    `gun` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sonOlusturma` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TekrarlayanMasraf_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Siparis` ADD CONSTRAINT `Siparis_cariId_fkey` FOREIGN KEY (`cariId`) REFERENCES `Cari`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SiparisKalem` ADD CONSTRAINT `SiparisKalem_siparisId_fkey` FOREIGN KEY (`siparisId`) REFERENCES `Siparis`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Odeme` ADD CONSTRAINT `Odeme_cariId_fkey` FOREIGN KEY (`cariId`) REFERENCES `Cari`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PersonelOdeme` ADD CONSTRAINT `PersonelOdeme_personelId_fkey` FOREIGN KEY (`personelId`) REFERENCES `Personel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PersonelHareket` ADD CONSTRAINT `PersonelHareket_personelId_fkey` FOREIGN KEY (`personelId`) REFERENCES `Personel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Alim` ADD CONSTRAINT `Alim_cariId_fkey` FOREIGN KEY (`cariId`) REFERENCES `Cari`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

