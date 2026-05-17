/**
 * DeadTakeover startup optimizer — MUST load before the game bundle.
 * Reduces menu/load hitch without changing game logic.
 */
(function () {
  'use strict';

  /* --- 1. Defer BGM download until first user gesture (saves ~3–40 MB at cold start) --- */
  var audioUnlocked = false;

  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    document.querySelectorAll('audio[data-deferred-preload]').forEach(function (el) {
      var want = el.getAttribute('data-deferred-preload') || 'auto';
      el.removeAttribute('data-deferred-preload');
      el.preload = want;
      if (el.getAttribute('data-deferred-src')) {
        el.src = el.getAttribute('data-deferred-src');
        el.removeAttribute('data-deferred-src');
      }
    });
  }

  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
    document.addEventListener(ev, unlockAudio, { once: true, passive: true, capture: true });
  });

  var desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'preload');
  if (desc && desc.set) {
    var nativeSet = desc.set;
    Object.defineProperty(HTMLMediaElement.prototype, 'preload', {
      get: desc.get,
      set: function (v) {
        if (!audioUnlocked && v === 'auto') {
          this.setAttribute('data-deferred-preload', 'auto');
          nativeSet.call(this, 'none');
          return;
        }
        nativeSet.call(this, v);
      },
      configurable: true,
      enumerable: desc.enumerable,
    });
  }

  /* --- 2. Stagger heavy fetch (GLB/MP3) during first 2s so WebGL init can run --- */
  var deferUntil = Date.now() + 2000;
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      if (!audioUnlocked && Date.now() < deferUntil && /\.(glb|mp3)(\?|$)/i.test(url)) {
        return new Promise(function (resolve, reject) {
          var run = function () {
            origFetch(input, init).then(resolve, reject);
          };
          if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(run, { timeout: 2500 });
          } else {
            setTimeout(run, 400);
          }
        });
      }
      return origFetch(input, init);
    };
  }

  console.log('[startup] DeadTakeover v10 boot optimizer active');
})();
