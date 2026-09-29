import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "./db";
import type { Permission } from "./permissions";
import { ROLE_PERMISSIONS } from "./permissions";

/**
 * JWT'ye değil DB'ye bakar: rol ve pasife alma değişiklikleri anında geçerli olur.
 * Dönen `permissions` rolün izinleridir (src/lib/permissions.ts).
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, isActive: true, mustChangePassword: true },
  });
  if (!user || !user.isActive) return null;
  const permissions = ROLE_PERMISSIONS[user.role];
  return { ...user, permissions };
}

export function can(user: { permissions: readonly Permission[] }, permission: Permission) {
  return user.permissions.includes(permission);
}

/**
 * Giriş + (opsiyonel) izin zorunlu kılar. Sayfalarda ve server action'larda kullanın.
 * Şifresini değiştirmesi gereken kullanıcı /account sayfasına yönlendirilir.
 */
export async function requireUser(permission?: Permission) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/account");
  if (permission && !can(user, permission)) redirect("/forbidden");
  return user;
}
