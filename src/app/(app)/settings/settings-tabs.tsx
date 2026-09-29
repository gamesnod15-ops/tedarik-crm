"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type TabItem = { href: string; label: string };

export function SettingsTabs({ items }: { items: TabItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1" aria-label="Ayarlar sekmeleri">
      {items.map((item) => {
        const active = item.href === "/settings" ? pathname === "/settings" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-white text-petrol-700 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
