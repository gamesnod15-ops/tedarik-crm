"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/session";

export type PasswordState = { error?: string; ok?: string } | undefined;

const schema = z
  .object({
    current: z.string().min(1, "Mevcut şifrenizi girin."),
    password: z
      .string()
      .min(10, "Yeni şifre en az 10 karakter olmalı.")
      .max(100, "Şifre en fazla 100 karakter olabilir.")
      .regex(/[A-Za-z]/, "Yeni şifre en az bir harf içermeli.")
      .regex(/\d/, "Yeni şifre en az bir rakam içermeli."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Yeni şifreler eşleşmiyor.", path: ["confirm"] })
  .refine((v) => v.password !== v.current, { message: "Yeni şifre mevcut şifreden farklı olmalı.", path: ["password"] });

// requireUser() burada kullanılmaz: şifre değişimi zorunlu olan kullanıcı da bu işlemi yapabilmeli.
export async function changePasswordAction(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const record = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!record || !(await bcrypt.compare(parsed.data.current, record.passwordHash))) {
    return { error: "Mevcut şifre hatalı." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 12), mustChangePassword: false },
  });
  await audit({ userId: user.id, action: "auth.password_change", entity: "User", entityId: user.id });

  if (user.mustChangePassword) redirect("/");
  return { ok: "Şifreniz güncellendi." };
}

export type ProfileState = { error?: string; ok?: string } | undefined;

const profileSchema = z.object({
  name: z.string().trim().min(2, "Ad en az 2 karakter olmalı.").max(100, "Ad en fazla 100 karakter olabilir."),
  email: z.string().trim().toLowerCase().pipe(z.email("Geçerli bir e-posta girin.")),
});

export async function updateProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email } = parsed.data;

  if (name === user.name && email === user.email) return { ok: "Değişiklik yok." };

  if (email !== user.email) {
    const taken = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (taken) return { error: "Bu e-posta başka bir hesapta kullanılıyor." };
  }

  await db.user.update({ where: { id: user.id }, data: { name, email } });
  await audit({
    userId: user.id,
    action: "user.profile_update",
    entity: "User",
    entityId: user.id,
    meta: {
      ...(name !== user.name && { name: { from: user.name, to: name } }),
      ...(email !== user.email && { email: { from: user.email, to: email } }),
    },
  });

  revalidatePath("/", "layout");
  return { ok: "Profil bilgileriniz güncellendi." };
}
