"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { requireUser } from "@/lib/session";

export type ActionState = { error?: string; ok?: string } | undefined;

const passwordSchema = z
  .string()
  .min(10, "Şifre en az 10 karakter olmalı.")
  .max(100, "Şifre en fazla 100 karakter olabilir.")
  .regex(/[A-Za-z]/, "Şifre en az bir harf içermeli.")
  .regex(/\d/, "Şifre en az bir rakam içermeli.");

const nameSchema = z.string().trim().min(2, "Ad en az 2 karakter olmalı.").max(100);
const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Geçerli bir e-posta girin."));

const createSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export async function createUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser("users:write");

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;

  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return { error: "Bu e-posta ile kayıtlı bir kullanıcı zaten var." };
  }

  const user = await db.user.create({
    data: { name, email, role: "ADMIN", passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true },
  });
  await audit({ userId: actor.id, action: "user.create", entity: "User", entityId: user.id, meta: { email } });

  await notify({
    toAdmins: true,
    exceptUserId: actor.id,
    baslik: "Yeni kullanıcı oluşturuldu",
    mesaj: `${actor.name}, ${name} (${email}) hesabını oluşturdu.`,
    href: `/settings/users/${user.id}`,
  });

  revalidatePath("/settings/users");
  redirect("/settings/users");
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: nameSchema,
});

export async function updateUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser("users:write");

  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const target = await db.user.findUnique({ where: { id: parsed.data.id } });
  if (!target) return { error: "Kullanıcı bulunamadı." };

  // Kendi durumunu değiştiremez (formda da kilitli; sunucuda yine yok sayılır).
  const isSelf = target.id === actor.id;
  const isActive = isSelf ? target.isActive : formData.get("isActive") === "on";

  const losesAdmin = target.isActive && !isActive;
  if (losesAdmin) {
    const otherAdmins = await db.user.count({
      where: { role: "ADMIN", isActive: true, id: { not: target.id } },
    });
    if (otherAdmins === 0) return { error: "Sistemde en az bir aktif yönetici kalmalı." };
  }

  await db.user.update({ where: { id: target.id }, data: { name: parsed.data.name, isActive } });
  await audit({
    userId: actor.id,
    action: "user.update",
    entity: "User",
    entityId: target.id,
    meta: {
      email: target.email,
      ...(isActive !== target.isActive && { isActive: { from: target.isActive, to: isActive } }),
      ...(parsed.data.name !== target.name && { name: { from: target.name, to: parsed.data.name } }),
    },
  });

  revalidatePath("/settings/users");
  revalidatePath(`/settings/users/${target.id}`);
  return { ok: "Kullanıcı güncellendi." };
}

const resetSchema = z.object({ id: z.string().min(1), password: passwordSchema });

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser("users:write");

  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const target = await db.user.findUnique({ where: { id: parsed.data.id }, select: { id: true, email: true } });
  if (!target) return { error: "Kullanıcı bulunamadı." };

  await db.user.update({
    where: { id: target.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      failedLogins: 0,
      lockedUntil: null,
      // Başkasının şifresini sıfırlıyorsak kullanıcı ilk girişte kendi şifresini belirler.
      mustChangePassword: target.id !== actor.id,
    },
  });
  await audit({ userId: actor.id, action: "user.password_reset", entity: "User", entityId: target.id, meta: { email: target.email } });

  revalidatePath(`/settings/users/${target.id}`);
  return { ok: target.id === actor.id ? "Şifre güncellendi." : "Şifre güncellendi; kullanıcı ilk girişte değiştirmek zorunda kalacak." };
}

export async function unlockUserAction(formData: FormData): Promise<void> {
  const actor = await requireUser("users:write");
  const id = String(formData.get("id") ?? "");
  const target = await db.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!target) return;

  await db.user.update({ where: { id }, data: { failedLogins: 0, lockedUntil: null } });
  await audit({ userId: actor.id, action: "user.unlock", entity: "User", entityId: id, meta: { email: target.email } });

  revalidatePath("/settings/users");
  revalidatePath(`/settings/users/${id}`);
}
