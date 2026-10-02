"use client";

import { useActionState, useRef, useState } from "react";
import type { FormState } from "@/lib/crud";
import { ConfirmDialog } from "./confirm-dialog";
import { useToast } from "./toast";

export function DeleteButton({
  action,
  id,
  confirmText = "Bu kaydı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
  confirmTitle = "Kaydı sil",
  label = "Sil",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  id: string;
  confirmText?: string;
  confirmTitle?: string;
  label?: string;
}) {
  const toast = useToast();
  const form = useRef<HTMLFormElement>(null);
  const [onay, setOnay] = useState(false);
  // Toast eylem dönünce hemen gösterilir: satır silinince bu bileşen kaybolacağı için efekte güvenilmez.
  const [, formAction, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result?.error) toast.error(result.error);
    else if (result?.ok) toast.success(result.ok);
    return result;
  }, undefined);

  return (
    <form ref={form} action={formAction}>
      <input type="hidden" name="id" value={id} />
      <button type="button" disabled={pending} onClick={() => setOnay(true)} className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50">
        {pending ? "Siliniyor…" : label}
      </button>
      <ConfirmDialog
        open={onay}
        title={confirmTitle}
        message={confirmText}
        confirmLabel={label}
        onCancel={() => setOnay(false)}
        onConfirm={() => {
          setOnay(false);
          form.current?.requestSubmit();
        }}
      />
    </form>
  );
}
