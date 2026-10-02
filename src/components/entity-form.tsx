"use client";

import { useActionState, useEffect, useState } from "react";
import type { FormState } from "@/lib/crud";
import { useToast } from "./toast";
import { PHONE_HINT, PHONE_PATTERN, formatPhone } from "@/lib/phone";

export type Option = { value: string; label: string; group?: string };

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "time" | "email" | "tel" | "select" | "textarea" | "checkbox";
  required?: boolean;
  placeholder?: string;
  options?: Option[];
  /** Seçenekleri, başka bir alanın değerine göre süzer (option.group === o alanın değeri). */
  groupBy?: string;
  /** Kaynak alan değişince bu alanın değerini map'e göre otomatik ayarlar. */
  autoFrom?: { field: string; map: Record<string, string> };
  /** Yalnızca belirtilen alan, listedeki değerlerden birine sahipse gösterilir (ve gönderilir). */
  showIf?: { field: string; in: string[] };
  step?: string;
  hint?: string;
  /** true: satırın yarısını kaplar (iki sütun). */
  half?: boolean;
};

export type Values = Record<string, string>;

/** Alan türüne göre yazılan değeri düzenler: telefon maskelenir, e-posta boşluksuz ve küçük harf olur. */
function transform(type: Field["type"], value: string) {
  if (type === "tel") return formatPhone(value);
  if (type === "email") return value.replace(/\s/g, "").toLowerCase();
  return value;
}

export function EntityForm({
  fields,
  initial,
  hidden,
  action,
  submitLabel,
  onDone,
}: {
  fields: Field[];
  initial?: Values;
  hidden?: Values;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  onDone?: () => void;
}) {
  const toast = useToast();
  const [state, formAction, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result?.error) toast.error(result.error);
    else if (result?.ok) toast.success(result.ok);
    return result;
  }, undefined);
  const [values, setValues] = useState<Values>(() => {
    const v: Values = {};
    for (const f of fields) v[f.name] = transform(f.type, initial?.[f.name] ?? "");
    return v;
  });

  useEffect(() => {
    if (state?.ok) onDone?.();
  }, [state, onDone]);

  function set(name: string, value: string) {
    setValues((prev) => {
      const type = fields.find((f) => f.name === name)?.type;
      const next = { ...prev, [name]: transform(type, value) };
      for (const f of fields) {
        if (f.autoFrom?.field === name && f.autoFrom.map[value] !== undefined) next[f.name] = f.autoFrom.map[value];
        if (f.groupBy === name) {
          const stillValid = f.options?.some((o) => o.value === next[f.name] && o.group === value);
          if (!stillValid) next[f.name] = "";
        }
      }
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          if (f.showIf && !f.showIf.in.includes(values[f.showIf.field] ?? "")) return null;
          const id = `f-${f.name}`;
          const span = f.half ? "" : "sm:col-span-2";

          if (f.type === "checkbox") {
            return (
              <label key={f.name} className={`flex items-center gap-2 text-sm text-slate-700 ${span}`}>
                <input
                  type="checkbox"
                  name={f.name}
                  checked={values[f.name] === "on"}
                  onChange={(e) => set(f.name, e.target.checked ? "on" : "")}
                  className="h-4 w-4 accent-brand-600"
                />
                {f.label}
              </label>
            );
          }

          const options = f.groupBy ? f.options?.filter((o) => o.group === values[f.groupBy!]) : f.options;

          return (
            <div key={f.name} className={span}>
              <label className="label" htmlFor={id}>
                {f.label}
                {f.required && <span className="text-red-600"> *</span>}
              </label>
              {f.type === "select" ? (
                <select
                  id={id}
                  name={f.name}
                  value={values[f.name]}
                  required={f.required}
                  onChange={(e) => set(f.name, e.target.value)}
                  className="input"
                >
                  <option value="">{f.placeholder ?? "Seçin…"}</option>
                  {options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  id={id}
                  name={f.name}
                  value={values[f.name]}
                  required={f.required}
                  placeholder={f.placeholder}
                  rows={3}
                  onChange={(e) => set(f.name, e.target.value)}
                  className="input"
                />
              ) : (
                <input
                  id={id}
                  name={f.name}
                  type={f.type ?? "text"}
                  value={values[f.name]}
                  required={f.required}
                  placeholder={f.placeholder}
                  step={f.type === "number" ? (f.step ?? "0.01") : undefined}
                  inputMode={f.type === "tel" ? "tel" : f.type === "email" ? "email" : undefined}
                  autoComplete={f.type === "tel" ? "tel" : f.type === "email" ? "email" : undefined}
                  pattern={f.type === "tel" ? PHONE_PATTERN : undefined}
                  title={f.type === "tel" ? PHONE_HINT : f.type === "email" ? "ad@firma.com biçiminde girin" : undefined}
                  autoCapitalize={f.type === "email" ? "off" : undefined}
                  spellCheck={f.type === "email" ? false : undefined}
                  onChange={(e) => set(f.name, e.target.value)}
                  className="input"
                />
              )}
              {f.hint && <p className="mt-1 text-xs text-slate-500">{f.hint}</p>}
            </div>
          );
        })}
      </div>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="btn-primary">
        {pending ? "Kaydediliyor…" : submitLabel}
      </button>
    </form>
  );
}
