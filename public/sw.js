// Tuşba Nakış service worker: uygulamanın telefona yüklenebilmesini ve hızlı açılmasını sağlar.
// Veriler (sayfalar, API) her zaman sunucudan gelir; yalnızca değişmeyen dosyalar (JS/CSS/simge/yazı tipi) önbelleğe alınır.
// İnternet yokken sayfa açılmaya çalışılırsa kısa bir "bağlantı yok" ekranı gösterilir.

// Sürüm değişince eski önbellek (eski logolu simgeler dahil) silinir.
const SURUM = "tusba-v1";
const CEVRIMDISI = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tuşba Nakış</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;text-align:center;padding:24px}
button{margin-top:16px;padding:10px 18px;border:0;border-radius:8px;background:#dd1829;color:#fff;font-size:15px;font-weight:600}</style></head>
<body><div><h1 style="font-size:20px;margin:0 0 8px">İnternet bağlantısı yok</h1><p style="margin:0;color:#64748b">Bağlantı gelince tekrar deneyin.</p>
<button onclick="location.reload()">Tekrar dene</button></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SURUM).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Sayfa açılışları: her zaman ağdan (güncel veri); ağ yoksa çevrimdışı ekranı.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => new Response(CEVRIMDISI, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
    return;
  }

  // Değişmeyen dosyalar: önce önbellek (adları içeriğe göre değiştiği için güvenli).
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(svg|png|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(SURUM).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
  }
  // Diğer her şey (API, sunucu verisi) dokunulmadan ağa gider.
});
