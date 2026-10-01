import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { ActionButton } from "@/components/action-button";
import { DeleteButton } from "@/components/delete-button";
import { RecordDialog } from "@/components/record-dialog";
import { deleteTekrarAction, olusturTekrarAction, saveTekrarAction } from "./actions";
import { tekrarFields } from "./fields";

/** Masraflar sekmesinin altındaki "Tekrarlayan masraflar" bölümü: her ay kendiliğinden masraf kaydı açan şablonlar. */
export async function TekrarlayanBolumu({ canWrite }: { canWrite: boolean }) {
  const sablonlar = await db.tekrarlayanMasraf.findMany({ orderBy: [{ gun: "asc" }, { aciklama: "asc" }] });

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Tekrarlayan masraflar</h2>
          <p className="text-xs text-slate-500">Kira, elektrik, maaş gibi her ay tekrarlanan masraflar ayın belirlenen gününde kendiliğinden kaydedilir.</p>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            {sablonlar.some((s) => s.isActive) && <ActionButton action={olusturTekrarAction} label="Bu ay için şimdi oluştur" pendingLabel="Oluşturuluyor…" />}
            <RecordDialog
              variant="primary"
              label="Yeni tekrarlayan masraf"
              title="Yeni tekrarlayan masraf"
              fields={tekrarFields}
              initial={{ gun: "1", isActive: "on" }}
              action={saveTekrarAction}
            />
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Açıklama</th>
              <th className="th">Kategori</th>
              <th className="th text-right">Tutar</th>
              <th className="th">Her ayın</th>
              <th className="th">Son oluşturma</th>
              <th className="th">Durum</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sablonlar.length === 0 && (
              <tr><td colSpan={7} className="td py-6 text-center text-slate-400">Henüz tekrarlayan masraf yok.</td></tr>
            )}
            {sablonlar.map((s) => (
              <tr key={s.id}>
                <td className="td font-medium text-slate-900">{s.aciklama}</td>
                <td className="td">{s.kategori ?? "—"}</td>
                <td className="td text-right tabular-nums">{formatMoney(s.tutar)}</td>
                <td className="td">{s.gun}. günü</td>
                <td className="td text-slate-500">{s.sonOlusturma ?? "—"}</td>
                <td className="td">
                  <span className={`badge ${s.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{s.isActive ? "Aktif" : "Pasif"}</span>
                </td>
                <td className="td">
                  {canWrite && (
                    <div className="flex items-center justify-end gap-4">
                      <RecordDialog
                        variant="link"
                        label="Düzenle"
                        title="Tekrarlayan masrafı düzenle"
                        fields={tekrarFields}
                        hidden={{ id: s.id }}
                        initial={{
                          aciklama: s.aciklama,
                          tutar: s.tutar.toString(),
                          gun: String(s.gun),
                          kategori: s.kategori ?? "",
                          odemeSekli: s.odemeSekli ?? "",
                          isActive: s.isActive ? "on" : "",
                        }}
                        action={saveTekrarAction}
                      />
                      <DeleteButton
                        action={deleteTekrarAction}
                        id={s.id}
                        confirmText={`"${s.aciklama}" şablonu silinsin mi? Daha önce oluşmuş masraf kayıtları silinmez.`}
                      />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
