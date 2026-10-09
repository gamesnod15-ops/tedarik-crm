# Tuşba Nakış

Next.js 15 + MariaDB/MySQL + Prisma + Auth.js. Genel taslak: [docs/TASLAK.md](docs/TASLAK.md)

## Yerel kurulum (Windows PowerShell)

Gereksinimler: Node.js 20+, MariaDB/MySQL (Docker Desktop ile `npm run db:up` ya da kendi sunucunuz).

```powershell
npm install
copy .env.example .env        # sonra .env içinde AUTH_SECRET'i doldurun
npm run db:up                 # MariaDB'yi Docker'da başlatır
npm run db:deploy             # mevcut migration'ları uygular
npm run db:seed               # ilk yönetici hesabını oluşturur
npm run dev
```

`AUTH_SECRET` üretmek için: `npx auth secret` ya da `openssl rand -base64 32`.

## Canlıya alma (cPanel)

Canlı adres: https://tusbacrm.tusbanakis.com — cPanel'de **Setup Node.js App** (Node 22, Passenger) ve aynı sunucudaki **MariaDB** (`tusbanak_crm`).

- Uygulama klasörü: `~/tusbacrm`, başlangıç dosyası `app/server.js` (Next.js `standalone` çıktısı).
- Ortam değişkenleri Node.js App ekranında girilir: [.env.example](.env.example) sonundaki canlı bölümü.
- Günlük görev: cPanel **Cron İşleri**, her gün 08:00'de `curl -fsS -H "Authorization: Bearer <CRON_SECRET>" https://tusbacrm.tusbanakis.com/api/cron/gunluk`.
- SSL: cPanel **Lets Encrypt™ SSL** (kendiliğinden yenilenir). Site klasöründeki `.well-known/.htaccess` (`PassengerEnabled off`) doğrulama dosyalarının Node.js'e gitmeden sunulmasını sağlar; silmeyin.

### Yeni sürüm yayınlamak

Değişiklikleri commit edin, sonra:

```powershell
npm run deploy                 # tip kontrolü, derleme, migration, yükleme, yeniden başlatma, kontrol
npm run deploy -- --geri-al    # sorun çıkarsa bir önceki sürüme döner (tekrar çalıştırınca yeniye geçer)
```

- Ayarlar ve gizli değerler `.env.cpanel` dosyasındadır (git'e girmez): `CPANEL_API_TOKEN` (cPanel > Manage API Tokens), `DATABASE_URL_REMOTE`, `AUTH_URL`.
- Migration'lar yeni kod yayına girmeden önce canlı veritabanına uygulanır; geri alma migration'ları geri almaz. Şema değişikliklerini eski kodla uyumlu yapın.
- Sunucuda `~/tusbacrm/app` canlı sürüm, `~/tusbacrm/app_onceki` bir önceki sürümdür.
- Elle yayın (API anahtarı yoksa): `npm run build` ve `npm run paket` → `cpanel-paket.tar.gz` dosyasını Dosya Yöneticisi ile `~/tusbacrm` içine yükleyip **Extract** edin, sonra **Setup Node.js App** > **RESTART**.

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
