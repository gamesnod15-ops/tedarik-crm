"use client";

import { useCallback, useState } from "react";
import { Modal } from "@/components/modal";
import type { FormState } from "@/lib/crud";
import { SiparisForm } from "./siparis-form";

type Urun = { id: string; ad: string; birim: string; birimFiyat: string; kdvOrani: number };

/** Müşteri sayfasından, cari sabitken sipariş oluşturan pencere. */
export function YeniSiparisDialog({
  cari,
  urunler,
  bugun,
  action,
}: {
  cari: { id: string; unvan: string };
  urunler: Urun[];
  bugun: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary">
        Yeni sipariş
      </button>
      <Modal open={open} onClose={close} title={`Yeni sipariş · ${cari.unvan}`} size="xl">
        <SiparisForm
          tip="MUSTERI"
          cariler={[cari]}
          urunler={urunler}
          initial={{ cariId: cari.id, tarih: bugun, aciklama: "", durum: "BEKLIYOR", kalemler: [] }}
          action={action}
          inline
          onSaved={close}
          onCancel={close}
        />
      </Modal>
    </>
  );
}
