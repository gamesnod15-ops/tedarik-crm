# Tedarik CRM — Genel Taslak

Tedarik (satın alma) süreçlerini yöneten dahili web uygulaması: tedarikçiler, ürün kataloğu, teklif talepleri, siparişler ve raporlama.

## Teknoloji

| Katman | Seçim |
|---|---|
| Framework | Next.js 15 (App Router, Server Components + Server Actions), TypeScript |
| Veritabanı | PostgreSQL 16 (Docker ile yerelde) |
| ORM | Prisma 6 |
| Kimlik doğrulama | Auth.js v5 (Credentials, JWT oturum, 8 saat) |
| Şifreleme | bcryptjs (cost 12) |
| Doğrulama | zod |
| Arayüz | Tailwind CSS 4 |

## Modüller ve yol haritası

**Faz 1 — Temel (bu aşama, hazır)**
- Giriş / çıkış, oturum yönetimi
- Rol tabanlı yetkilendirme (RBAC): ADMIN, MANAGER, BUYER, VIEWER
- Yönetim paneli: genel bakış, kullanıcı yönetimi, roller/izinler matrisi, denetim kayıtları
- Kendi şifresini değiştirme (`/account`); yönetici tarafından açılan/sıfırlanan hesaplarda ilk girişte zorunlu şifre değişimi
- Rol izinlerini panelden düzenleme (DB'de saklanır, varsayılana döndürülebilir)
- Güvenlik: hesap kilitleme, denetim logu, son yöneticiyi koruma

**Faz 2 — Çekirdek tedarik verisi**
- Tedarikçiler: firma bilgileri, iletişim kişileri, vergi no, ödeme koşulları, durum (aday / onaylı / kara liste), değerlendirme puanı
- Ürün/Hizmet kataloğu: kategoriler, birimler, tedarikçi–ürün fiyat listeleri (geçerlilik tarihli)
- Dosya/belge ekleme (sözleşme, sertifika, teklif PDF)

**Faz 3 — Süreçler**
- Teklif talepleri (RFQ): birden çok tedarikçiye talep, gelen tekliflerin karşılaştırması
- Satın alma talebi → sipariş akışı: taslak → onay bekliyor → onaylandı → sipariş verildi → teslim alındı → kapandı
- Onay kuralları (tutar limitine göre MANAGER onayı)
- Teslimat ve fatura takibi

**Faz 4 — Raporlama ve entegrasyon**
- Harcama raporları (tedarikçi, kategori, dönem), teslimat performansı
- E-posta bildirimleri, CSV/Excel dışa aktarım
- İsteğe bağlı: muhasebe/ERP entegrasyonu, iki adımlı doğrulama (2FA)

## Roller

| Rol | Kapsam |
|---|---|
| ADMIN — Yönetici | Her şey + kullanıcı yönetimi + denetim kayıtları |
| MANAGER — Satın Alma Müdürü | Tedarik modülleri, sipariş onayı, raporlar |
| BUYER — Satın Alma Uzmanı | Tedarikçi/ürün/sipariş oluşturma ve düzenleme (onay yok) |
| VIEWER — Görüntüleyici | Salt okunur |

İzin anahtarları ve **varsayılan** matris `src/lib/permissions.ts` içinde tanımlıdır; yeni modül eklerken önce buraya izin anahtarı eklenir. Yönetici panelden MANAGER/BUYER/VIEWER izinlerini değiştirebilir (`RolePermissionSet` tablosu; satır yoksa varsayılan geçerli). ADMIN rolü ve "Yönetim" grubu izinleri sabittir: yetki yükseltmeyi ve kilitlenmeyi önler.

## Yetkilendirme mimarisi

1. **Middleware** (`src/middleware.ts`): giriş yapmamış kullanıcıyı `/login`'e yollar. Edge'de çalıştığı için DB'ye bakmaz.
2. **`requireUser(permission)`** (`src/lib/session.ts`): her sayfada ve her server action'da çağrılır; kullanıcıyı **DB'den** okur → rol değişikliği ve pasife alma anında etkili olur. Yetkinin tek kaynağı budur.
3. UI'daki gizleme (menü öğeleri vb.) yalnızca kolaylıktır; güvenlik 2. adımdadır.

## Veri modeli (Faz 1)

- `User` — email (unique), name, passwordHash, role, isActive, mustChangePassword, failedLogins, lockedUntil, lastLoginAt
- `RolePermissionSet` — role, permissions[] (panelden yapılan özelleştirmeler)
- `AuditLog` — userId, action, entity, entityId, meta (JSON), ip, createdAt

Faz 2 için öngörülen: `Supplier`, `SupplierContact`, `Category`, `Product`, `PriceList`, `Document`; Faz 3: `Rfq`, `Quote`, `PurchaseOrder`, `PurchaseOrderLine`, `Approval`.

## Güvenlik notları

- 5 hatalı girişte hesap 15 dk kilitlenir; yönetici kilidi açabilir.
- Kullanıcı yokken de bcrypt çalıştırılır (zamanlama farkıyla e-posta keşfini zorlaştırır).
- Kullanıcılar silinmez, pasife alınır (denetim kayıtları bozulmaz).
- Şifre politikası: en az 10 karakter, harf + rakam.
- `AUTH_SECRET` üretimde mutlaka güçlü ve gizli olmalı; HTTPS arkasında çalıştırın.
- Öneri (sonraki adım): IP bazlı rate limit, 2FA, "şifremi unuttum" akışı.
