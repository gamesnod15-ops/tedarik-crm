import type { getEkstre } from "../ekstre";
import { donemAdi } from "../ekstre";
import { formatDate, formatDateTime, formatMoney, formatQty } from "../format";
import type { getRapor } from "../rapor";
import { createPdf, type PdfRow } from "./builder";

type Ekstre = NonNullable<Awaited<ReturnType<typeof getEkstre>>>;
type Pdf = Awaited<ReturnType<typeof createPdf>>;

const footer = () => `Ovox CRM · Oluşturma: ${formatDateTime(new Date())}`;

/** Tek bir carinin hesap ekstresini PDF'e bir bölüm (en az bir sayfa) olarak ekler. */
export function addEkstreSection(pdf: Pdf, e: Ekstre) {
  const musteri = e.cari.tipi === "MUSTERI";
  const aylik = e.donem.tip === "AY";
  const bakiye = e.sonBakiye;
  const bakiyeEtiket = musteri ? (bakiye.isNegative() ? "Müşteri alacaklı" : "Kalan (alacağımız)") : bakiye.isNegative() ? "Tedarikçi bize borçlu" : "Kalan (borcumuz)";

  const rows: PdfRow[] = [
    { cells: ["", aylik ? "Devreden (önceki aydan)" : "Açılış bakiyesi", "", "", "", "", "", "", formatMoney(e.devreden)], style: "highlight" },
    ...e.satirlar.map(
      (r): PdfRow => ({
        cells: [
          formatDate(r.tarih),
          r.detay ? `${r.model} · ${r.detay}` : r.model,
          r.miktar ? formatQty(r.miktar) : "",
          r.fiyat ? formatMoney(r.fiyat) : "",
          r.tutar ? formatMoney(r.tutar) : "",
          r.kdv ? formatMoney(r.kdv) : "",
          r.toplam ? formatMoney(r.toplam) : "",
          r.odeme ? formatMoney(r.odeme) : "",
          formatMoney(r.bakiye),
        ],
        style: r.tur === "ODEME" ? "muted" : "normal",
      }),
    ),
    { cells: ["", "Dönem toplamı", "", "", musteri ? formatMoney(e.toplamTutar) : "", musteri ? formatMoney(e.toplamKdv) : "", formatMoney(e.toplamBorclanma), formatMoney(e.toplamOdeme), ""], style: "total" },
    { cells: ["", `${aylik ? "Dönem sonu bakiye (sonraki aya devreden)" : "Güncel bakiye"} · ${bakiyeEtiket}`, "", "", "", "", "", "", formatMoney(bakiye)], style: "total" },
  ];

  pdf.addSection({
    title: `${e.cari.unvan} · Hesap Ekstresi`,
    meta: [
      `${musteri ? "Müşteri" : "Tedarikçi"} · Dönem: ${donemAdi(e.donem)}`,
      e.cari.telefon ?? "",
    ].filter(Boolean),
    summary: [
      { label: aylik ? "Devreden (önceki aydan)" : "Açılış bakiyesi", value: formatMoney(e.devreden) },
      { label: musteri ? "Dönem toplamı (sipariş, KDV dahil)" : "Dönem toplamı (alım)", value: formatMoney(e.toplamBorclanma) },
      { label: musteri ? "Dönem tahsilatı" : "Dönem ödemesi", value: formatMoney(e.toplamOdeme) },
      { label: bakiyeEtiket, value: formatMoney(bakiye.abs()) },
    ],
    columns: [
      { header: "Tarih", weight: 8 },
      { header: musteri ? "Model" : "Açıklama", weight: 27 },
      { header: "Miktar", weight: 7, align: "right" },
      { header: "Fiyat", weight: 9, align: "right" },
      { header: "Tutar", weight: 10, align: "right" },
      { header: "KDV", weight: 8, align: "right" },
      { header: "Toplam", weight: 10, align: "right" },
      { header: "Ödeme", weight: 10, align: "right" },
      { header: "Bakiye", weight: 11, align: "right" },
    ],
    rows,
  });
}

export async function ekstrePdf(ekstreler: Ekstre[]) {
  const pdf = await createPdf({ footerLeft: footer() });
  for (const e of ekstreler) addEkstreSection(pdf, e);
  return pdf.build();
}

export async function raporPdf(rapor: Awaited<ReturnType<typeof getRapor>>, from: Date, to: Date) {
  const pdf = await createPdf({ footerLeft: footer() });
  const { ozet } = rapor;
  pdf.addSection({
    title: "Genel Finans ve Hareket Raporu",
    meta: [`${formatDate(from)} – ${formatDate(to)} arası`, "Ciro ve alış KDV dahildir. Kâr = ciro − alış − gider. Tutar işareti: gelir (+) / gider (−)."],
    summary: [
      { label: "Toplam ciro", value: formatMoney(ozet.ciro) },
      { label: "Toplam alış", value: formatMoney(ozet.alis) },
      { label: "Toplam gider", value: formatMoney(ozet.gider) },
      { label: "Kâr / zarar", value: formatMoney(ozet.kar) },
      { label: "Tahsilat", value: formatMoney(ozet.tahsilat) },
      { label: "Ödeme", value: formatMoney(ozet.odeme) },
    ],
    columns: [
      { header: "Tarih", weight: 9 },
      { header: "Tür", weight: 15 },
      { header: "Cari / açıklama", weight: 28 },
      { header: "Ayrıntı", weight: 33 },
      { header: "Tutar", weight: 15, align: "right" },
    ],
    rows: rapor.satirlar.length
      ? rapor.satirlar.map((r): PdfRow => ({ cells: [formatDate(r.tarih), r.tur, r.ad, r.aciklama, formatMoney(r.tutar)] }))
      : [{ cells: ["", "Bu tarih aralığında hareket yok.", "", "", ""], style: "muted" }],
  });
  return pdf.build();
}
