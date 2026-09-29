"use server";

import { signOut } from "@/auth";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/session";

export async function signOutAction() {
  const user = await getCurrentUser();
  if (user) await audit({ userId: user.id, action: "auth.logout" });
  await signOut({ redirectTo: "/login" });
}
