"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const GIZLE_KEY = "ovox.install.gizle";

/**
 * Service worker'ı kaydeder ve telefonda "Uygulamayı yükle" önerisini gösterir.
 * Android/Chrome: tek dokunuşla yükler. iPhone (Safari): Paylaş → Ana Ekrana Ekle adımlarını gösterir.
 * Uygulama zaten yüklüyse (tam ekran açıldıysa) ya da kullanıcı kapattıysa görünmez.
 */
export function InstallPrompt() {
  const [olay, setOlay] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [goster, setGoster] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

    const yuklu = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let gizli = false;
    try {
      gizli = localStorage.getItem(GIZLE_KEY) === "1";
    } catch {}
    if (yuklu || gizli) return;

    const iPhone = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    if (iPhone) {
      setIos(true);
      setGoster(true);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setOlay(e as InstallEvent);
      setGoster(true);
    };
    const onInstalled = () => setGoster(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function kapat() {
    setGoster(false);
    try {
      localStorage.setItem(GIZLE_KEY, "1");
    } catch {}
  }

  async function yukle() {
    if (!olay) return;
    await olay.prompt();
    const { outcome } = await olay.userChoice;
    setOlay(null);
    if (outcome === "accepted") setGoster(false);
  }

  if (!goster) return null;

  return (
    <div role="dialog" aria-label="Uygulamayı yükle" className="fixed inset-x-3 bottom-3 z-50 rounded-xl border border-slate-300 bg-white p-4 shadow-lg md:hidden print:hidden">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl border border-slate-200" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Ovox CRM'i telefona yükleyin</p>
          {ios ? (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              {/* iOS 26 Safari'nin sade görünümünde Paylaş düğmesi alt çubukta değil, adresin yanındaki menünün içinde. */}
              <strong>Paylaş</strong>{" "}
              <svg viewBox="0 0 24 24" className="inline h-4 w-4 align-text-bottom" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3v12M8 7l4-4 4 4" />
                <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
              </svg>{" "}
              düğmesine dokunun (görünmüyorsa önce adresin yanındaki <strong>≡</strong> ya da <strong>⋯</strong> menüsünü açın), sonra <strong>Ana Ekrana Ekle</strong>'yi seçin.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-600">Ana ekrandan tek dokunuşla, uygulama gibi açılır.</p>
          )}
        </div>
        <button type="button" onClick={kapat} aria-label="Kapat" className="-mr-1 -mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {!ios && olay && (
        <button type="button" onClick={yukle} className="btn-primary mt-3 w-full">
          Uygulamayı yükle
        </button>
      )}
    </div>
  );
}
