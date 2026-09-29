import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import { EditUserForm, ResetPasswordForm } from "../user-forms";
import { unlockUserAction } from "../actions";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser("users:write");
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id } });
  if (!user) notFound();

  const locked = !!user.lockedUntil && user.lockedUntil > new Date();

  return (
    <div className="space-y-6">
      <header>
        <Link href="/settings/users" className="text-sm text-slate-500 hover:underline">← Kullanıcılar</Link>
        <h1 className="mt-1 text-2xl font-semibold">{user.name}</h1>
        <p className="text-sm text-slate-500">
          Oluşturulma: {formatDateTime(user.createdAt)} · Son giriş: {formatDateTime(user.lastLoginAt)}
        </p>
        {user.mustChangePassword && (
          <p className="mt-1 text-sm text-amber-700">Kullanıcı ilk girişte şifresini değiştirmek zorunda.</p>
        )}
      </header>

      {locked && (
        <div className="flex max-w-xl items-center justify-between rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>Hesap {formatDateTime(user.lockedUntil)} tarihine kadar kilitli.</span>
          <form action={unlockUserAction}>
            <input type="hidden" name="id" value={user.id} />
            <button className="font-medium underline">Kilidi aç</button>
          </form>
        </div>
      )}

      <div className="grid max-w-4xl gap-6 md:grid-cols-2">
        <EditUserForm
          id={user.id}
          name={user.name}
          email={user.email}
          role={user.role}
          isActive={user.isActive}
          isSelf={user.id === actor.id}
        />
        <ResetPasswordForm id={user.id} />
      </div>
    </div>
  );
}
