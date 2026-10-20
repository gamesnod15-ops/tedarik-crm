// Sunucu süreci başlarken bir kez çalışır (Next.js instrumentation).
// Koşul derleme anında çözülür: Edge derlemesine Node modülleri (fs) girmez.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ciktiyiDosyayaYonlendir } = await import("./lib/log-dosyasi");
    ciktiyiDosyayaYonlendir();
  }
}
