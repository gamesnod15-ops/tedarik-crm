import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { ROBOTO_BOLD_B64, ROBOTO_REGULAR_B64 } from "./fonts";

export type PdfColumn = { header: string; weight: number; align?: "left" | "right" };
export type PdfRow = { cells: string[]; style?: "normal" | "bold" | "muted" | "highlight" | "total" };
export type PdfSection = {
  title: string;
  /** Başlık altındaki açıklama satırları (ör. cari bilgileri, dönem). */
  meta?: string[];
  /** Tablonun üstünde yan yana gösterilen özet kutuları. */
  summary?: { label: string; value: string }[];
  columns: PdfColumn[];
  rows: PdfRow[];
};

// A4 yatay: geniş tablolar (9 sütunlu ekstre) rahat sığar.
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MARGIN = 36;
const FOOTER_H = 30;
const ROW_H = 17;
const FONT = 8.5;

const INK = rgb(0.11, 0.14, 0.2);
const MUTED = rgb(0.42, 0.46, 0.54);
const LINE = rgb(0.85, 0.87, 0.9);
const HEAD_BG = rgb(0.94, 0.95, 0.97);
const HILITE = rgb(1, 0.97, 0.88);
const TOTAL_BG = rgb(0.92, 0.96, 0.98);
const BRAND = rgb(0.07, 0.39, 0.48);

const bytes = (b64: string) => Uint8Array.from(Buffer.from(b64, "base64"));

/** Tek satıra sığacak şekilde metni "…" ile keser. */
function fit(text: string, width: number, size: number, font: PDFFont) {
  const t = text.replace(/\s+/g, " ").trim();
  if (font.widthOfTextAtSize(t, size) <= width) return t;
  let s = t;
  while (s.length > 1 && font.widthOfTextAtSize(s + "…", size) > width) s = s.slice(0, -1);
  return s + "…";
}

export async function createPdf(options: { footerLeft: string }) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(bytes(ROBOTO_REGULAR_B64), { subset: true });
  const bold = await doc.embedFont(bytes(ROBOTO_BOLD_B64), { subset: true });
  doc.setProducer("Tuşba Nakış");
  doc.setCreator("Tuşba Nakış");

  const contentW = PAGE_W - 2 * MARGIN;
  let page!: PDFPage;
  let y = 0;

  function newPage() {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  }

  function drawText(text: string, x: number, yy: number, size: number, font: PDFFont, color = INK) {
    page.drawText(text, { x, y: yy, size, font, color });
  }

  function drawTableHeader(columns: PdfColumn[], xs: number[], widths: number[]) {
    page.drawRectangle({ x: MARGIN, y: y - ROW_H + 4, width: contentW, height: ROW_H, color: HEAD_BG });
    columns.forEach((c, i) => {
      const t = fit(c.header.toLocaleUpperCase("tr"), widths[i] - 8, 7.5, bold);
      const w = bold.widthOfTextAtSize(t, 7.5);
      drawText(t, c.align === "right" ? xs[i] + widths[i] - 4 - w : xs[i] + 4, y - ROW_H + 9, 7.5, bold, MUTED);
    });
    y -= ROW_H;
  }

  function addSection(section: PdfSection) {
    newPage();

    // Başlık
    drawText("Tuşba Nakış", MARGIN, y - 8, 8, bold, BRAND);
    y -= 22;
    drawText(fit(section.title, contentW, 15, bold), MARGIN, y - 12, 15, bold);
    y -= 22;
    for (const line of section.meta ?? []) {
      drawText(fit(line, contentW, 9, regular), MARGIN, y - 9, 9, regular, MUTED);
      y -= 13;
    }
    y -= 6;

    // Özet kutuları
    if (section.summary?.length) {
      const gap = 8;
      const boxW = (contentW - gap * (section.summary.length - 1)) / section.summary.length;
      section.summary.forEach((s, i) => {
        const x = MARGIN + i * (boxW + gap);
        page.drawRectangle({ x, y: y - 34, width: boxW, height: 34, borderColor: LINE, borderWidth: 0.8, color: rgb(1, 1, 1) });
        drawText(fit(s.label.toLocaleUpperCase("tr"), boxW - 12, 6.8, bold), x + 7, y - 12, 6.8, bold, MUTED);
        drawText(fit(s.value, boxW - 12, 11, bold), x + 7, y - 27, 11, bold);
      });
      y -= 46;
    }

    // Tablo
    const total = section.columns.reduce((t, c) => t + c.weight, 0);
    const widths = section.columns.map((c) => (c.weight / total) * contentW);
    const xs = widths.map((_, i) => MARGIN + widths.slice(0, i).reduce((a, b) => a + b, 0));
    drawTableHeader(section.columns, xs, widths);

    for (const row of section.rows) {
      if (y - ROW_H < MARGIN + FOOTER_H) {
        newPage();
        drawText(fit(`${section.title} (devamı)`, contentW, 9, bold), MARGIN, y - 9, 9, bold, MUTED);
        y -= 20;
        drawTableHeader(section.columns, xs, widths);
      }
      const style = row.style ?? "normal";
      if (style === "highlight") page.drawRectangle({ x: MARGIN, y: y - ROW_H + 4, width: contentW, height: ROW_H, color: HILITE });
      if (style === "total") page.drawRectangle({ x: MARGIN, y: y - ROW_H + 4, width: contentW, height: ROW_H, color: TOTAL_BG });
      const font = style === "bold" || style === "total" || style === "highlight" ? bold : regular;
      const color = style === "muted" ? MUTED : INK;
      row.cells.forEach((cell, i) => {
        if (!cell) return;
        // Sola dayalı hücre, yanındaki boş hücrelere taşabilir (uzun etiketler kesilmesin).
        let genislik = widths[i];
        if (section.columns[i].align !== "right") {
          for (let j = i + 1; j < row.cells.length && !row.cells[j]; j++) genislik += widths[j];
        }
        const t = fit(cell, genislik - 8, FONT, font);
        const w = font.widthOfTextAtSize(t, FONT);
        drawText(t, section.columns[i].align === "right" ? xs[i] + widths[i] - 4 - w : xs[i] + 4, y - ROW_H + 9, FONT, font, color);
      });
      page.drawLine({ start: { x: MARGIN, y: y - ROW_H + 4 }, end: { x: MARGIN + contentW, y: y - ROW_H + 4 }, thickness: 0.4, color: LINE });
      y -= ROW_H;
    }
  }

  async function build() {
    const pages = doc.getPages();
    pages.forEach((p, i) => {
      p.drawLine({ start: { x: MARGIN, y: MARGIN + 14 }, end: { x: PAGE_W - MARGIN, y: MARGIN + 14 }, thickness: 0.5, color: LINE });
      p.drawText(options.footerLeft, { x: MARGIN, y: MARGIN, size: 7.5, font: regular, color: MUTED });
      const label = `Sayfa ${i + 1} / ${pages.length}`;
      p.drawText(label, { x: PAGE_W - MARGIN - regular.widthOfTextAtSize(label, 7.5), y: MARGIN, size: 7.5, font: regular, color: MUTED });
    });
    return doc.save();
  }

  return { addSection, build };
}

/** İndirme dosya adı için Türkçe karakterleri sadeleştirir. */
export function safeFilename(name: string) {
  const map: Record<string, string> = { ç: "c", Ç: "C", ğ: "g", Ğ: "G", ı: "i", İ: "I", ö: "o", Ö: "O", ş: "s", Ş: "S", ü: "u", Ü: "U" };
  return name
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (c) => map[c])
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function pdfResponse(body: Uint8Array, filename: string) {
  return new Response(Buffer.from(body), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFilename(filename)}.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}.pdf`,
      "Cache-Control": "no-store",
    },
  });
}
