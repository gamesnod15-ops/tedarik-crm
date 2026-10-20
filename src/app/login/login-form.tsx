"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

// Giriş, Server Action yerine NextAuth'un istemci signIn'i ile /api/auth/callback/credentials'a gider.
// Neden: cPanel/Passenger, Server Action'ın başarılı giriş sonrası ürettiği 303+RSC yönlendirme cevabını
// geri gönderemiyor (istek donuyor → 504 → "An unexpected response was received from the server").
// redirect:false ile cevabı alıp yönlendirmeyi kendimiz yapıyoruz; böylece o yoldan hiç geçilmiyor.
function safeCallback(url: string) {
  return url.startsWith("/") && !url.startsWith("//") ? url : "/";
}

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const remember = form.get("remember") === "on" ? "on" : "";

    try {
      const res = await signIn("credentials", { email, password, remember, redirect: false });
      if (res?.error) {
        setError("E-posta veya şifre hatalı ya da hesap geçici olarak kilitli/pasif.");
        setPending(false);
        return;
      }
      // Oturum çerezi yazıldı; panele tam sayfa geçiş yapılır (çerez bir sonraki istekte okunur).
      window.location.href = safeCallback(callbackUrl);
    } catch {
      setError("Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">E-posta</label>
        <input id="email" name="email" type="email" autoComplete="username" required placeholder="ornek@firma.com" className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">Şifre</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="Şifreniz" className="input" />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="remember" className="h-4 w-4 accent-brand-600" />
        Beni hatırla
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
      <p className="flex items-start gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500">
        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-petrol-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        <span>
          Güvenli giriş: bağlantınız şifrelenir, hatalı denemeler kayıt altına alınır ve hesap 5 hatalı denemeden sonra geçici olarak kilitlenir.
        </span>
      </p>
    </form>
  );
}
