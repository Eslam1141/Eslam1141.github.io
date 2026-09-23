// The hash suffix is substituted at Docker build time (see Dockerfile) with
// a sha256 of the actual ASSETS file contents below, so CACHE_NAME changes
// automatically whenever a precached asset's content changes — and stays
// identical across rebuilds when nothing changed, so browsers don't see
// needless churn. This replaces the old hand-maintained "athlex-vNN" bumps
// (a recurring source of "stale content after deploy" bugs when someone
// forgot to bump the literal). The activate handler below already deletes
// any cache key that isn't the current CACHE_NAME, so a changed hash cleans
// up the old cache for free.
//
// "__CACHE_HASH__" is also the literal fallback: if this file is served
// unprocessed (e.g. local testing via `python -m http.server`, no Docker
// build), CACHE_NAME is just this fixed string — still syntactically valid
// and fully functional, just not content-addressed.
const CACHE_NAME = "athlex-__CACHE_HASH__";
const ASSETS = [
  "./index.html",
  "./styles.css",
  "./app.js",
  "./ui.js",
  "./coach.js",
  "./chat.js",
  "./sync.js",
  "./calendar.js",
  "./workout-builder.js",
  "./hero-video.js",
  "./metallic-button.js",
  "./config.js",
  "./manifest.json",
  "./icons/logo.svg",
  "./icons/coach.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
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

// ---- missed-workout push notifications ----
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const title = data.title || "Gym reminder";
  const options = {
    body: data.body || "",
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    data: { url: data.url || "./" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

// Browser-level re-subscribe only (e.g. the push service rotated the
// subscription). No backend POST here — the service worker has no auth
// token; the page reconciles the new endpoint with gym-be on next load
// (see calendar.js reconcilePushSubscription), through the normal
// authenticated path, same as every other write in this app.
self.addEventListener("pushsubscriptionchange", (event) => {
  const oldOptions = event.oldSubscription && event.oldSubscription.options;
  event.waitUntil(
    self.registration.pushManager
      .subscribe(oldOptions || { userVisibleOnly: true })
      .catch(() => {})
  );
});
