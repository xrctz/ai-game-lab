/**
 * AI Game Lab v14-kawaii — Service Worker
 * Hub HTML/CSS/JS: network-only (no stale blue theme from cache).
 * Game assets: cache-first with background refresh.
 */
const BUILD = '15-kawaii';
const CACHE_HUB = 'ai-game-lab-hub-v14-kawaii';
const CACHE_GAMES = 'ai-game-lab-games-v14-kawaii';
const HUB_STYLE = '/ai-game-lab/styles.css?v=' + BUILD;
const HUB_SCRIPT = '/ai-game-lab/script.js?v=' + BUILD;
const HUB_SHELL = [
  '/ai-game-lab/',
  '/ai-game-lab/index.html',
  HUB_STYLE,
  HUB_SCRIPT,
  '/ai-game-lab/manifest.json',
  '/ai-game-lab/showcase/',
  '/ai-game-lab/showcase/index.html',
  '/ai-game-lab/play/',
  '/ai-game-lab/play/index.html',
  '/ai-game-lab/story/',
  '/ai-game-lab/story/index.html',
  '/ai-game-lab/showcase/updates/',
  '/ai-game-lab/showcase/updates/index.html',
  '/ai-game-lab/mindcraft-info.html',
  '/ai-game-lab/showcase/brand-mark.svg?v=12-kawaii',
  '/ai-game-lab/showcase/favicon.svg?v=12-kawaii'
];

function isHubAsset(url) {
  return /\/styles\.css$/.test(url.pathname) || /\/script\.js$/.test(url.pathname);
}

function isHubDocument(url, request) {
  return request.destination === 'document' || url.pathname.endsWith('/');
}

function networkOnly(request) {
  return fetch(request, { cache: 'no-store' });
}

function networkFirstDoc(request) {
  return fetch(request, { cache: 'no-store' }).then(function (response) {
    if (response && response.ok) {
      var copy = response.clone();
      caches.open(CACHE_HUB).then(function (cache) { cache.put(request, copy); });
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
            return Promise.resolve();
          }));
        });
      });
    }));
  });
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_HUB).then(function (cache) {
      return cache.addAll(HUB_SHELL).catch(function () {});
    }).then(function () { return self.skipWaiting(); })
  );
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

  if (isHubDocument(url, e.request)) {
    e.respondWith(networkFirstDoc(e.request));
    return;
  }

  if (isHubAsset(url)) {
    e.respondWith(networkOnly(e.request));
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
