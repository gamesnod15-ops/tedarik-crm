# Tuşba Nakış

Next.js 15 + PostgreSQL + Prisma + Auth.js. Genel taslak: [docs/TASLAK.md](docs/TASLAK.md)

## Yerel kurulum (Windows PowerShell)

Gereksinimler: Node.js 20+, PostgreSQL (Docker Desktop ile `npm run db:up` ya da kendi sunucunuz).

```powershell
npm install
copy .env.example .env        # sonra .env içinde AUTH_SECRET'i doldurun
npm run db:up                 # PostgreSQL'i Docker'da başlatır
npm run db:deploy             # mevcut migration'ları uygular
npm run db:seed               # ilk yönetici hesabını oluşturur
npm run dev
```

`AUTH_SECRET` üretmek için: `npx auth secret` ya da `openssl rand -base64 32`.

## Canlıya alma

1. **Canlı PostgreSQL** hazırlayın ve bağlantı adresini alın (`postgresql://kullanıcı:şifre@host:5432/db?schema=public&sslmode=require`).
2. **Sunucunun ortam değişkenlerine** [.env.example](.env.example) sonundaki canlı bölümünü girin: `DATABASE_URL` ve `DATABASE_URL_UNPOOLED` (Neon entegrasyonu kendisi ekler), `AUTH_SECRET` (yerelden farklı), `AUTH_URL`, `AUTH_TRUST_HOST`.
3. **Migration'ı kendi bilgisayarınızdan** canlı veritabanına uygulayın (Windows PowerShell):

   ```powershell
   # Vercel > Settings > Environment Variables'tan iki değeri kopyalayın:
   $env:DATABASE_URL = "<havuzlu adres>"
   $env:DATABASE_URL_UNPOOLED = "<doğrudan (unpooled) adres>"
   npm run db:status      # hangi migration'lar uygulanmış/bekliyor
   npm run db:deploy      # bekleyenleri uygular (veri silmez, sadece migration dosyalarını çalıştırır)
   ```

   İlk yönetici için (yalnızca bir kez):

   ```powershell
   $env:SEED_ADMIN_EMAIL = "yonetici@firma.com"
   $env:SEED_ADMIN_PASSWORD = "en-az-10-karakter-guclu-sifre1"
   npm run db:seed
   ```

   Seed ile oluşan yönetici ilk girişte şifresini değiştirmek zorundadır. İşiniz bitince aynı oturumda `Remove-Item Env:DATABASE_URL, Env:DATABASE_URL_UNPOOLED` yazın; yoksa sonraki komutlar yanlışlıkla canlıya gider.
4. **Uygulamayı derleyip başlatın** (sunucuda): `npm ci && npm run build && npm start` (varsayılan port 3000; başına nginx/Caddy gibi bir HTTPS proxy koyun).

### Şema değişikliği yaparken

- Yerelde geliştirme veritabanına karşı: `npm run db:migrate -- --name aciklama` (migration dosyası üretir, `prisma/migrations` git'e girer).
- Canlıya: yukarıdaki `db:deploy`. Canlıda **asla** `db:migrate` (migrate dev) çalıştırmayın; o komut veritabanını sıfırlamayı önerebilir.
- Sıra: önce migration'ı canlıya uygulayın, sonra yeni kodu yayınlayın (eski kodla uyumlu, geriye dönük değişiklikler yapın).

## Yapı

```
prisma/                  şema, migration, seed
src/auth.ts              Auth.js (Credentials, kilitleme, denetim)
src/auth.config.ts       Edge-safe ayarlar (middleware)
src/lib/permissions.ts   Roller ve izinler
src/lib/session.ts       requireUser(permission)
src/app/login            Giriş sayfası
src/app/(app)            Giriş sonrası kabuk (header, sidebar), Özet, Hesabım
src/app/(app)/settings   Ayarlar: genel bakış, kullanıcılar, roller, denetim kayıtları
```

## Yeni izin / rol eklemek

`src/lib/permissions.ts` içinde `ROLES`, `PERMISSIONS` ve `ROLE_PERMISSIONS` güncellenir. Yeni rol için ayrıca `prisma/schema.prisma` içindeki `Role` enum'una eklenip migration üretilir (`npm run db:migrate`) ve canlıya `db:deploy` ile uygulanır.
