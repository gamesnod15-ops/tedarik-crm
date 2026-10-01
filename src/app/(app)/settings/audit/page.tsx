import Link from "next/link";
import { AutoForm } from "@/components/auto-form";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ACTION_LABELS, actionLabel } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";

const PAGE_SIZE = 25;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  await requireUser("audit:read");
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const action = sp.action && sp.action in ACTION_LABELS ? sp.action : undefined;
  const where = action ? { action } : {};

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, email: true } } },
    }),
    db.auditLog.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => `?${new URLSearchParams({ ...(action && { action }), page: String(p) })}`;

  return (
    <div className="space-y-3">
      <header>
        <h2 className="text-lg font-semibold">Denetim Kayıtları</h2>
        <p className="text-sm text-slate-500">{total} kayıt.</p>
      </header>

      <AutoForm className="toolbar">
        <div>
          <label className="label" htmlFor="action">İşlem</label>
          <select id="action" name="action" defaultValue={action ?? ""} className="input">
            <option value="">Tümü</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button className="sr-only">Filtrele</button>
      </AutoForm>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Tarih</th>
              <th className="th">İşlem</th>
              <th className="th">Kullanıcı</th>
              <th className="th">Ayrıntı</th>
              <th className="th">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 && (
              <tr><td colSpan={5} className="td py-8 text-center text-slate-400">Kayıt yok.</td></tr>
            )}
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="td whitespace-nowrap text-slate-500">{formatDateTime(l.createdAt)}</td>
                <td className="td">{actionLabel(l.action)}</td>
                <td className="td">{l.user?.name ?? <span className="text-slate-400">—</span>}</td>
                <td className="td max-w-xs truncate font-mono text-xs text-slate-500" title={l.meta ? JSON.stringify(l.meta) : ""}>
                  {l.meta ? JSON.stringify(l.meta) : ""}
                </td>
                <td className="td text-slate-500">{l.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={qs(page - 1)} className="btn-secondary">← Önceki</Link> : <span />}
          <span className="text-slate-500">Sayfa {page} / {pages}</span>
          {page < pages ? <Link href={qs(page + 1)} className="btn-secondary">Sonraki →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
