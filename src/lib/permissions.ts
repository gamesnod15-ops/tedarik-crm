// Edge-safe: Prisma veya Node API'si import etmez.
// Şu an tek rol var (ADMIN). Tedarikçi/ürün/sipariş modülleri eklendiğinde ilgili izinler ve roller buraya eklenir.

export const ROLES = ["ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Yönetici",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Tam yetki: kullanıcı yönetimi, denetim kayıtları ve tüm modüller.",
};

export const PERMISSIONS = [
  { key: "admin:access", group: "Yönetim", label: "Yönetim paneline erişim" },
  { key: "users:read", group: "Yönetim", label: "Kullanıcıları görüntüle" },
  { key: "users:write", group: "Yönetim", label: "Kullanıcı oluştur / düzenle" },
  { key: "roles:read", group: "Yönetim", label: "Rol ve izinleri görüntüle" },
  { key: "audit:read", group: "Yönetim", label: "Denetim kayıtlarını görüntüle" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];

const ALL: Permission[] = PERMISSIONS.map((p) => p.key);

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: ALL,
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
