"use client";

import { useCallback, useState } from "react";
import type { FormState } from "@/lib/crud";
import { EntityForm, type Field, type Values } from "./entity-form";
import { Modal } from "./modal";

/** Bir butona basınca açılan ekleme/düzenleme penceresi. Kayıt başarılı olunca kapanır, sayfa verisi yenilenir. */
export function RecordDialog({
  label,
  title,
  fields,
  initial,
  hidden,
  action,
  variant = "primary",
  submitLabel = "Kaydet",
}: {
  label: string;
  title: string;
  fields: Field[];
  initial?: Values;
  hidden?: Values;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  variant?: "primary" | "secondary" | "link";
  submitLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const cls =
    variant === "primary"
      ? "btn-primary"
      : variant === "secondary"
        ? "btn-secondary"
        : "text-sm font-medium text-petrol-700 hover:underline";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cls}>
        {label}
      </button>
      <Modal open={open} onClose={close} title={title}>
        <EntityForm fields={fields} initial={initial} hidden={hidden} action={action} submitLabel={submitLabel} onDone={close} />
      </Modal>
    </>
  );
}
