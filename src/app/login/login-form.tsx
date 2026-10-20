"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

// Giriş, Server Action yerine NextAuth'un istemci signIn'i ile /api/auth/callback/credentials'a gider.
// Neden: cPanel/Passenger'da Next.js'in Server Action sonrası yaptigi ic HTTP cagrisi zaman asimina ugruyor
// (UND_ERR_HEADERS_TIMEOUT -> "failed to get redirect response"); istek donuyor, 504 veriyordu.
// redirect:false ile cevabi istemcide alip yonlendirmeyi kendimiz yapiyoruz; o yoldan hic gecilmiyor.
// Ayrica her adim ve zamanlama ekranda gosterilir, sessizce beklenmez.
function safeCallback(url: string) {
  return url.startsWith("/") && !url.startsWith("//") ? url : "/";
}

type Satir = { t: string; ok?: boolean };

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [adimlar, setAdimlar] = useState<Satir[]>([]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const remember = form.get("remember") === "on" ? "on" : "";

    const t0 = Date.now();
    const ms = () => `${Date.now() - t0} ms`;
    const log: Satir[] = [];
    const yaz = (t: string, ok?: boolean) => {
      log.push({ t: `${t} (${ms()})`, ok });
      setAdimlar([...log]);
    };

    yaz("Giriş isteği gönderiliyor…");

    try {
      // 25 sn icinde cevap gelmezse sonsuza kadar beklemeyiz.
      const zamanAsimi = new Promise<never>((_, red) =>
        setTimeout(() => red(new Error("İstek 25 sn içinde yanıt vermedi (sunucu takıldı).")), 25_000),
      );
      const istek = signIn("credentials", { email, password, remember, redirect: false });
      const res = (await Promise.race([istek, zamanAsimi])) as Awaited<typeof istek>;

      if (res?.error) {
        yaz(`Sunucu yanıtı: BAŞARISIZ — ${res.error}`, false);
        setError("E-posta veya şifre hatalı ya da hesap geçici olarak kilitli/pasif.");
        setPending(false);
        return;
      }

      yaz("Sunucu yanıtı: BAŞARILI, oturum açıldı", true);
      yaz("Panele yönlendiriliyor…", true);
      window.location.href = safeCallback(callbackUrl);
    } catch (err) {
      const mesaj = err instanceof Error ? err.message : String(err);
      yaz(`HATA: ${mesaj}`, false);
      setError(`Giriş tamamlanamadı: ${mesaj}`);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">E-posta</label>
        <input id="email" name="email" type="email" autoComplete="username" required placeholder="ornek@firma.com" className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">Şifre</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="Şifreniz" className="input" />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="remember" className="h-4 w-4 accent-brand-600" />
        Beni hatırla
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {adimlar.length > 0 && (
        <ul className="space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {adimlar.map((s, i) => (
            <li key={i} className={s.ok === false ? "text-red-600" : s.ok ? "text-green-600" : ""}>
              {s.ok === false ? "✖ " : s.ok ? "✔ " : "• "}
              {s.t}
            </li>
          ))}
        </ul>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
      <p className="flex items-start gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500">
        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-petrol-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        <span>
          Güvenli giriş: bağlantınız şifrelenir, hatalı denemeler kayıt altına alınır ve hesap 5 hatalı denemeden sonra geçici olarak kilitlenir.
        </span>
      </p>
    </form>
  );
}
