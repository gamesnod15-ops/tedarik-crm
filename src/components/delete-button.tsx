"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/crud";
import { useToast } from "./toast";

export function DeleteButton({
  action,
  id,
  confirmText = "Bu kaydı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
  label = "Sil",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  id: string;
  confirmText?: string;
  label?: string;
}) {
  const toast = useToast();
  // Toast eylem dönünce hemen gösterilir: satır silinince bu bileşen kaybolacağı için efekte güvenilmez.
  const [, formAction, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result?.error) toast.error(result.error);
    else if (result?.ok) toast.success(result.ok);
    return result;
  }, undefined);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button disabled={pending} className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50">
        {pending ? "Siliniyor…" : label}
      </button>
    </form>
  );
}
