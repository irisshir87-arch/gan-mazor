const CACHE = "gan-mazor-v2-20260726-1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./state.js",
  "./admin.html",
  "./admin.css",
  "./admin.js",
  "./login.html",
  "./manifest.json",
  "./assets/icon.svg",
  "./assets/staff-yael.svg",
  "./assets/staff-michal.svg",
  "./assets/staff-liron.svg",
  "./assets/staff-shira.svg",
  "./assets/kid-noam.svg",
  "./assets/kid-aya.svg",
  "./assets/album-1.svg",
  "./assets/album-2.svg",
  "./assets/album-3.svg",
  "./assets/album-4.svg",
  "./assets/album-5.svg",
  "./assets/album-6.svg",
  "./assets/album-7.svg",
  "./assets/album-8.svg"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // config.js must always come from the network so connection changes are immediate.
  if (url.pathname.endsWith("/config.js")) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .catch(() => new Response(
          'window.GAN_MAZOR_CONFIG={SUPABASE_URL:"",SUPABASE_ANON_KEY:"",KINDERGARTEN_SLUG:"gan-mazor"};',
          { headers: { "Content-Type": "application/javascript; charset=utf-8" } }
        ))
    );
    return;
  }

  const isRuntimeFile =
    event.request.mode === "navigate" ||
    /\.(html|js)$/.test(url.pathname);

  if (isRuntimeFile) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
