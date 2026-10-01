"use client";

import { useEffect, useRef, useState } from "react";

/** Liste sayfalarındaki arama kutusu: büyüteç ikonu, temizleme düğmesi, diğer filtre kontrolleriyle aynı yükseklik. AutoForm içinde kullanılır. */
export function SearchInput({
  name = "q",
  defaultValue = "",
  placeholder = "Ara…",
  ariaLabel,
  className = "w-64",
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);

  // "Temizle" bağlantısı ya da adres değişince kutu da güncellenir.
  useEffect(() => setValue(defaultValue), [defaultValue]);

  function clear() {
    const el = ref.current;
    if (!el) return;
    // React'in izlediği değeri atlayarak boşaltıp olayı yayınlar; böylece filtre formu da haberdar olur.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
  }

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        ref={ref}
        name={name}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        autoComplete="off"
        className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-8 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-petrol-500 focus:ring-2 focus:ring-petrol-200"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Aramayı temizle"
          className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}
