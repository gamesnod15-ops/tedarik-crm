import { can, requireUser } from "@/lib/session";
import { SettingsTabs, type TabItem } from "./settings-tabs";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("admin:access");

  const tabs: TabItem[] = [{ href: "/settings", label: "Genel Bakış" }];
  if (can(user, "users:read")) tabs.push({ href: "/settings/users", label: "Kullanıcılar" });
  if (can(user, "roles:read")) tabs.push({ href: "/settings/roles", label: "Roller ve İzinler" });
  if (can(user, "audit:read")) tabs.push({ href: "/settings/audit", label: "Denetim Kayıtları" });

  return (
    <div className="space-y-5">
      <header className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Ayarlar</h1>
          <p className="mt-0.5 text-sm text-slate-500">Kullanıcıları, rolleri ve sistem kayıtlarını buradan yönetin.</p>
        </div>
        <SettingsTabs items={tabs} />
      </header>
      <div>{children}</div>
    </div>
  );
}
