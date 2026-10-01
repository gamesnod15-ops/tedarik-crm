"use client";

import { useActionState, useEffect } from "react";
import { useToast } from "@/components/toast";
import { updateProfileAction, type ProfileState } from "./actions";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const toast = useToast();
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfileAction, undefined);

  useEffect(() => {
    if (state?.ok) toast.success(state.ok);
    if (state?.error) toast.error(state.error);
  }, [state, toast]);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Ad Soyad</label>
          <input id="name" name="name" defaultValue={name} required placeholder="Adınız Soyadınız" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="email">E-posta</label>
          <input id="email" name="email" type="email" defaultValue={email} required placeholder="ornek@firma.com" className="input" />
        </div>
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>
      )}
      <button disabled={pending} className="btn-primary">{pending ? "Kaydediliyor…" : "Kaydet"}</button>
    </form>
  );
}
