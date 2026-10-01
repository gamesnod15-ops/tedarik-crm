"use client";

export function PrintButton({ label = "PDF / Yazdır" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-secondary print:hidden">
      {label}
    </button>
  );
}
