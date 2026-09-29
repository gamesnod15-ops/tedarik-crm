"use client";

import { useActionState } from "react";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import {
  createUserAction,
  resetPasswordAction,
  updateUserAction,
  type ActionState,
} from "./actions";

function Message({ state }: { state: ActionState }) {
  if (state?.error)
    return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state?.ok)
    return <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>;
  return null;
}

function RoleField({ role = "ADMIN" }: { role?: Role }) {
  return <input value={ROLE_LABELS[role]} disabled readOnly className="input" />;
}

const PASSWORD_HINT = "En az 10 karakter, harf ve rakam içermeli.";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, undefined);
  return (
    <form action={action} className="card max-w-xl space-y-4 p-6">
      <div>
        <label className="label" htmlFor="name">Ad Soyad</label>
        <input id="name" name="name" required placeholder="Ad Soyad" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">E-posta</label>
        <input id="email" name="email" type="email" required placeholder="ornek@firma.com" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="role">Rol</label>
        <RoleField />
      </div>
      <div>
        <label className="label" htmlFor="password">Geçici şifre</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required placeholder="Geçici şifre" className="input" />
        <p className="mt-1 text-xs text-slate-500">{PASSWORD_HINT} Kullanıcı ilk girişte bunu değiştirmek zorunda kalır.</p>
      </div>
      <Message state={state} />
      <button disabled={pending} className="btn-primary">{pending ? "Kaydediliyor…" : "Kullanıcı oluştur"}</button>
    </form>
  );
}

export function EditUserForm(props: {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  isSelf: boolean;
}) {
  const [state, action, pending] = useActionState(updateUserAction, undefined);
  return (
    <form action={action} className="card space-y-4 p-6">
      <h2 className="text-sm font-semibold">Profil ve yetki</h2>
      <input type="hidden" name="id" value={props.id} />
      <div>
        <label className="label" htmlFor="name">Ad Soyad</label>
        <input id="name" name="name" defaultValue={props.name} required placeholder="Ad Soyad" className="input" />
      </div>
      <div>
        <label className="label">E-posta</label>
        <input value={props.email} disabled className="input" readOnly />
      </div>
      <div>
        <label className="label" htmlFor="role">Rol</label>
        <RoleField role={props.role} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={props.isActive} disabled={props.isSelf} className="h-4 w-4" />
        Hesap aktif
      </label>
      {props.isSelf && (
        <p className="text-xs text-slate-500">Kendi hesap durumunuzu değiştiremezsiniz.</p>
      )}
      <Message state={state} />
      <button disabled={pending} className="btn-primary">{pending ? "Kaydediliyor…" : "Kaydet"}</button>
    </form>
  );
}

export function ResetPasswordForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="card space-y-4 p-6">
      <h2 className="text-sm font-semibold">Şifre sıfırla</h2>
      <input type="hidden" name="id" value={id} />
      <div>
        <label className="label" htmlFor="new-password">Yeni şifre</label>
        <input id="new-password" name="password" type="password" autoComplete="new-password" required placeholder="Yeni şifre" className="input" />
        <p className="mt-1 text-xs text-slate-500">{PASSWORD_HINT} Hesap kilidi de kaldırılır.</p>
      </div>
      <Message state={state} />
      <button disabled={pending} className="btn-secondary">{pending ? "Güncelleniyor…" : "Şifreyi güncelle"}</button>
    </form>
  );
}
