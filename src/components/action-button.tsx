"use client";

import { useActionState, useRef, useState } from "react";
import type { FormState } from "@/lib/crud";
import { ConfirmDialog } from "./confirm-dialog";
import { useToast } from "./toast";

/** Tek tıkla bir sunucu eylemini çalıştıran düğme (sonuç toast ile gösterilir). */
export function ActionButton({
  action,
  label,
  pendingLabel = "Çalışıyor…",
  confirmText,
  confirmTitle = "Onay",
  variant = "secondary",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  label: string;
  pendingLabel?: string;
  /** Verilirse eylem, onay penceresinde onaylandıktan sonra çalışır. */
  confirmText?: string;
  confirmTitle?: string;
  variant?: "primary" | "secondary" | "link";
}) {
  const toast = useToast();
  const form = useRef<HTMLFormElement>(null);
  const [onay, setOnay] = useState(false);
  const [, formAction, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result?.error) toast.error(result.error);
    else if (result?.ok) toast.success(result.ok);
    return result;
  }, undefined);

  const cls = variant === "primary" ? "btn-primary" : variant === "secondary" ? "btn-secondary" : "text-sm font-medium text-petrol-700 hover:underline";

  return (
    <form ref={form} action={formAction}>
      <button type={confirmText ? "button" : "submit"} disabled={pending} onClick={confirmText ? () => setOnay(true) : undefined} className={cls}>
        {pending ? pendingLabel : label}
      </button>
      {confirmText && (
        <ConfirmDialog
          open={onay}
          title={confirmTitle}
          message={confirmText}
          confirmLabel={label}
          tone="primary"
          onCancel={() => setOnay(false)}
          onConfirm={() => {
            setOnay(false);
            form.current?.requestSubmit();
          }}
        />
      )}
    </form>
  );
}
