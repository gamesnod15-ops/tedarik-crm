"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Yalnızca kullanıcının kendi bildirimlerine dokunulabilir (userId koşulu).
export async function markNotificationReadAction(id: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await db.notification.updateMany({ where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction() {
  const user = await getCurrentUser();
  if (!user) return;
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}

export async function clearReadNotificationsAction() {
  const user = await getCurrentUser();
  if (!user) return;
  await db.notification.deleteMany({ where: { userId: user.id, readAt: { not: null } } });
  revalidatePath("/", "layout");
}
