"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/crud";
import { useToast } from "./toast";

/** Tek tıkla bir sunucu eylemini çalıştıran düğme (sonuç toast ile gösterilir). */
export function ActionButton({
  action,
  label,
  pendingLabel = "Çalışıyor…",
  confirmText,
  variant = "secondary",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  label: string;
  pendingLabel?: string;
  confirmText?: string;
  variant?: "primary" | "secondary" | "link";
}) {
  const toast = useToast();
  const [, formAction, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result?.error) toast.error(result.error);
    else if (result?.ok) toast.success(result.ok);
    return result;
  }, undefined);

  const cls = variant === "primary" ? "btn-primary" : variant === "secondary" ? "btn-secondary" : "text-sm font-medium text-petrol-700 hover:underline";

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmText && !confirm(confirmText)) e.preventDefault();
      }}
    >
      <button disabled={pending} className={cls}>
        {pending ? pendingLabel : label}
      </button>
    </form>
  );
}
