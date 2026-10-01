"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NotificationBell, type NotificationItem } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutAction } from "./sign-out";

export type NavIcon = "home" | "users" | "package" | "orders" | "wallet" | "badge" | "chart" | "cart" | "receipt";
export type NavLink = { href: string; label: string; icon: NavIcon };
export type ShellUser = { name: string; title: string; initials: string; canSettings: boolean; nav: NavLink[]; quick: NavLink[] };

const STORAGE_KEY = "ovox.sidebar.collapsed";
const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";
const BUILD = process.env.NEXT_PUBLIC_APP_BUILD ?? "";

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const icons = {
  home: <Icon><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></Icon>,
  users: <Icon><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></Icon>,
  package: <Icon><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></Icon>,
  orders: <Icon><path d="M6 3h12l2 5H4z" /><path d="M4 8v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8" /><path d="M10 12h4" /></Icon>,
  wallet: <Icon><path d="M3 7a2 2 0 0 1 2-2h13v4" /><path d="M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2" /><circle cx="16.5" cy="14.5" r="1" /></Icon>,
  badge: <Icon><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="10" r="2.5" /><path d="M7.5 17a4.5 4.5 0 0 1 9 0" /></Icon>,
  cart: <Icon><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3.5h2.7l2.3 11.2a1.6 1.6 0 0 0 1.6 1.3h8.1a1.6 1.6 0 0 0 1.6-1.2L20.5 8H6" /></Icon>,
  receipt: <Icon><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></Icon>,
  chart: <Icon><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></Icon>,
  settings: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </Icon>
  ),
  bell: <Icon><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Icon>,
  search: <Icon><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Icon>,
  panel: <Icon><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></Icon>,
};

export function AppShell({
  user,
  notifications,
  children,
}: {
  user: ShellUser;
  notifications: { unread: number; items: NotificationItem[] };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {}
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  }

  const links = user.nav.map((l) => ({
    ...l,
    icon: icons[l.icon],
    active: l.href === "/" ? pathname === "/" : pathname.startsWith(l.href),
  }));

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-petrol-700";

  return (
    <div className="flex min-h-screen">
      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col print:hidden border-r border-slate-200 bg-white text-slate-600 transition-[width] duration-200 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-slate-200 px-4">
          <Link href="/" className={`flex w-full items-center ${collapsed ? "justify-center" : ""}`} aria-label="Ovox CRM">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {collapsed ? (
              <>
                <img src="/ovox-crm-collapsed.svg" alt="Ovox CRM" className="h-7 w-auto dark:hidden" />
                <img src="/ovox-crm-collapsed-dark.svg" alt="Ovox CRM" className="hidden h-7 w-auto dark:block" />
              </>
            ) : (
              <>
                <img src="/ovox-crm-logo.svg" alt="Ovox CRM" className="h-4 w-auto dark:hidden" />
                <img src="/ovox-crm-logo-dark.svg" alt="Ovox CRM" className="hidden h-4 w-auto dark:block" />
              </>
            )}
          </Link>
        </div>
          <nav aria-label="Ana menü" className="flex-1 space-y-1 overflow-y-auto p-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                title={collapsed ? l.label : undefined}
                aria-label={l.label}
                aria-current={l.active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  l.active ? "bg-petrol-50 text-petrol-700" : "hover:bg-slate-100 hover:text-petrol-700"
                } ${collapsed ? "justify-center px-0" : ""}`}
              >
                {l.icon}
                {!collapsed && <span className="truncate">{l.label}</span>}
              </Link>
            ))}

          {user.quick.length > 0 && (
            <div className="pt-3" aria-label="Hızlı erişim" role="group">
              {collapsed ? (
                <div className="mx-2 mb-2 border-t border-slate-200" />
              ) : (
                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Hızlı erişim</p>
              )}
              <div className="space-y-0.5">
                {user.quick.map((q) => (
                  <Link
                    key={q.href}
                    href={q.href}
                    title={collapsed ? q.label : undefined}
                    aria-label={q.label}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 hover:text-petrol-700 ${
                      collapsed ? "justify-center px-0" : ""
                    }`}
                  >
                    <span className="relative shrink-0">
                      {icons[q.icon]}
                      <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-petrol-600 text-[#fff] ring-2 ring-white group-hover:bg-petrol-500">
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </span>
                    </span>
                    {!collapsed && <span className="truncate">{q.label}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
          </nav>

        <footer className="shrink-0 border-t border-slate-200 px-3 py-3 text-center">
          {collapsed ? (
            <p
              className="text-[10px] leading-tight text-slate-400"
              title={`Ovox Dijital tarafından geliştirildi. © ${new Date().getFullYear()} · Versiyon ${VERSION}`}
            >
              v{VERSION}
            </p>
          ) : (
            <div className="space-y-0.5 text-[11px] leading-snug text-slate-500">
              <p>
                <span className="font-medium text-slate-600">Ovox Dijital</span> tarafından geliştirildi.
              </p>
              <p>© {new Date().getFullYear()} Tüm hakları saklıdır.</p>
              <p className="pt-1 text-slate-400">
                Versiyon {VERSION}
                {BUILD && <span className="text-slate-300"> · {BUILD}</span>}
              </p>
            </div>
          )}
        </footer>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-20 flex h-14 print:hidden items-center gap-3 border-b border-slate-200 bg-white px-4">
        <button
          type="button"
          onClick={toggle}
          className={iconBtn}
          aria-label={collapsed ? "Kenar çubuğunu genişlet" : "Kenar çubuğunu daralt"}
          aria-expanded={!collapsed}
          title={collapsed ? "Genişlet" : "Daralt"}
        >
          {icons.panel}
        </button>

        <form role="search" onSubmit={(e) => e.preventDefault()} className="relative w-full max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icons.search}</span>
          <input type="search" name="q" placeholder="Ara…" aria-label="Ara" className="input pl-10" />
        </form>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle className={iconBtn} />
          {user.canSettings && (
            <Link href="/settings" className={iconBtn} aria-label="Ayarlar" title="Ayarlar">
              {icons.settings}
            </Link>
          )}
          {user.nav.length > 0 && <NotificationBell unread={notifications.unread} items={notifications.items} />}

          <div ref={menuRef} className="relative ml-2">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Hesap menüsü"
              className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-slate-100"
            >
              {/* Profil fotoğrafı alanı eklenene kadar baş harfli avatar gösterilir. */}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-petrol-100 text-sm font-semibold text-petrol-700">
                {user.initials}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight">{user.name}</span>
                <span className="block text-xs text-slate-500">{user.title}</span>
              </span>
            </button>

            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                <Link
                  href="/account"
                  role="menuitem"
                  className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Profil
                </Link>
                <form action={signOutAction}>
                  <button
                    role="menuitem"
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Çıkış Yap
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="min-w-0 flex-1 p-5 print:p-0">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
      </div>
    </div>
  );
}
