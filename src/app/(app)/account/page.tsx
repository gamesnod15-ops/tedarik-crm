import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { actionLabel } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";
import { PERMISSIONS, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";
import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toLocaleUpperCase("tr")).join("");
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export default async function AccountPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const [record, activity] = await Promise.all([
    db.user.findUnique({ where: { id: current.id } }),
    db.auditLog.findMany({ where: { userId: current.id }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  if (!record) redirect("/login");

  const permissions = PERMISSIONS.filter((p) => current.permissions.includes(p.key));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Hesabım</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Profilinizi, güvenlik ayarlarınızı ve son etkinliklerinizi buradan yönetin.
        </p>
      </header>

      {current.mustChangePassword && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Devam etmeden önce geçici şifrenizi değiştirmeniz gerekiyor.
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <aside className="card overflow-hidden lg:sticky lg:top-20">
          <div className="h-20 bg-gradient-to-r from-brand-800 to-brand-500" />
          <div className="px-6 pb-6">
            <div className="-mt-10 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-brand-100 text-2xl font-semibold text-brand-700">
              {initials(record.name)}
            </div>
            <h2 className="mt-3 text-lg font-semibold text-slate-900">{record.name}</h2>
            <p className="truncate text-sm text-slate-500">{record.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="badge bg-slate-100 text-slate-700">{ROLE_LABELS[record.role]}</span>
              <span className={`badge ${record.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {record.isActive ? "Aktif" : "Pasif"}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-500">{ROLE_DESCRIPTIONS[record.role]}</p>

            <dl className="mt-4 divide-y divide-slate-200 border-t border-slate-200">
              <Fact label="Son giriş" value={formatDateTime(record.lastLoginAt)} />
              <Fact label="Üyelik tarihi" value={formatDateTime(record.createdAt)} />
              <Fact label="Yetki sayısı" value={permissions.length} />
            </dl>
          </div>
        </aside>

        <div className="space-y-5 lg:col-span-2">
          <Section title="Profil bilgileri" description="Ad ve e-posta adresiniz. E-posta, giriş yaparken kullandığınız adrestir.">
            <ProfileForm name={record.name} email={record.email} />
          </Section>

          <Section title="Şifre" description="Güvenliğiniz için düzenli olarak değiştirin.">
            <div className="max-w-md">
              <PasswordForm />
            </div>
          </Section>

          <Section title="Yetkilerim" description="Rolünüzle gelen izinler.">
            <ul className="flex flex-wrap gap-2">
              {permissions.map((p) => (
                <li key={p.key} className="badge bg-slate-100 text-slate-700">{p.label}</li>
              ))}
            </ul>
          </Section>

          <Section title="Son etkinliklerim" description="Hesabınızla yapılan son işlemler.">
            {activity.length === 0 ? (
              <p className="text-sm text-slate-400">Henüz etkinlik yok.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-slate-300 pl-5">
                {activity.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500 ring-1 ring-brand-200" />
                    <p className="text-sm font-medium text-slate-900">{actionLabel(a.action)}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(a.createdAt)}
                      {a.ip ? ` · ${a.ip}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
