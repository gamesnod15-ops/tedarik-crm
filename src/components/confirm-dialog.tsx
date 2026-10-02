"use client";

import { useEffect, useRef } from "react";

/**
 * Tarayıcının confirm() kutusu yerine kullanılan onay penceresi.
 * Dışarı tıklayınca kapanmaz; Vazgeç, × ya da Esc ile kapanır. Varsayılan odak "Vazgeç"tedir (yanlışlıkla Enter ile onaylanmasın).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Onayla",
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const tehlike = tone === "danger";

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      role="alertdialog"
      aria-labelledby="onay-baslik"
      aria-describedby="onay-mesaj"
      className="m-auto w-full max-w-md rounded-xl border border-slate-300 bg-white p-0 shadow-xl backdrop:bg-black/50"
    >
      {open && (
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tehlike ? "bg-red-100 text-red-600" : "bg-brand-100 text-brand-700"}`}
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {tehlike ? (
                  <>
                    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                    <path d="M12 9v4M12 17h.01" />
                  </>
                ) : (
                  <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v4M12 16h.01" />
                  </>
                )}
              </svg>
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 id="onay-baslik" className="text-base font-semibold text-slate-900">{title}</h2>
              <p id="onay-mesaj" className="mt-1.5 text-sm leading-relaxed text-slate-600">{message}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" autoFocus onClick={onCancel} className="btn-secondary">
              Vazgeç
            </button>
            <button type="button" onClick={onConfirm} className={tehlike ? "btn-danger" : "btn-primary"}>
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
