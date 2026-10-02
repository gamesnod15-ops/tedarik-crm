"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormState } from "@/lib/crud";
import { EntityForm, type Field, type Values } from "./entity-form";
import { Modal } from "./modal";
import { PlusIcon } from "@/components/plus-icon";

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
  autoOpen = false,
}: {
  label: string;
  title: string;
  fields: Field[];
  initial?: Values;
  hidden?: Values;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  variant?: "primary" | "secondary" | "link";
  submitLabel?: string;
  /** true: sayfa açılır açılmaz pencere açılır (hızlı erişim bağlantıları: ?yeni=1). */
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const close = useCallback(() => setOpen(false), []);

  // Pencere kendiliğinden açıldıysa adres çubuğundaki ?yeni=1 temizlenir (yenilemede tekrar açılmasın).
  useEffect(() => {
    if (!autoOpen) return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("yeni")) {
      url.searchParams.delete("yeni");
      window.history.replaceState(null, "", url);
    }
  }, [autoOpen]);

  const cls =
    variant === "primary"
      ? "btn-primary"
      : variant === "secondary"
        ? "btn-secondary"
        : "text-sm font-medium text-petrol-700 hover:underline";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cls}>
        {variant !== "link" && label.startsWith("Yeni") && <PlusIcon />}
        {label}
      </button>
      <Modal open={open} onClose={close} title={title}>
        <EntityForm fields={fields} initial={initial} hidden={hidden} action={action} submitLabel={submitLabel} onDone={close} />
      </Modal>
    </>
  );
}
