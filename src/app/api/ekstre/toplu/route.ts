import { can, getCurrentUser } from "@/lib/session";
import { donemKey, getEkstreler, parseDonem } from "@/lib/ekstre";
import { ekstrePdf } from "@/lib/pdf/documents";
import { pdfResponse } from "@/lib/pdf/builder";

export const dynamic = "force-dynamic";

/** Ay sonu toplu ekstre: tüm müşteriler (ya da tedarikçiler) tek PDF'te, her biri ayrı sayfada. ?ay=YYYY-MM&tip=MUSTERI|TEDARIKCI */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Giriş gerekli." }, { status: 401 });
  if (!can(user, "cariler:read") || !can(user, "raporlar:read")) return Response.json({ error: "Yetkiniz yok." }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const tipi = sp.get("tip") === "TEDARIKCI" ? "TEDARIKCI" : "MUSTERI";
  const donem = parseDonem(sp.get("ay") ?? undefined, "AY");
  const ekstreler = await getEkstreler(tipi, donem);
  if (ekstreler.length === 0) return Response.json({ error: "Bu dönemde ekstre oluşturulacak hareket ya da bakiye yok." }, { status: 404 });

  const pdf = await ekstrePdf(ekstreler);
  return pdfResponse(pdf, `Ekstreler ${tipi === "MUSTERI" ? "Musteri" : "Tedarikci"} ${donemKey(donem)}`);
}
