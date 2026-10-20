// Sunucu süreci başlarken bir kez çalışır (Next.js instrumentation).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ciktiyiDosyayaYonlendir } = await import("./lib/log-dosyasi");
  ciktiyiDosyayaYonlendir();
}
