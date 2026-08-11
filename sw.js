// Bump this whenever index.html changes meaningfully — old caches are dropped on activate,
// so a stale shell never lingers past one page load.
const CACHE_VERSION = "v1";
const CACHE_NAME = `vault-showdown-${CACHE_VERSION}`;
const SHELL_FILES = ["./", "./index.html", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

// Stale-while-revalidate, and only for same-origin GETs (the app shell itself). Bungie's API,
// Google Fonts, and the destiny-icons CDN always go straight to network unintercepted — caching
// an inventory response here would mean showing stale vault/character state, which is worse than
// no offline support at all.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isShellRequest = event.request.method === "GET" && url.origin === self.location.origin;
  if (!isShellRequest) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        const network = fetch(event.request)
          .then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
