import Link from "next/link";
import { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/session";
import { formatDate, formatMoney, monthStartInput, parseDateInput, toDateInput } from "@/lib/format";
import { donemAdi, donemAraligi, parseDonem } from "@/lib/ekstre";
import { AySecici } from "@/components/ay-secici";
import { RecordDialog } from "@/components/record-dialog";
import { DeleteButton } from "@/components/delete-button";
import { UzunMetin } from "@/components/uzun-metin";
import { MobileTables } from "@/components/mobile-tables";
import { TUR_LABELS, aylikMaas, hareketAyrinti, kalanMiktar, odemeFields, personelFields, toplamHakedis } from "../fields";
import { deletePersonelOdemeAction, savePersonelAction, savePersonelOdemeAction } from "../actions";

const SON_HAREKET = 10;

function Kutu({ label, value, alt, tone = "text-slate-900", vurgu = false }: { label: string; value: string; alt?: string; tone?: string; vurgu?: boolean }) {
  return (
    <div className={`card p-4 ${vurgu ? "ring-2 ring-brand-200" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
      {alt && <p className="mt-0.5 text-xs text-slate-500">{alt}</p>}
    </div>
  );
}

export default async function PersonelDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ay?: string }>;
}) {
  const user = await requireUser("personel:read");
  const { id } = await params;
  const sp = await searchParams;
  const canWrite = can(user, "personel:write");

  // Varsayılan bu ay: ödemeler, iş hareketleri ve kutulardaki toplamlar seçilen aya göre hesaplanır.
  const donem = parseDonem(sp.ay, "AY");
  const aralik = donemAraligi(donem);
  const aylik = aralik !== null;

  const personel = await db.personel.findUnique({
    where: { id },
    include: {
      odemeler: { where: aralik ? { tarih: aralik } : undefined, orderBy: [{ tarih: "desc" }, { createdAt: "desc" }] },
      // Ay seçiliyken o ayın tüm hareketleri, "Tüm hareketler"de son birkaç hareket gösterilir.
      hareketler: { where: aralik ? { tarih: aralik } : undefined, orderBy: [{ tarih: "desc" }, { createdAt: "desc" }], take: aylik ? undefined : SON_HAREKET },
      maasGecmisi: { select: { ay: true, maas: true } },
      _count: { select: { hareketler: true } },
    },
  });
  if (!personel) notFound();

  const odemeler = personel.odemeler;

  // Ödemeler yalnızca bilgi amaçlıdır: bu toplam hiçbir finans/bakiye/rapor hesabına katılmaz.
  const toplam = odemeler.reduce((t, o) => t.add(o.tutar), new Prisma.Decimal(0));
  const son = odemeler[0];

  // Sabit maaş aya göre geçmişten okunur: sonradan değişen maaş önceki ayları etkilemez, gelecek aylar boş görünür.
  // "Tüm hareketler"de güncel maaş gösterilir; kalan = ilk maaş ayından bu aya kadarki toplam hak ediş − tüm ödemeler.
  const gecmis = personel.maasGecmisi;
  const buAy = parseDateInput(monthStartInput())!;
  const gelecek = aralik !== null && aralik.gte > buAy;
  const maas = aylikMaas(gecmis, aralik ? aralik.gte : buAy, buAy);
  const hakedis = aylik ? null : toplamHakedis(gecmis, buAy);
  const kalan = aylik ? kalanMiktar(maas, toplam) : kalanMiktar(hakedis, toplam);
  const maasAlt = aylik
    ? maas ? donemAdi(donem) : gelecek ? "Bu ay henüz başlamadı" : gecmis.length ? "Bu ay için maaş tanımlı değil" : "Düzenle'den girilebilir"
    : hakedis ? `Toplam hak ediş ${formatMoney(hakedis)}` : "Düzenle'den girilebilir";

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <Link href="/personel" className="text-sm text-slate-500 hover:underline">← Personel</Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{personel.adSoyad}</h1>
          {canWrite && (
            <div className="flex flex-wrap items-center gap-2">
              <RecordDialog
                variant="secondary"
                label="Düzenle"
                title="Personel düzenle"
                fields={personelFields}
                hidden={{ id: personel.id }}
                initial={{ adSoyad: personel.adSoyad, maas: personel.maas?.toString() ?? "", aciklama: personel.aciklama ?? "" }}
                action={savePersonelAction}
              />
              <RecordDialog
                label="Yeni ödeme"
                title={`Yeni ödeme · ${personel.adSoyad}`}
                fields={odemeFields}
                hidden={{ personelId: personel.id }}
                initial={{ tarih: toDateInput(new Date()) }}
                action={savePersonelOdemeAction}
              />
            </div>
          )}
        </div>
      </header>

      {personel.aciklama && (
        <section className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Açıklama</p>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{personel.aciklama}</p>
        </section>
      )}

      <AySecici base={`/personel/${personel.id}`} donem={donem} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kutu label={aylik ? "Sabit maaş" : "Güncel sabit maaş"} value={maas ? formatMoney(maas) : "—"} alt={maasAlt} />
        <Kutu label="Toplam ödeme" value={formatMoney(toplam)} alt={`${odemeler.length} ödeme · ${donemAdi(donem)}`} />
        <Kutu
          label="Kalan miktar"
          value={kalan ? formatMoney(kalan.abs()) : "—"}
          alt={kalan === null ? (gelecek ? "Bu ay henüz başlamadı" : "Sabit maaş girilmemiş") : kalan.isNegative() ? "Maaştan fazla ödendi" : kalan.isZero() ? "Tamamı ödendi" : aylik ? "Sabit maaş − toplam ödeme" : "Toplam hak ediş − toplam ödeme"}
          tone={kalan?.isNegative() ? "text-red-700" : "text-slate-900"}
          vurgu
        />
        <Kutu label="Son ödeme" value={son ? formatMoney(son.tutar) : "—"} alt={son ? formatDate(son.tarih) : undefined} />
      </section>

      <section className="card overflow-x-auto">
        <h2 className="border-b border-slate-300 px-5 py-3 text-sm font-semibold">Ödemeler · {donemAdi(donem)}</h2>
        <table className="w-full">
          <thead className="border-b border-slate-300 bg-slate-50">
            <tr>
              <th className="th">Tarih</th>
              <th className="th text-right">Tutar</th>
              <th className="th">Açıklama</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {odemeler.length === 0 && (
              <tr><td colSpan={4} className="td py-8 text-center text-slate-400">{aylik ? "Bu ayda ödeme yok." : "Henüz ödeme girilmemiş."}</td></tr>
            )}
            {odemeler.map((o) => (
              <tr key={o.id}>
                <td className="td whitespace-nowrap">{formatDate(o.tarih)}</td>
                <td className="td text-right font-medium tabular-nums">{formatMoney(o.tutar)}</td>
                <td className="td max-w-md text-slate-600">
                  <UzunMetin metin={o.aciklama} baslik={`${formatDate(o.tarih)} ödemesi · Açıklama`} />
                </td>
                <td className="td">
                  {canWrite && (
                    <div className="flex items-center justify-end gap-4">
                      <RecordDialog
                        variant="link"
                        label="Düzenle"
                        title="Ödeme düzenle"
                        fields={odemeFields}
                        hidden={{ id: o.id, personelId: personel.id }}
                        initial={{ tarih: toDateInput(o.tarih), tutar: o.tutar.toString(), aciklama: o.aciklama ?? "" }}
                        action={savePersonelOdemeAction}
                      />
                      <DeleteButton
                        action={deletePersonelOdemeAction}
                        id={o.id}
                        confirmTitle="Ödemeyi sil"
                        confirmText={`${formatDate(o.tarih)} tarihli ${formatMoney(o.tutar)} ödeme silinsin mi?`}
                      />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <MobileTables />
        {odemeler.length > 0 && (
          <div className="space-y-1 border-t border-slate-300 bg-slate-50 px-5 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Toplam</span>
              <span className="font-semibold tabular-nums text-slate-900">{formatMoney(toplam)}</span>
            </div>
            {kalan !== null && (
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Kalan miktar ({aylik ? `sabit maaş ${formatMoney(maas!)}` : `toplam hak ediş ${formatMoney(hakedis!)}`})</span>
                <span className={`font-semibold tabular-nums ${kalan.isNegative() ? "text-red-700" : "text-slate-900"}`}>
                  {kalan.isNegative() ? `${formatMoney(kalan.abs())} fazla ödeme` : formatMoney(kalan)}
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="card overflow-x-auto">
        <div className="flex items-center justify-between border-b border-slate-300 px-5 py-3">
          <h2 className="text-sm font-semibold">{aylik ? `İş hareketleri · ${donemAdi(donem)}` : "Son iş hareketleri"}</h2>
          {personel._count.hareketler > 0 && (
            <Link href={`/personel?tip=HAREKET&personel=${personel.id}`} className="text-sm text-petrol-700 hover:underline">
              Tümü ({personel._count.hareketler})
            </Link>
          )}
        </div>
        <table className="w-full">
          <thead className="border-b border-slate-300 bg-slate-50">
            <tr>
              <th className="th">Tarih</th>
              <th className="th">Tür</th>
              <th className="th">Ayrıntı</th>
              <th className="th">Açıklama</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {personel.hareketler.length === 0 && (
              <tr><td colSpan={4} className="td py-8 text-center text-slate-400">{aylik ? "Bu ayda iş hareketi yok." : "İş hareketi yok."}</td></tr>
            )}
            {personel.hareketler.map((h) => (
              <tr key={h.id}>
                <td className="td whitespace-nowrap">{formatDate(h.tarih)}</td>
                <td className="td">
                  <span className={`badge ${h.islemTuru === "IZIN" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"}`}>{TUR_LABELS[h.islemTuru]}</span>
                </td>
                <td className="td">{hareketAyrinti(h)}</td>
                <td className="td max-w-xs text-slate-500">
                  <UzunMetin metin={h.aciklama} baslik="İş hareketi · Açıklama" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
