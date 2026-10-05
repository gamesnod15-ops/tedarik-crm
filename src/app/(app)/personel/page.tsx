import Link from "next/link";
import { SearchInput } from "@/components/search-input";
import { AutoForm } from "@/components/auto-form";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/session";
import { formatDate, formatMoney, parseDateInput, toDateInput } from "@/lib/format";
import { PAGE_SIZE, pageOf } from "@/lib/crud";
import { Pager } from "@/components/pager";
import { QueryTabs } from "@/components/query-tabs";
import { RecordDialog } from "@/components/record-dialog";
import { DeleteButton } from "@/components/delete-button";
import type { Field } from "@/components/entity-form";
import { deleteHareketAction, deletePersonelAction, saveHareketAction, savePersonelAction } from "./actions";
import { SegmentFilter } from "@/components/segment-filter";
import { MobileTables } from "@/components/mobile-tables";

type SP = { tip?: string; q?: string; durum?: string; personel?: string; tur?: string; from?: string; to?: string; page?: string };

const IZIN_LABELS = { YILLIK: "Yıllık izin", RAPORLU: "Raporlu", UCRETSIZ: "Ücretsiz izin", MAZERET: "Mazeret izni", DIGER: "Diğer" } as const;
const TUR_LABELS = { GIRIS_CIKIS: "Giriş / Çıkış", IZIN: "İzin" } as const;

// Personel kartı: ad soyad ve (isteğe bağlı) maaş. Maaş yalnızca bilgi amaçlıdır, hiçbir hesaplamaya katılmaz.
const personelFields: Field[] = [
  { name: "adSoyad", label: "Ad soyad", required: true, placeholder: "Adı Soyadı" },
  { name: "maas", label: "Maaş (TL)", type: "number", placeholder: "0,00", hint: "İsteğe bağlı. Yalnızca listede bilgi olarak görünür, hesaplamalara katılmaz." },
];

function hareketFields(personelOptions: { value: string; label: string }[]): Field[] {
  return [
    { name: "personelId", label: "Personel", type: "select", required: true, options: personelOptions, placeholder: "Personel seçin…" },
    {
      name: "islemTuru",
      label: "İşlem türü",
      type: "select",
      required: true,
      half: true,
      options: Object.entries(TUR_LABELS).map(([value, label]) => ({ value, label })),
    },
    { name: "tarih", label: "Tarih", type: "date", required: true, half: true },
    { name: "girisSaati", label: "Giriş saati", type: "time", half: true, required: true, showIf: { field: "islemTuru", in: ["GIRIS_CIKIS"] } },
    { name: "cikisSaati", label: "Çıkış saati", type: "time", half: true, showIf: { field: "islemTuru", in: ["GIRIS_CIKIS"] } },
    {
      name: "izinTuru",
      label: "İzin türü",
      type: "select",
      required: true,
      options: Object.entries(IZIN_LABELS).map(([value, label]) => ({ value, label })),
      showIf: { field: "islemTuru", in: ["IZIN"] },
    },
    { name: "izinBaslangic", label: "İzin başlangıç tarihi", type: "date", half: true, required: true, showIf: { field: "islemTuru", in: ["IZIN"] } },
    { name: "izinBitis", label: "İzin bitiş tarihi", type: "date", half: true, required: true, showIf: { field: "islemTuru", in: ["IZIN"] } },
    { name: "aciklama", label: "Açıklama", type: "textarea", placeholder: "İsteğe bağlı not" },
  ];
}

async function PersonelKartlari({ sp, page, canWrite }: { sp: SP; page: number; canWrite: boolean }) {
  const where: Prisma.PersonelWhereInput = {
    ...(sp.q && { adSoyad: { contains: sp.q, mode: "insensitive" } }),
  };
  const [rows, total] = await Promise.all([
    db.personel.findMany({ where, orderBy: { adSoyad: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.personel.count({ where }),
  ]);

  return (
    <>
      <AutoForm className="toolbar">
        <input type="hidden" name="tip" value="KART" />
        <SearchInput defaultValue={sp.q ?? ""} placeholder="Ad soyad" className="w-72" />
        <button className="sr-only">Filtrele</button>
        {sp.q && <Link href="?tip=KART" className="text-sm text-slate-500 hover:underline">Temizle</Link>}
      </AutoForm>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-300 bg-slate-50">
            <tr>
              <th className="th">Ad soyad</th>
              <th className="th text-right">Maaş</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 && <tr><td colSpan={3} className="td py-8 text-center text-slate-400">Kayıt bulunamadı.</td></tr>}
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="td font-medium text-slate-900">{p.adSoyad}</td>
                <td className="td text-right tabular-nums">{p.maas ? formatMoney(p.maas) : "—"}</td>
                <td className="td">
                  {canWrite && (
                    <div className="flex items-center justify-end gap-4">
                      <RecordDialog
                        variant="link"
                        label="Düzenle"
                        title="Personel düzenle"
                        fields={personelFields}
                        hidden={{ id: p.id }}
                        initial={{ adSoyad: p.adSoyad, maas: p.maas?.toString() ?? "" }}
                        action={savePersonelAction}
                      />
                      <DeleteButton action={deletePersonelAction} id={p.id} confirmText={`"${p.adSoyad}" silinsin mi? Tüm iş hareketleri de silinir.`} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <MobileTables />
      </div>
      <Pager page={page} total={total} pageSize={PAGE_SIZE} params={{ tip: "KART", q: sp.q }} />
    </>
  );
}

async function IsHareketleri({ sp, page, canWrite, baslik }: { sp: SP; page: number; canWrite: boolean; baslik: React.ReactNode }) {
  const from = parseDateInput(sp.from);
  const to = parseDateInput(sp.to);
  const where: Prisma.PersonelHareketWhereInput = {
    ...(sp.personel && { personelId: sp.personel }),
    ...((sp.tur === "GIRIS_CIKIS" || sp.tur === "IZIN") && { islemTuru: sp.tur }),
    ...((from || to) && { tarih: { ...(from && { gte: from }), ...(to && { lte: to }) } }),
  };
  const [rows, total, personeller] = await Promise.all([
    db.personelHareket.findMany({
      where,
      orderBy: [{ tarih: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { personel: { select: { adSoyad: true } } },
    }),
    db.personelHareket.count({ where }),
    db.personel.findMany({ orderBy: { adSoyad: "asc" }, select: { id: true, adSoyad: true, durum: true } }),
  ]);
  const options = personeller.map((p) => ({ value: p.id, label: `${p.adSoyad}${p.durum === "PASIF" ? " – pasif" : ""}` }));
  const fields = hareketFields(options);
  const hasFilter = !!(sp.personel || sp.tur || sp.from || sp.to);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {baslik}
        {canWrite && (
          <RecordDialog
            label="Yeni hareket"
            title="Yeni iş hareketi"
            fields={fields}
            initial={{ islemTuru: "GIRIS_CIKIS", tarih: toDateInput(new Date()) }}
            action={saveHareketAction}
          />
        )}
      </header>

      <AutoForm className="toolbar">
        <input type="hidden" name="tip" value="HAREKET" />
        <div className="min-w-48">
          <label className="label" htmlFor="personel">Personel</label>
          <select id="personel" name="personel" defaultValue={sp.personel ?? ""} className="input">
            <option value="">Tümü</option>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <SegmentFilter name="tur" label="Tür" value={sp.tur} options={[{ value: "GIRIS_CIKIS", label: "Giriş / Çıkış" }, { value: "IZIN", label: "İzin" }]} />
        <div>
          <label className="label" htmlFor="from">Tarih</label>
          <input id="from" name="from" type="date" defaultValue={sp.from} aria-label="Başlangıç tarihi" className="input" />
          <span aria-hidden="true" className="text-slate-400">–</span>
          <input id="to" name="to" type="date" defaultValue={sp.to} aria-label="Bitiş tarihi" className="input" />
        </div>
        <button className="sr-only">Filtrele</button>
        {hasFilter && <Link href="?tip=HAREKET" className="text-sm text-slate-500 hover:underline">Temizle</Link>}
      </AutoForm>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-300 bg-slate-50">
            <tr>
              <th className="th">Tarih</th>
              <th className="th">Personel</th>
              <th className="th">Tür</th>
              <th className="th">Ayrıntı</th>
              <th className="th">Açıklama</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 && <tr><td colSpan={6} className="td py-8 text-center text-slate-400">Kayıt bulunamadı.</td></tr>}
            {rows.map((h) => (
              <tr key={h.id}>
                <td className="td whitespace-nowrap">{formatDate(h.tarih)}</td>
                <td className="td font-medium text-slate-900">{h.personel.adSoyad}</td>
                <td className="td">
                  <span className={`badge ${h.islemTuru === "IZIN" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"}`}>{TUR_LABELS[h.islemTuru]}</span>
                </td>
                <td className="td">
                  {h.islemTuru === "GIRIS_CIKIS"
                    ? `${h.girisSaati ?? "—"} → ${h.cikisSaati ?? "—"}`
                    : `${h.izinTuru ? IZIN_LABELS[h.izinTuru] : "İzin"}: ${formatDate(h.izinBaslangic)} – ${formatDate(h.izinBitis)}`}
                </td>
                <td className="td max-w-xs truncate text-slate-500" title={h.aciklama ?? ""}>{h.aciklama ?? "—"}</td>
                <td className="td">
                  {canWrite && (
                    <div className="flex items-center justify-end gap-4">
                      <RecordDialog
                        variant="link"
                        label="Düzenle"
                        title="İş hareketi düzenle"
                        fields={fields}
                        hidden={{ id: h.id }}
                        initial={{
                          personelId: h.personelId,
                          islemTuru: h.islemTuru,
                          tarih: toDateInput(h.tarih),
                          girisSaati: h.girisSaati ?? "",
                          cikisSaati: h.cikisSaati ?? "",
                          izinTuru: h.izinTuru ?? "",
                          izinBaslangic: toDateInput(h.izinBaslangic),
                          izinBitis: toDateInput(h.izinBitis),
                          aciklama: h.aciklama ?? "",
                        }}
                        action={saveHareketAction}
                      />
                      <DeleteButton action={deleteHareketAction} id={h.id} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <MobileTables />
      </div>
      <Pager page={page} total={total} pageSize={PAGE_SIZE} params={{ tip: "HAREKET", personel: sp.personel, tur: sp.tur, from: sp.from, to: sp.to }} />
    </>
  );
}

export default async function PersonelPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser("personel:read");
  const sp = await searchParams;
  const tip = sp.tip === "HAREKET" ? "HAREKET" : "KART";
  const page = pageOf(sp.page);
  const canWrite = can(user, "personel:write");

  // Başlık + sekmeler; "Yeni …" butonu sekmeye göre değiştiği için İş Hareketleri kendi başlık satırını oluşturur.
  const baslik = (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Personel</h1>
      <QueryTabs
        param="tip"
        items={[
          { value: "KART", label: "Personel Kartları" },
          { value: "HAREKET", label: "İş Hareketleri" },
        ]}
      />
    </div>
  );

  if (tip === "HAREKET") {
    return (
      <div className="space-y-3">
        <IsHareketleri sp={sp} page={page} canWrite={canWrite} baslik={baslik} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {baslik}
        {canWrite && (
          <RecordDialog
            label="Yeni personel"
            title="Yeni personel"
            fields={personelFields}
            initial={{}}
            action={savePersonelAction}
          />
        )}
      </header>


      <PersonelKartlari sp={sp} page={page} canWrite={canWrite} />
    </div>
  );
}
