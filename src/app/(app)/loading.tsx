/**
 * Sayfa geçişlerinde, sunucudan veri gelene kadar anında gösterilen iskelet görünüm.
 * Menü/sekme tıklaması beklemeden tepki verir; kenar çubuğu ve başlık olduğu gibi kalır.
 */
export default function Loading() {
  const satir = "h-4 rounded bg-slate-200";
  return (
    <div className="animate-pulse space-y-5" aria-busy="true" aria-label="Yükleniyor">
      <div className="flex items-center justify-between gap-4">
        <div className="h-7 w-40 rounded-lg bg-slate-200" />
        <div className="h-9 w-32 rounded-lg bg-slate-200" />
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="h-9 w-full max-w-xs rounded-lg bg-slate-200" />
        <div className="h-9 w-48 rounded-lg bg-slate-200" />
      </div>
      <div className="card divide-y divide-slate-200">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-6 px-4 py-3.5">
            <div className={`${satir} w-1/4`} />
            <div className={`${satir} w-1/6`} />
            <div className={`${satir} ml-auto w-24`} />
          </div>
        ))}
      </div>
      <span className="sr-only">Yükleniyor…</span>
    </div>
  );
}
