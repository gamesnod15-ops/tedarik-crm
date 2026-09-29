import { redirect } from "next/navigation";
import { can, getCurrentUser } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/permissions";
import { AppShell } from "./app-shell";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase("tr"))
    .join("");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell
      user={{
        name: user.name,
        title: ROLE_LABELS[user.role],
        initials: initials(user.name),
        canSettings: can(user, "admin:access") && !user.mustChangePassword,
      }}
    >
      {children}
    </AppShell>
  );
}
