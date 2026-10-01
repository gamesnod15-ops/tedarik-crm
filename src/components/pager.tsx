import Link from "next/link";

export function Pager({
  page,
  total,
  pageSize,
  params,
}: {
  page: number;
  total: number;
  pageSize: number;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    qs.set("page", String(p));
    return `?${qs}`;
  };

  return (
    <nav className="flex items-center justify-between text-sm" aria-label="Sayfalama">
      {page > 1 ? <Link href={href(page - 1)} className="btn-secondary">← Önceki</Link> : <span />}
      <span className="text-slate-500">
        {total} kayıt · Sayfa {Math.min(page, pages)} / {pages}
      </span>
      {page < pages ? <Link href={href(page + 1)} className="btn-secondary">Sonraki →</Link> : <span />}
    </nav>
  );
}
