"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/** Adres çubuğundaki bir parametreye (?tip=...) göre sekme değiştirir; diğer filtreler sıfırlanır. */
export function QueryTabs({
  param,
  items,
}: {
  param: string;
  items: { value: string; label: string }[];
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get(param) ?? items[0].value;

  return (
    <nav className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1" aria-label="Sekmeler">
      {items.map((item) => {
        const active = item.value === current;
        return (
          <Link
            key={item.value}
            href={`${pathname}?${param}=${item.value}`}
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
