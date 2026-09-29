import Link from "next/link";
import { requireUser } from "@/lib/session";
import { CreateUserForm } from "../user-forms";

export default async function NewUserPage() {
  await requireUser("users:write");
  return (
    <div className="space-y-6">
      <header>
        <Link href="/settings/users" className="text-sm text-slate-500 hover:underline">← Kullanıcılar</Link>
        <h1 className="mt-1 text-2xl font-semibold">Yeni kullanıcı</h1>
      </header>
      <CreateUserForm />
    </div>
  );
}
