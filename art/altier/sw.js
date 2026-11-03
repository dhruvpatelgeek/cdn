/* Runtime image cache for the static Altier reader. */
const cachePrefix = `altier-images:${self.registration.scope}:`;
const cacheName = `${cachePrefix}v1`;
const maxImages = 32;

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.startsWith(cachePrefix) && key !== cacheName).map(key => caches.delete(key)));
  await self.clients.claim();
})()));

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname) || request.destination !== 'image') return;
  event.respondWith((async () => {
    let cache;
    try { cache = await caches.open(cacheName); } catch (_) { /* Fall back to the network. */ }
    if (cache) {
      try { const cached = await cache.match(request); if (cached) return cached; } catch (_) {}
    }
    const response = await fetch(request);
    if (cache && response.ok && response.type !== 'opaque') {
      try {
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        if (keys.length > maxImages) await Promise.all(keys.slice(0, keys.length - maxImages).map(key => cache.delete(key)));
      } catch (_) { /* Storage may be full or unavailable; the response remains usable. */ }
    }
    return response;
  })());
});
