import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  if (await getCurrentUser()) redirect("/");
  const { callbackUrl } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ovox-crm-logo.svg" alt="Ovox CRM" className="mx-auto h-6 w-auto" />
          </h1>
          <p className="mt-4 text-sm text-slate-500">Hesabınızla giriş yapın</p>
        </div>
        <LoginForm callbackUrl={callbackUrl ?? "/"} />
      </div>
    </main>
  );
}
