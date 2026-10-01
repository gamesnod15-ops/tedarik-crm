"use client";

import { useActionState, useRef } from "react";
import type { FormState } from "@/lib/crud";
import { useToast } from "@/components/toast";
import { DURUMLAR, DURUM_BADGE, DURUM_LABELS, isDurum, type SiparisDurumu } from "./durum";

/** Listeden açmadan sipariş durumunu değiştirir: seçince kendiliğinden kaydeder. */
export function DurumSelect({
  id,
  durum,
  action,
  disabled,
}: {
  id: string;
  durum: SiparisDurumu;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  disabled?: boolean;
}) {
  const toast = useToast();
  const form = useRef<HTMLFormElement>(null);
  const [, formAction, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result?.error) toast.error(result.error);
    else if (result?.ok) toast.success(result.ok);
    return result;
  }, undefined);

  if (disabled) return <span className={`badge ${DURUM_BADGE[durum]}`}>{DURUM_LABELS[durum]}</span>;

  return (
    <form ref={form} action={formAction}>
      <input type="hidden" name="id" value={id} />
      <select
        name="durum"
        defaultValue={durum}
        disabled={pending}
        aria-label="Sipariş durumu"
        onChange={(e) => {
          if (isDurum(e.target.value)) form.current?.requestSubmit();
        }}
        className={`cursor-pointer rounded-full border-0 py-1 pl-3 pr-7 text-xs font-medium outline-none focus:ring-2 focus:ring-petrol-200 disabled:opacity-60 ${DURUM_BADGE[durum]}`}
      >
        {DURUMLAR.map((d) => (
          <option key={d} value={d}>
            {DURUM_LABELS[d]}
          </option>
        ))}
      </select>
    </form>
  );
}
