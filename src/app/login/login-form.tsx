"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div>
        <label htmlFor="email" className="label">E-posta</label>
        <input id="email" name="email" type="email" autoComplete="username" required placeholder="ornek@firma.com" className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">Şifre</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="Şifreniz" className="input" />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="remember" className="h-4 w-4 accent-petrol-600" />
        Beni hatırla
      </label>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
      <p className="flex items-start gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
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
