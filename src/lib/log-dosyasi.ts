import fs from "node:fs";
import path from "node:path";

const MAX_BOYUT = 5 * 1024 * 1024; // Bu boyutu aşan günlük, başlangıçta .1 uzantısıyla kenara alınır (tek yedek tutulur).

/**
 * cPanel (Passenger) sunucusunda Node'un stdout/stderr çıktısını okuyan yok (PassengerAppLogFile yazılmıyor).
 * Okunmayan boru dolunca Linux'ta senkron olan console yazmaları süreci sonsuza dek bekletiyor:
 * "[giriş] yavaş" uyarısını yazan giriş isteği cevapsız kalıyor, oturum çerezi hiç gönderilmiyordu.
 * Çıktı bunun yerine dosyaya (eşzamansız akış) yazılır; böylece hem takılma biter hem günlük okunabilir olur.
 * Dosya: LOG_FILE ortam değişkeni, yoksa Passenger'da uygulama kökünün yanındaki logs/app.log (~/tusbacrm/logs/app.log).
 */
export function ciktiyiDosyayaYonlendir() {
  const passenger = !!(process.env.IN_PASSENGER || process.env.PASSENGER_APP_ENV);
  const dosya = process.env.LOG_FILE || (passenger ? path.resolve(process.cwd(), "..", "logs", "app.log") : "");
  if (!dosya) return;

  try {
    fs.mkdirSync(path.dirname(dosya), { recursive: true });
    if (fs.existsSync(dosya) && fs.statSync(dosya).size > MAX_BOYUT) fs.renameSync(dosya, `${dosya}.1`);
  } catch {
    // Klasör/dosya hazırlanamazsa yine de akış açmayı dene; o da olmazsa çıktı olduğu gibi kalır.
  }

  const akis = fs.createWriteStream(dosya, { flags: "a" });
  let calisiyor = true;
  akis.on("error", () => {
    calisiyor = false; // Dosyaya yazılamıyorsa çıktıyı sessizce bırak: boruya geri dönmek takılmayı geri getirir.
  });

  for (const kanal of [process.stdout, process.stderr]) {
    kanal.write = ((parca: string | Uint8Array, ...rest: unknown[]) => {
      if (calisiyor) akis.write(parca);
      const cb = rest.find((r) => typeof r === "function") as (() => void) | undefined;
      cb?.();
      return true;
    }) as typeof kanal.write;
  }

  console.log(`[başlangıç] ${new Date().toISOString()} pid ${process.pid}, günlük: ${dosya}`);
}
