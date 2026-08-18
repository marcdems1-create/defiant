/* Openhand service worker.
 *
 * Exists so the site is installable (Chrome requires a SW with a fetch
 * handler) and so a cold launch still has an offline shell.
 *
 * Cache policy is load-bearing for a yield product:
 *   - Never cache /api/* (Transak widget URLs, analytics).
 *   - Never cache HTML as a stand-in for live rates — navigations are
 *     network-first and fall back to /offline.html, not a stale page.
 *   - Cross-origin (RPC, protocol APIs) is not intercepted. Stale APY
 *     must never be shown as if it were live.
 *   - /_next/static/* is content-hashed, so cache-first is safe.
 *
 * Bump CACHE when this file's logic changes so old caches are dropped.
 */
const CACHE = 'oh-shell-v1';
const PRECACHE = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(req));
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(async () => {
        const offline = await caches.match('/offline.html');
        return offline || new Response('Offline', { status: 503, statusText: 'Offline' });
      }),
    );
    return;
  }

  event.respondWith(
    fetch(req).catch(async () => {
      const cached = await caches.match(req);
      return cached || Response.error();
    }),
  );
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && res.ok) {
    const copy = res.clone();
    const cache = await caches.open(CACHE);
    await cache.put(req, copy);
  }
  return res;
}
