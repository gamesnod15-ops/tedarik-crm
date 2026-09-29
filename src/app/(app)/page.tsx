import { requireUser } from "@/lib/session";

// Ana sayfa: iş modülleri (tedarikçi, ürün, sipariş…) eklendiğinde burası dolacak.
export default async function Home() {
  const user = await requireUser();

  return (
    <div className="card p-10 text-center">
      <h1 className="text-xl font-semibold">Hoş geldiniz, {user.name}</h1>
      <p className="mt-1 text-sm text-slate-500">Modüller yakında burada olacak.</p>
    </div>
  );
}
