/**
 * AI Game Lab — Service Worker
 * Cache-first for versioned assets, stale-while-revalidate for HTML.
 * Cuts subsequent page loads from ~100MB download to near-zero.
 */
const CACHE_HUB = 'ai-game-lab-hub-v2';
const CACHE_GAMES = 'ai-game-lab-games-v2';

// Shell assets that make the hub work offline
const HUB_SHELL = [
  '/ai-game-lab/',
  '/ai-game-lab/index.html',
  '/ai-game-lab/styles.css',
  '/ai-game-lab/script.js',
  '/ai-game-lab/showcase/',
  '/ai-game-lab/showcase/index.html',
  '/ai-game-lab/play/',
  '/ai-game-lab/play/index.html',
  '/ai-game-lab/story/',
  '/ai-game-lab/story/index.html',
  '/ai-game-lab/showcase/brand-mark.svg',
  '/ai-game-lab/showcase/favicon.svg',
  '/ai-game-lab/showcase/manifest.json'
];

// Install: pre-cache the hub shell so the landing page loads instantly
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_HUB).then(function (cache) {
      return cache.addAll(HUB_SHELL).catch(function () { /* offline or partial OK */ });
    }).then(function () { return self.skipWaiting(); })
  );
});

// Activate: clean old caches
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_HUB && k !== CACHE_GAMES; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// Fetch: cache-first for game assets, network-first for HTML
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);

  // Skip non-GET, chrome-extension, etc.
  if (e.request.method !== 'GET') return;

  // Pass through external fonts / analytics
  if (url.origin !== self.location.origin) return;

  // HTML pages: network first (so updates propagate), fallback to cache
  if (e.request.destination === 'document' || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request).then(function (response) {
        var copy = response.clone();
        caches.open(CACHE_HUB).then(function (cache) { cache.put(e.request, copy); });
        return response;
      }).catch(function () {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Everything else (JS, CSS, images, models, audio, fonts): cache first
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) {
        // Background revalidate
        fetch(e.request).then(function (response) {
          if (response.ok) {
            caches.open(CACHE_GAMES).then(function (cache) { cache.put(e.request, response); });
          }
        }).catch(function () {});
        return cached;
      }
      return fetch(e.request).then(function (response) {
        if (!response.ok) return response;
        var copy = response.clone();
        caches.open(CACHE_GAMES).then(function (cache) { cache.put(e.request, copy); });
        return response;
      });
    })
  );
});
