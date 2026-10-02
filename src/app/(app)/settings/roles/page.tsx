import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PERMISSIONS, ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_PERMISSIONS } from "@/lib/permissions";

export default async function RolesPage() {
  await requireUser("roles:read");

  const counts = await db.user.groupBy({ by: ["role"], _count: { _all: true } });
  const countByRole = Object.fromEntries(counts.map((c) => [c.role, c._count._all]));

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">Roller ve İzinler</h2>
        <p className="text-sm text-slate-500">
          Şu an tek rol var: Yönetici. Diğer roller modüller eklendiğinde tanımlanacak.
        </p>
      </header>

      {ROLES.map((r) => (
        <section key={r} className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{ROLE_LABELS[r]}</h2>
            <span className="badge bg-slate-100 text-slate-600">{countByRole[r] ?? 0} kullanıcı</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">{ROLE_DESCRIPTIONS[r]}</p>
          <ul className="mt-4 divide-y divide-slate-200 text-sm">
            {PERMISSIONS.filter((p) => ROLE_PERMISSIONS[r].includes(p.key)).map((p) => (
              <li key={p.key} className="flex justify-between py-2">
                <span>{p.label}</span>
                <span className="font-mono text-xs text-slate-400">{p.key}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
