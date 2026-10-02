-- Personel artık yalnızca ad soyad ile tutulur: sicil no ve işe giriş tarihi zorunlu değil (eski değerler korunur).
ALTER TABLE "Personel" ALTER COLUMN "sicilNo" DROP NOT NULL;
ALTER TABLE "Personel" ALTER COLUMN "iseGirisTarihi" DROP NOT NULL;
