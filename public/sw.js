/* global self */
const CACHE = "jibondrop-offline-v3";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add("/offline.html")),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("jibondrop-offline-") && key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});
// Never cache donor details, API responses, authenticated pages, or Next.js assets.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate")
    return;
  event.respondWith(
    fetch(event.request).catch(async () => {
      const offline = await caches.match("/offline.html");
      return (
        offline ||
        new Response("You are offline. Reconnect and try again.", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        })
      );
    }),
  );
});
