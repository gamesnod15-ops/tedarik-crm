"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: string } | undefined;

// Açık yönlendirme (open redirect) engeli: yalnızca site içi yollar.
function safeCallback(url: string) {
  return url.startsWith("/") && !url.startsWith("//") ? url : "/";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on" ? "on" : "";
  const redirectTo = safeCallback(String(formData.get("callbackUrl") ?? "/"));

  try {
    await signIn("credentials", { email, password, remember, redirectTo });
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        error: "E-posta veya şifre hatalı ya da hesap geçici olarak kilitli/pasif.",
      };
    }
    throw err; // NEXT_REDIRECT dahil
  }
}
