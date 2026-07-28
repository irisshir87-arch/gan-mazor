const CACHE = "gan-mazor-v11-20260728";
const STATIC_ASSETS = [
  "./styles.css", "./admin.css", "./manifest.json",
  "./assets/icon.svg", "./assets/icon-192.png", "./assets/icon-512.png", "./assets/staff-yael.svg", "./assets/staff-michal.svg",
  "./assets/staff-liron.svg", "./assets/staff-shira.svg", "./assets/kid-noam.svg", "./assets/kid-aya.svg",
  "./assets/album-1.svg", "./assets/album-2.svg", "./assets/album-3.svg", "./assets/album-4.svg",
  "./assets/album-5.svg", "./assets/album-6.svg", "./assets/album-7.svg", "./assets/album-8.svg"
];
self.addEventListener("install", event => { self.skipWaiting(); event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC_ASSETS))); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.endsWith("/config.js") || event.request.mode === "navigate" || /\.(html|js)$/.test(url.pathname)) {
    event.respondWith(fetch(event.request, { cache: "no-store" }).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
