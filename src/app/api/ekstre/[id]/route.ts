import { can, getCurrentUser } from "@/lib/session";
import { donemKey, getEkstre, parseDonem } from "@/lib/ekstre";
import { db } from "@/lib/db";
import { ekstrePdf } from "@/lib/pdf/documents";
import { pdfResponse } from "@/lib/pdf/builder";

export const dynamic = "force-dynamic";

/** Tek carinin hesap ekstresi PDF'i. ?ay=YYYY-MM | tum */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Giriş gerekli." }, { status: 401 });
  if (!can(user, "cariler:read")) return Response.json({ error: "Yetkiniz yok." }, { status: 403 });

  const { id } = await ctx.params;
  const tip = await db.cari.findUnique({ where: { id }, select: { tipi: true } });
  if (!tip) return Response.json({ error: "Cari bulunamadı." }, { status: 404 });

  const donem = parseDonem(new URL(req.url).searchParams.get("ay") ?? undefined, tip.tipi === "TEDARIKCI" ? "TUM" : "AY");
  const ekstre = await getEkstre(id, donem);
  if (!ekstre) return Response.json({ error: "Cari bulunamadı." }, { status: 404 });

  const pdf = await ekstrePdf([ekstre]);
  return pdfResponse(pdf, `Ekstre ${ekstre.cari.unvan} ${donemKey(donem)}`);
}
