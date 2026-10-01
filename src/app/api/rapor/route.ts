import { can, getCurrentUser } from "@/lib/session";
import { getRapor } from "@/lib/rapor";
import { raporPdf } from "@/lib/pdf/documents";
import { pdfResponse } from "@/lib/pdf/builder";
import { monthStartInput, parseDateInput, todayInput } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Genel finans raporu PDF'i. ?from=YYYY-MM-DD&to=YYYY-MM-DD (boşsa bu ay) */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Giriş gerekli." }, { status: 401 });
  if (!can(user, "raporlar:read")) return Response.json({ error: "Yetkiniz yok." }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const fromStr = parseDateInput(sp.get("from")) ? sp.get("from")! : monthStartInput();
  const toStr = parseDateInput(sp.get("to")) ? sp.get("to")! : todayInput();
  const from = parseDateInput(fromStr)!;
  const to = parseDateInput(toStr)!;

  const pdf = await raporPdf(await getRapor(from, to), from, to);
  return pdfResponse(pdf, `Finans Raporu ${fromStr} ${toStr}`);
}
