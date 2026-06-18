const CACHE_NAME = 'icp-mint-studio-v1';
const OFFLINE_URL = '/offline.html';

// Static assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Patterns that should never be cached (ICP actor/canister calls)
const NEVER_CACHE_PATTERNS = [
  /\/api\//,
  /ic0\.app/,
  /icp-api\.io/,
  /\.raw\.ic0\.app/,
  /localhost:4943/,
];

function isICPCall(url) {
  return NEVER_CACHE_PATTERNS.some((pattern) => pattern.test(url));
}

// Install: pre-cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch: cache-first for static assets, network-first for ICP calls
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Never cache ICP actor/canister calls
  if (isICPCall(url)) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-first for navigation requests (always get fresh HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() =>
          caches.match(OFFLINE_URL).then((cached) => cached || new Response('Offline', { status: 503 })),
        ),
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        });
      }),
    );
    return;
  }

  // Default: network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request)),
  );
});

// Message: listen for SKIP_WAITING to allow manual updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
