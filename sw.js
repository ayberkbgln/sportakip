/* Offline cache — uygulama internetsiz de açılsın diye.
   CACHE adını HER dağıtımda artır, yoksa kullanıcı eski sürümde takılı kalır. */
const CACHE = "plan-v4";
const DOSYALAR = [
  "./", "./index.html", "./stil.css", "./veri.js", "./besinler.js", "./app.js",
  "./manifest.json", "./icon-180.png", "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(DOSYALAR)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      const kopya = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, kopya)).catch(() => {});
      return r;
    }).catch(() => caches.match("./index.html")))
  );
});
