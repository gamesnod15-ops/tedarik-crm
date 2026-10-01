import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/session";
import { ayKaydir, donemAdi, donemKey, getEkstre, parseDonem } from "@/lib/ekstre";
import { formatDate, formatMoney, formatQty, todayInput } from "@/lib/format";
import { PrintButton } from "@/components/print-button";
import { RecordDialog } from "@/components/record-dialog";
import { saveCariAction } from "../actions";
import { CARI_TIP_LABELS, cariFields } from "../fields";
import { saveOdemeAction } from "../../finans/actions";
import { odemeFieldsForCari } from "../../finans/fields";
import { saveAlimAction, saveSiparisAction } from "../../siparisler/actions";
import { loadSiparisFormData } from "../../siparisler/form-data";
import { YeniSiparisDialog } from "../../siparisler/yeni-siparis-dialog";
import { alimFieldsForCari } from "../../siparisler/alim-fields";

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${tone ?? "text-slate-900"}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

const num = "td text-right tabular-nums whitespace-nowrap";

export default async function CariDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ay?: string }>;
}) {
  const user = await requireUser("cariler:read");
  const { id } = await params;
  const sp = await searchParams;

  const tipRow = await db.cari.findUnique({ where: { id }, select: { tipi: true } });
  if (!tipRow) notFound();
  // Müşteri: aylık ekstre (varsayılan bu ay). Malzemeci: günlük kayıt tutulduğu için varsayılan tüm hareketler.
  const donem = parseDonem(sp.ay, tipRow.tipi === "TEDARIKCI" ? "TUM" : "AY");
  const ekstre = await getEkstre(id, donem);
  if (!ekstre) notFound();
  const { cari } = ekstre;

  const label = CARI_TIP_LABELS[cari.tipi];
  const musteri = cari.tipi === "MUSTERI";
  const canWrite = can(user, "cariler:write");
  const canOrder = can(user, "siparisler:write");
  const canPay = can(user, "finans:write");

  const urunler = canOrder && musteri ? (await loadSiparisFormData("MUSTERI")).urunler : [];

  const bakiye = ekstre.sonBakiye;
  const bakiyeLabel = musteri ? (bakiye.isNegative() ? "Müşteri alacaklı" : "Kalan (alacağımız)") : bakiye.isNegative() ? "Tedarikçi bize borçlu" : "Kalan (borcumuz)";
  const aylik = donem.tip === "AY";
  const onceki = aylik ? donemKey(ayKaydir(donem, -1)) : null;
  const sonraki = aylik ? donemKey(ayKaydir(donem, 1)) : null;
  const base = `/cariler/${cari.id}`;

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <Link href={`/cariler?tip=${cari.tipi}`} className="text-sm text-slate-500 hover:underline print:hidden">← Cariler</Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">{cari.unvan}</h1>
              <span className="badge bg-petrol-50 text-petrol-700">{label}</span>
              {!cari.isActive && <span className="badge bg-slate-100 text-slate-600">Pasif</span>}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {[cari.yetkili, cari.telefon, cari.eposta].filter(Boolean).join(" · ") || "İletişim bilgisi yok"}
            </p>
            {cari.adres && <p className="text-sm text-slate-500">{cari.adres}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <PrintButton label="Ekstreyi yazdır" />
            {canOrder && musteri && (
              <YeniSiparisDialog cari={{ id: cari.id, unvan: cari.unvan }} urunler={urunler} bugun={todayInput()} action={saveSiparisAction} />
            )}
            {canOrder && !musteri && (
              <RecordDialog
                variant="secondary"
                label="Yeni alım"
                title="Yeni tedarikçi alımı"
                fields={alimFieldsForCari()}
                hidden={{ cariId: cari.id }}
                initial={{ tarih: todayInput() }}
                action={saveAlimAction}
              />
            )}
            {canPay && (
              <RecordDialog
                variant="secondary"
                label={musteri ? "Tahsilat ekle" : "Ödeme ekle"}
                title={musteri ? "Tahsilat ekle" : "Ödeme ekle"}
                fields={odemeFieldsForCari()}
                hidden={{ cariId: cari.id }}
                initial={{ tarih: todayInput(), islemTipi: musteri ? "TAHSILAT" : "ODEME", odemeSekli: "NAKIT" }}
                action={saveOdemeAction}
              />
            )}
            {canWrite && (
              <RecordDialog
                variant="primary"
                label="Düzenle"
                title={`${label} düzenle`}
                fields={cariFields}
                hidden={{ id: cari.id, tipi: cari.tipi }}
                initial={{
                  unvan: cari.unvan,
                  yetkili: cari.yetkili ?? "",
                  telefon: cari.telefon ?? "",
                  eposta: cari.eposta ?? "",
                  adres: cari.adres ?? "",
                  acilisBakiyesi: cari.acilisBakiyesi.toString(),
                  notlar: cari.notlar ?? "",
                  isActive: cari.isActive ? "on" : "",
                }}
                action={saveCariAction}
              />
            )}
          </div>
        </div>
      </header>

      {/* Dönem seçimi */}
      <div className="card flex flex-wrap items-center gap-3 p-3 print:hidden">
        {aylik ? (
          <>
            <Link href={`${base}?ay=${onceki}`} className="btn-secondary px-3" aria-label="Önceki ay">←</Link>
            <span className="min-w-36 text-center text-sm font-semibold text-slate-900">{donemAdi(donem)}</span>
            <Link href={`${base}?ay=${sonraki}`} className="btn-secondary px-3" aria-label="Sonraki ay">→</Link>
          </>
        ) : (
          <span className="text-sm font-semibold text-slate-900">{donemAdi(donem)}</span>
        )}
        <form className="ml-auto flex items-center gap-2">
          <label className="sr-only" htmlFor="ay">Ay seç</label>
          <input id="ay" name="ay" type="month" defaultValue={aylik ? donemKey(donem) : ""} className="input w-44" />
          <button className="btn-secondary">Göster</button>
        </form>
        {aylik ? (
          <Link href={`${base}?ay=tum`} className="text-sm text-petrol-700 hover:underline">Tüm hareketler</Link>
        ) : (
          <Link href={`${base}?ay=${donemKey(parseDonem(undefined, "AY"))}`} className="text-sm text-petrol-700 hover:underline">Bu ay</Link>
        )}
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={aylik ? "Devreden (önceki aydan)" : "Açılış bakiyesi"} value={formatMoney(ekstre.devreden)} />
        <Stat label={musteri ? "Dönem toplamı (sipariş)" : "Dönem toplamı (alım)"} value={formatMoney(ekstre.toplamBorclanma)} hint="KDV dahil" />
        <Stat label={musteri ? "Dönem tahsilatı" : "Dönem ödemesi"} value={formatMoney(ekstre.toplamOdeme)} />
        <Stat label={bakiyeLabel} value={formatMoney(bakiye.abs())} hint={aylik ? "Sonraki aya devreden" : undefined} tone={bakiye.isZero() ? "text-slate-900" : "text-petrol-700"} />
      </section>

      {cari.notlar && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{cari.notlar}</p>
      )}

      <section className="card overflow-x-auto">
        <h2 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold">
          Hesap ekstresi · {donemAdi(donem)}
        </h2>
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Tarih</th>
              <th className="th">{musteri ? "Model" : "Açıklama"}</th>
              <th className="th text-right">Miktar</th>
              <th className="th text-right">Fiyat</th>
              <th className="th text-right">Tutar</th>
              <th className="th text-right">KDV</th>
              <th className="th text-right">Toplam</th>
              <th className="th text-right">Ödeme</th>
              <th className="th text-right">Bakiye</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr className="bg-amber-50/70">
              <td className="td" />
              <td className="td font-semibold" colSpan={7}>{aylik ? "Devreden (önceki aydan)" : "Açılış bakiyesi"}</td>
              <td className={`${num} font-semibold`}>{formatMoney(ekstre.devreden)}</td>
            </tr>
            {ekstre.satirlar.length === 0 && (
              <tr><td colSpan={9} className="td py-6 text-center text-slate-400">Bu dönemde hareket yok.</td></tr>
            )}
            {ekstre.satirlar.map((r) => (
              <tr key={r.key} className={r.tur === "ODEME" ? "bg-emerald-50/40" : ""}>
                <td className="td whitespace-nowrap">{formatDate(r.tarih)}</td>
                <td className="td">
                  {r.href ? (
                    <Link href={r.href} className="font-medium text-slate-900 hover:text-petrol-700 hover:underline">{r.model}</Link>
                  ) : (
                    <span className="font-medium text-slate-900">{r.model}</span>
                  )}
                  {r.detay && <span className="block text-xs text-slate-500">{r.detay}</span>}
                </td>
                <td className={num}>{r.miktar ? formatQty(r.miktar) : ""}</td>
                <td className={num}>{r.fiyat ? formatMoney(r.fiyat) : ""}</td>
                <td className={num}>{r.tutar ? formatMoney(r.tutar) : ""}</td>
                <td className={num}>{r.kdv ? formatMoney(r.kdv) : ""}</td>
                <td className={`${num} font-medium`}>{r.toplam ? formatMoney(r.toplam) : ""}</td>
                <td className={`${num} font-medium text-emerald-700`}>{r.odeme ? formatMoney(r.odeme) : ""}</td>
                <td className={`${num} font-semibold`}>{formatMoney(r.bakiye)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 bg-slate-50">
            <tr>
              <td className="td font-semibold" colSpan={4}>Dönem toplamı</td>
              <td className={`${num} font-semibold`}>{musteri ? formatMoney(ekstre.toplamTutar) : ""}</td>
              <td className={`${num} font-semibold`}>{musteri ? formatMoney(ekstre.toplamKdv) : ""}</td>
              <td className={`${num} font-semibold`}>{formatMoney(ekstre.toplamBorclanma)}</td>
              <td className={`${num} font-semibold text-emerald-700`}>{formatMoney(ekstre.toplamOdeme)}</td>
              <td className="td" />
            </tr>
            <tr className="bg-amber-50/70">
              <td className="td font-semibold" colSpan={8}>
                {aylik ? "Dönem sonu bakiye (sonraki aya devreden)" : "Güncel bakiye"} · {bakiyeLabel}
              </td>
              <td className={`${num} text-base font-bold`}>{formatMoney(ekstre.sonBakiye)}</td>
            </tr>
          </tfoot>
        </table>
      </section>
    </div>
  );
}
