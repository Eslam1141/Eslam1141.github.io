const CACHE_NAME = "gym-plan-v19";
const ASSETS = [
  "./index.html",
  "./styles.css",
  "./app.js",
  "./ui.js",
  "./coach.js",
  "./sync.js",
  "./config.js",
  "./manifest.json",
  "./icons/logo.svg",
  "./icons/coach.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  // Never intercept API or Google Identity traffic — sync freshness and auth
  // are handled in sync.js, and these must always hit the network.
  if (url.pathname.startsWith("/api/") ||
      url.hostname.endsWith("googleapis.com") ||
      url.hostname === "accounts.google.com") {
    return;
  }

  // Network-first: a fresh deploy must show up on the very next load, not one
  // refresh later. The old cache-first-with-background-update strategy served
  // last visit's stale app.js/coach.js immediately every time, which is why a
  // shipped fix could look like it "didn't happen" until a second reload.
  // Cache is now purely the offline fallback.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
