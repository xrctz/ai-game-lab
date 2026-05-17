/**
 * AI Game Lab v12-kawaii — Service Worker
 * HTML uses network-first so GitHub Pages updates show quickly.
 * Static assets use cache-first with background refresh.
 */
const CACHE_HUB = 'ai-game-lab-hub-v12-kawaii';
const CACHE_GAMES = 'ai-game-lab-games-v12-kawaii';
const HUB_SHELL = [
  '/ai-game-lab/',
  '/ai-game-lab/index.html',
  '/ai-game-lab/styles.css?v=13-kawaii',
  '/ai-game-lab/script.js?v=13-kawaii',
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
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE_HUB).then(function(cache){ return cache.addAll(HUB_SHELL).catch(function(){}); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE_HUB && k !== CACHE_GAMES; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (e.request.destination === 'document' || url.pathname.endsWith('/')) {
    e.respondWith(fetch(e.request).then(function(response){
      var copy = response.clone(); caches.open(CACHE_HUB).then(function(cache){ cache.put(e.request, copy); }); return response;
    }).catch(function(){ return caches.match(e.request); }));
    return;
  }
  e.respondWith(caches.match(e.request).then(function(cached){
    if (cached) {
      fetch(e.request).then(function(response){ if (response.ok) caches.open(CACHE_GAMES).then(function(cache){ cache.put(e.request, response); }); }).catch(function(){});
      return cached;
    }
    return fetch(e.request).then(function(response){
      if (!response.ok) return response;
      var copy = response.clone(); caches.open(CACHE_GAMES).then(function(cache){ cache.put(e.request, copy); }); return response;
    });
  }));
});
