import { Suspense } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { FlashToast, ToastProvider } from "@/components/toast";
import { can, getCurrentUser } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/permissions";
import { AppShell, type NavLink } from "./app-shell";

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

  const nav: NavLink[] = [{ href: "/", label: "Özet", icon: "home" }];
  if (can(user, "cariler:read")) nav.push({ href: "/cariler", label: "Cariler", icon: "users" });
  if (can(user, "siparisler:read")) nav.push({ href: "/urunler", label: "Ürünler", icon: "package" });
  if (can(user, "siparisler:read")) nav.push({ href: "/siparisler", label: "Siparişler", icon: "orders" });
  if (can(user, "finans:read")) nav.push({ href: "/finans", label: "Finans", icon: "wallet" });
  if (can(user, "personel:read")) nav.push({ href: "/personel", label: "Personel", icon: "badge" });
  if (can(user, "raporlar:read")) nav.push({ href: "/raporlar", label: "Raporlar", icon: "chart" });

  const [unread, rows] = user.mustChangePassword
    ? [0, []]
    : await Promise.all([
        db.notification.count({ where: { userId: user.id, readAt: null } }),
        db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 15 }),
      ]);

  return (
    <ToastProvider>
      <Suspense>
        <FlashToast />
      </Suspense>
    <AppShell
      user={{
        name: user.name,
        title: ROLE_LABELS[user.role],
        initials: initials(user.name),
        canSettings: can(user, "admin:access") && !user.mustChangePassword,
        nav: user.mustChangePassword ? [] : nav,
      }}
      notifications={{
        unread,
        items: rows.map((n) => ({
          id: n.id,
          tur: n.tur,
          baslik: n.baslik,
          mesaj: n.mesaj,
          href: n.href,
          read: !!n.readAt,
          zaman: formatDateTime(n.createdAt),
        })),
      }}
    >
      {children}
    </AppShell>
    </ToastProvider>
  );
}
