import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/permissions";
import { formatDateTime } from "@/lib/format";

type SP = { q?: string; status?: string };

export default async function UsersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requireUser("users:read");
  const { q, status } = await searchParams;
  const now = new Date();

  const where: Prisma.UserWhereInput = {
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...(status === "active" && { isActive: true }),
    ...(status === "inactive" && { isActive: false }),
  };

  const users = await db.user.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
  const canWrite = can(actor, "users:write");

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Kullanıcılar</h2>
          <p className="text-sm text-slate-500">{users.length} kayıt listeleniyor.</p>
        </div>
        {canWrite && (
          <Link href="/settings/users/new" className="btn-primary">Yeni kullanıcı</Link>
        )}
      </header>

      <form className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="q">Ara</label>
          <input id="q" name="q" defaultValue={q} placeholder="Ad veya e-posta" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="status">Durum</label>
          <select id="status" name="status" defaultValue={status ?? ""} className="input">
            <option value="">Tümü</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
        </div>
        <button className="btn-secondary">Filtrele</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Kullanıcı</th>
              <th className="th">Rol</th>
              <th className="th">Durum</th>
              <th className="th">Son giriş</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 && (
              <tr><td colSpan={5} className="td py-8 text-center text-slate-400">Kullanıcı bulunamadı.</td></tr>
            )}
            {users.map((u) => {
              const locked = u.lockedUntil && u.lockedUntil > now;
              return (
                <tr key={u.id}>
                  <td className="td">
                    <p className="font-medium text-slate-900">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="td">
                    <span className="badge bg-petrol-50 text-petrol-700">{ROLE_LABELS[u.role]}</span>
                  </td>
                  <td className="td">
                    {locked ? (
                      <span className="badge bg-amber-50 text-amber-700">Kilitli</span>
                    ) : u.isActive ? (
                      <span className="badge bg-emerald-50 text-emerald-700">Aktif</span>
                    ) : (
                      <span className="badge bg-slate-100 text-slate-600">Pasif</span>
                    )}
                  </td>
                  <td className="td text-slate-500">{formatDateTime(u.lastLoginAt)}</td>
                  <td className="td text-right">
                    {canWrite && (
                      <Link href={`/settings/users/${u.id}`} className="text-sm font-medium text-petrol-600 hover:underline">
                        Düzenle
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
