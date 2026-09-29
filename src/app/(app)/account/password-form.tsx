"use client";

import { useActionState } from "react";
import { changePasswordAction, type PasswordState } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePasswordAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="current">Mevcut şifre</label>
        <input id="current" name="current" type="password" autoComplete="current-password" required placeholder="Mevcut şifreniz" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Yeni şifre</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required placeholder="Yeni şifreniz" className="input" />
        <p className="mt-1 text-xs text-slate-500">En az 10 karakter, harf ve rakam içermeli.</p>
      </div>
      <div>
        <label className="label" htmlFor="confirm">Yeni şifre (tekrar)</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required placeholder="Yeni şifrenizi tekrar girin" className="input" />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>
      )}
      <button disabled={pending} className="btn-primary">{pending ? "Güncelleniyor…" : "Şifreyi değiştir"}</button>
    </form>
  );
}
