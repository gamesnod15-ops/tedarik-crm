import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-sm p-8 text-center">
        <p className="text-4xl font-bold text-slate-300">403</p>
        <h1 className="mt-2 text-lg font-semibold">Erişim yetkiniz yok</h1>
        <p className="mt-1 text-sm text-slate-500">Bu sayfayı görüntülemek için gerekli izne sahip değilsiniz.</p>
        <Link href="/" className="btn-secondary mt-5">Ana sayfaya dön</Link>
      </div>
    </main>
  );
}
