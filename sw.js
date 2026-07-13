/**
 * AI Game Lab v22-july — Service Worker
 * Hub HTML/CSS/JS: network-only (never serve stale hub shell).
 * Game HTML documents: network-first (always pick up rebuilt bundle refs).
 * Game static assets (hashed JS/CSS, models, media): cache-first w/ refresh.
 */
const BUILD = '25-motion';
const CACHE_HUB = 'ai-game-lab-hub-v25-motion';
const CACHE_GAMES = 'ai-game-lab-games-v25-motion';
const HUB_STYLE = '/ai-game-lab/styles.css?v=' + BUILD;
const HUB_SCRIPT = '/ai-game-lab/script.js?v=' + BUILD;

function isHubAsset(url) {
  return /\/styles\.css$/.test(url.pathname) || /\/script\.js$/.test(url.pathname);
}

function isHubDocument(url, request) {
  return request.destination === 'document' || url.pathname.endsWith('/');
}

// Game index/HTML files must never be served stale: a rebuilt game points its
// index.html at a new hashed bundle, so a cached index.html would load a dead
// bundle. Always try network first for these and fall back to cache offline.
function isGameDocument(url, request) {
  if (url.pathname.indexOf('/games/') === -1) return false;
  return request.destination === 'iframe' ||
    request.destination === 'document' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/');
}

function networkOnly(request) {
  return fetch(request, { cache: 'no-store' });
}

function networkFirst(request) {
  return fetch(request).then(function (response) {
    if (response && response.ok) {
      var copy = response.clone();
      caches.open(CACHE_GAMES).then(function (cache) { cache.put(request, copy); });
    }
    return response;
  }).catch(function () {
    return caches.match(request);
  });
}

function purgeLegacyHubEntries() {
  return caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (key) {
      if (key.indexOf('ai-game-lab') !== 0) return Promise.resolve();
      return caches.open(key).then(function (cache) {
        return cache.keys().then(function (requests) {
          return Promise.all(requests.map(function (req) {
            var path = new URL(req.url).pathname;
            if (/\/styles\.css$/.test(path) || /\/script\.js$/.test(path)) {
              var q = new URL(req.url).search;
              if (q.indexOf(BUILD) === -1) return cache.delete(req);
            }
            if (path.endsWith('.html') || path.endsWith('/')) return cache.delete(req);
            return Promise.resolve();
          }));
        });
      });
    }));
  });
}

self.addEventListener('install', function (e) {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_HUB && k !== CACHE_GAMES; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(purgeLegacyHubEntries).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  if (isHubDocument(url, e.request) || isHubAsset(url)) {
    e.respondWith(networkOnly(e.request));
    return;
  }

  if (isGameDocument(url, e.request)) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  e.respondWith(caches.match(e.request).then(function (cached) {
    if (cached) {
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
  }));
});
