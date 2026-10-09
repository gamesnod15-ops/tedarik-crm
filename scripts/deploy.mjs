// Tek komutla cPanel'e yayın:  npm run deploy
// Geri alma (bir önceki sürüme dön):  npm run deploy -- --geri-al
//
// Sıra: tip kontrolü -> derleme -> canlı veritabanına migration -> paket -> yükleme -> klasör değişimi -> yeniden başlatma -> kontrol.
// Ayarlar ve gizli değerler .env.cpanel dosyasından okunur (git'e girmez):
//   CPANEL_API_TOKEN (zorunlu), CPANEL_USER, CPANEL_HOST, DATABASE_URL_REMOTE, AUTH_URL
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const env = okuEnv(path.join(root, ".env.cpanel"));
const USER = env.CPANEL_USER || "tusbanak";
const HOST = env.CPANEL_HOST || "mt-xtar.guzelhosting.com";
const TOKEN = env.CPANEL_API_TOKEN;
const SITE = (env.AUTH_URL || "https://tusbacrm.tusbanakis.com").replace(/\/$/, "");
const APP_ROOT = `/home/${USER}/tusbacrm`;
const BASE = `https://${HOST}:2083`;
const PAKET = "cpanel-paket.tar.gz";

if (!TOKEN) hata("CPANEL_API_TOKEN .env.cpanel içinde tanımlı değil (cPanel > Manage API Tokens).");

function okuEnv(file) {
  if (!existsSync(file)) hata(`${file} bulunamadı.`);
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    const deger = m?.[2].trim().replace(/^"(.*)"$/, "$1");
    if (m && deger) out[m[1]] = deger; // boş satır, daha önce yazılmış değeri ezmez
  }
  return out;
}

function hata(msg) {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
}

function adim(msg) {
  console.log(`\n▶ ${msg}`);
}

function calistir(cmd, extraEnv = {}) {
  execSync(cmd, { cwd: root, stdio: "inherit", env: { ...process.env, ...extraEnv } });
}

const auth = { Authorization: `cpanel ${USER}:${TOKEN}` };

async function uapi(modul, fonk, params = {}) {
  const res = await fetch(`${BASE}/execute/${modul}/${fonk}?${new URLSearchParams(params)}`, { headers: auth });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j) throw new Error(`${modul}/${fonk}: HTTP ${res.status}`);
  return j;
}

// Dosya taşıma/silme/açma işlemleri yalnızca eski API2 "Fileman::fileop" ile yapılabiliyor.
async function fileop(op, sourcefiles, destfiles) {
  const params = { cpanel_jsonapi_apiversion: "2", cpanel_jsonapi_user: USER, cpanel_jsonapi_module: "Fileman", cpanel_jsonapi_func: "fileop", op, sourcefiles, doubledecode: "0" };
  if (destfiles) params.destfiles = destfiles;
  const res = await fetch(`${BASE}/json-api/cpanel?${new URLSearchParams(params)}`, { headers: auth });
  const j = await res.json().catch(() => null);
  const sonuc = j?.cpanelresult?.data?.[0];
  if (!res.ok || !sonuc?.result) throw new Error(`fileop ${op} ${sourcefiles}: ${sonuc?.reason || j?.cpanelresult?.error || `HTTP ${res.status}`}`);
  return sonuc;
}

async function varMi(dir, ad) {
  const j = await uapi("Fileman", "list_files", { dir, show_hidden: "1" });
  return (j.data || []).some((f) => f.file === ad);
}

async function sil(yol) {
  const dir = path.posix.dirname(yol);
  if (await varMi(dir, path.posix.basename(yol))) await fileop("unlink", yol);
}

async function yenidenBaslat() {
  // Passenger, uygulama klasöründeki tmp/restart.txt değişince uygulamayı yeniden başlatır.
  const j = await uapi("Fileman", "save_file_content", { dir: `${APP_ROOT}/tmp`, file: "restart.txt", content: new Date().toISOString() });
  if (j.status !== 1) throw new Error(`Yeniden başlatma: ${JSON.stringify(j.errors)}`);
}

async function kontrol(buildId) {
  const bitis = Date.now() + 120_000;
  let son = "";
  while (Date.now() < bitis) {
    try {
      const res = await fetch(`${SITE}/login`, { cache: "no-store" });
      const html = await res.text();
      if (res.ok && (!buildId || html.includes(buildId))) return true;
      son = `HTTP ${res.status}${res.ok ? " (eski sürüm hâlâ yanıt veriyor)" : ""}`;
    } catch (e) {
      son = String(e.message);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.error(`  son durum: ${son}`);
  return false;
}

async function geriAl() {
  adim("Bir önceki sürüme dönülüyor");
  if (!(await varMi(APP_ROOT, "app_onceki"))) hata("Sunucuda önceki sürüm (app_onceki) yok.");
  // Kontrol, yeniden başlatma bitene kadar eski süreçten gelen yanıtı başarı saymasın diye beklenen derleme kimliği okunur.
  const hedef = await uapi("Fileman", "get_file_content", { dir: `${APP_ROOT}/app_onceki/.next`, file: "BUILD_ID" });
  const buildId = String(hedef.data?.content ?? "").trim() || null;
  await sil(`${APP_ROOT}/app_gecici`);
  await fileop("rename", `${APP_ROOT}/app`, `${APP_ROOT}/app_gecici`);
  await fileop("rename", `${APP_ROOT}/app_onceki`, `${APP_ROOT}/app`);
  await fileop("rename", `${APP_ROOT}/app_gecici`, `${APP_ROOT}/app_onceki`);
  await yenidenBaslat();
  adim("Site kontrol ediliyor");
  if (!(await kontrol(buildId))) hata("Önceki sürüm 2 dakikada yanıt vermedi. Log: ~/logs/tusbacrm.log");
  console.log(`\n✔ Önceki sürüme dönüldü: ${SITE}  (tekrar çalıştırırsanız yeni sürüme geri geçer)`);
  console.log("  Not: Veritabanı migration'ları geri alınmaz.");
}

async function yayinla() {
  const t0 = Date.now();
  const commit = execSync("git rev-parse --short HEAD", { cwd: root }).toString().trim();
  if (execSync("git status --porcelain", { cwd: root }).toString().trim()) {
    console.warn("⚠ Commit edilmemiş değişiklikler var; onlar da yayına girecek.");
  }
  console.log(`Yayın: ${commit} -> ${SITE}`);

  adim("Bağlantı kontrolü (cPanel API)");
  const bilgi = await uapi("Mysql", "get_server_information").catch((e) => hata(`cPanel API'ye bağlanılamadı: ${e.message}`));
  if (bilgi.status !== 1) hata(`cPanel API anahtarı reddedildi: ${JSON.stringify(bilgi.errors)}`);

  adim("Tip kontrolü");
  calistir("npx tsc --noEmit");

  adim("Derleme");
  calistir("npm run build", { DATABASE_URL: env.DATABASE_URL_REMOTE || process.env.DATABASE_URL || "" });
  const buildId = readFileSync(path.join(root, ".next", "BUILD_ID"), "utf8").trim();

  if (env.DATABASE_URL_REMOTE) {
    adim("Veritabanı migration'ları");
    // Uzak veritabanı erişimi IP'ye bağlı: bu bilgisayarın güncel IP'si izinli listede değilse eklenir.
    try {
      const ip = (await (await fetch("https://api.ipify.org")).text()).trim();
      if (/^[\d.]+$/.test(ip)) await uapi("Mysql", "add_host", { host: ip }); // zaten varsa sessizce hata döner
    } catch {
      /* IP alınamazsa mevcut izinlerle denenir */
    }
    calistir("npx prisma migrate deploy", { DATABASE_URL: env.DATABASE_URL_REMOTE });
  } else {
    console.warn("⚠ DATABASE_URL_REMOTE yok; migration adımı atlandı.");
  }

  adim("Paket");
  calistir("node scripts/cpanel-paket.mjs");

  adim("Yükleme");
  const form = new FormData();
  form.append("dir", APP_ROOT);
  form.append("overwrite", "1");
  form.append("file-1", new Blob([readFileSync(path.join(root, PAKET))]), PAKET);
  const up = await fetch(`${BASE}/execute/Fileman/upload_files`, { method: "POST", headers: auth, body: form });
  const upJ = await up.json().catch(() => null);
  if (!up.ok || upJ?.status !== 1 || upJ?.data?.failed) hata(`Yükleme başarısız: ${JSON.stringify(upJ?.errors || upJ?.data || up.status)}`);

  adim("Sunucuda açma ve sürüm değişimi");
  const yeni = `${APP_ROOT}/_yeni`;
  await sil(yeni);
  const mkdir = { cpanel_jsonapi_apiversion: "2", cpanel_jsonapi_user: USER, cpanel_jsonapi_module: "Fileman", cpanel_jsonapi_func: "mkdir", path: APP_ROOT, name: "_yeni" };
  await fetch(`${BASE}/json-api/cpanel?${new URLSearchParams(mkdir)}`, { headers: auth });
  await fileop("extract", `${APP_ROOT}/${PAKET}`, yeni);
  if (!(await varMi(yeni, "app"))) hata("Paket açılamadı (_yeni/app yok). Canlı sürüme dokunulmadı.");
  await sil(`${APP_ROOT}/app_onceki`);
  await fileop("rename", `${APP_ROOT}/app`, `${APP_ROOT}/app_onceki`);
  await fileop("rename", `${yeni}/app`, `${APP_ROOT}/app`);
  await sil(yeni);
  await sil(`${APP_ROOT}/${PAKET}`);

  adim("Yeniden başlatma");
  await yenidenBaslat();

  adim("Site kontrol ediliyor");
  if (!(await kontrol(buildId))) {
    hata(`Yeni sürüm 2 dakikada yanıt vermedi. Log: ~/logs/tusbacrm.log — geri almak için: npm run deploy -- --geri-al`);
  }
  console.log(`\n✔ Yayında: ${SITE}  (${commit}, ${Math.round((Date.now() - t0) / 1000)} sn)`);
}

try {
  if (process.argv.includes("--geri-al")) await geriAl();
  else await yayinla();
} catch (e) {
  hata(e.message);
}
