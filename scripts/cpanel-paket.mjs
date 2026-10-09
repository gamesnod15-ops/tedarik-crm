// cPanel'e yüklenecek paketi hazırlar: `npm run build` sonrası `npm run paket`.
// Çıktı: cpanel-paket.tar.gz -> cPanel Dosya Yöneticisi ile ~/tusbacrm içine yüklenip "Extract" edilir,
// sonra Setup Node.js App'te uygulama RESTART edilir.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
if (!existsSync(path.join(standalone, "server.js"))) {
  console.error("Önce `npm run build` çalıştırın (.next/standalone bulunamadı).");
  process.exit(1);
}

const tmp = path.join(root, ".paket");
const app = path.join(tmp, "app");
rmSync(tmp, { recursive: true, force: true });
cpSync(standalone, app, { recursive: true });
cpSync(path.join(root, ".next", "static"), path.join(app, ".next", "static"), { recursive: true });
cpSync(path.join(root, "public"), path.join(app, "public"), { recursive: true });

// Yerel gizli değerler ve sunucuda işe yaramayan Windows dosyaları pakete girmez.
for (const f of [".env", ".env.local", ".env.production", ".env.cpanel"]) rmSync(path.join(app, f), { force: true });
rmSync(path.join(app, "node_modules", "@img"), { recursive: true, force: true });
const prismaDir = path.join(app, "node_modules", ".prisma", "client");
if (existsSync(prismaDir)) {
  for (const f of readdirSync(prismaDir)) {
    if (f.startsWith("query_engine-windows") || f.includes(".tmp")) rmSync(path.join(prismaDir, f), { force: true });
  }
}

const out = path.join(root, "cpanel-paket.tar.gz");
rmSync(out, { force: true });
// Göreli yollar: Git Bash tar'ı "C:\..." yolunu uzak sunucu adresi sanar.
execFileSync("tar", ["-czf", "cpanel-paket.tar.gz", "-C", ".paket", "app"], { cwd: root, stdio: "inherit" });
rmSync(tmp, { recursive: true, force: true });
console.log(`Hazır: ${out}`);
