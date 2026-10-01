// Retire worker for scope "/".
//
// Until the landing page took over the site root, the app registered its
// service worker at /service-worker.js (scope "/"). The app now lives at
// /app/ and registers /app/service-worker.js there. Browsers re-fetch this
// URL on any navigation inside the old scope, get this file, and run it:
// it takes over at once, unregisters itself and reloads the windows it was
// controlling, so the landing is never served by the old app worker and
// /app/ gets its own worker on the next load.
//
// It deliberately deletes no caches: the /app/ worker's activate step
// already removes every cache key that isn't its own, and deleting here
// could race the new app cache being filled.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.registration.unregister()
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => Promise.all(clients.map((c) => c.navigate(c.url).catch(() => {}))))
      .catch(() => {})
  );
});
