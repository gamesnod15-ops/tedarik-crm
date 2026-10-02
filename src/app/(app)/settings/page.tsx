import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { actionLabel } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";

function Stat({ label, value, tone = "text-slate-900" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export default async function AdminHome() {
  const user = await requireUser("admin:access");
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [total, active, locked, failed24h, recent] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    db.user.count({ where: { lockedUntil: { gt: now } } }),
    db.auditLog.count({ where: { action: "auth.login_failed", createdAt: { gte: since } } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-lg font-semibold">Genel Bakış</h2>
        <p className="text-sm text-slate-500">Hoş geldiniz, {user.name}.</p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Toplam kullanıcı" value={total} />
        <Stat label="Aktif kullanıcı" value={active} tone="text-emerald-600" />
        <Stat label="Kilitli hesap" value={locked} tone={locked ? "text-amber-600" : undefined} />
        <Stat label="Son 24s hatalı giriş" value={failed24h} tone={failed24h ? "text-red-600" : undefined} />
      </section>

      <section>
        <div className="card overflow-hidden">
          <h2 className="border-b border-slate-300 px-5 py-3 text-sm font-semibold">Son etkinlikler</h2>
          <table className="w-full">
            <tbody className="divide-y divide-slate-200">
              {recent.length === 0 && (
                <tr><td className="td text-slate-400">Henüz kayıt yok.</td></tr>
              )}
              {recent.map((log) => (
                <tr key={log.id}>
                  <td className="td">{actionLabel(log.action)}</td>
                  <td className="td text-slate-500">{log.user?.name ?? "—"}</td>
                  <td className="td text-right text-slate-500">{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
