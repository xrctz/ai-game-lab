/**
 * DeadTakeover stability helpers.
 * Lightweight cleanup + context-loss handling + optional debug overlay.
 */
(function () {
  'use strict';

  var LISTENERS = [];
  var INTERVALS = new Set();
  var TIMEOUTS = new Set();
  var overlayVisible = false;
  var perfOverlay = null;
  var contextLost = false;

  var origAdd = EventTarget.prototype.addEventListener;
  var origRemove = EventTarget.prototype.removeEventListener;
  var origSetInterval = window.setInterval.bind(window);
  var origClearInterval = window.clearInterval.bind(window);
  var origSetTimeout = window.setTimeout.bind(window);
  var origClearTimeout = window.clearTimeout.bind(window);

  EventTarget.prototype.addEventListener = function (type, handler, opts) {
    if (typeof handler === 'function' || (handler && typeof handler.handleEvent === 'function')) {
      LISTENERS.push({ target: this, type: type, handler: handler, opts: opts });
    }
    return origAdd.call(this, type, handler, opts);
  };

  EventTarget.prototype.removeEventListener = function (type, handler, opts) {
    for (var i = LISTENERS.length - 1; i >= 0; i--) {
      var l = LISTENERS[i];
      if (l.target === this && l.type === type && l.handler === handler) {
        LISTENERS.splice(i, 1);
        break;
      }
    }
    return origRemove.call(this, type, handler, opts);
  };

  window.setInterval = function (fn, ms) {
    var id = origSetInterval.apply(null, arguments);
    INTERVALS.add(id);
    return id;
  };

  window.clearInterval = function (id) {
    INTERVALS.delete(id);
    return origClearInterval(id);
  };

  window.setTimeout = function (fn, ms) {
    var args = Array.prototype.slice.call(arguments, 2);
    var id = origSetTimeout(function () {
      TIMEOUTS.delete(id);
      if (typeof fn === 'function') return fn.apply(this, args);
    }, ms);
    TIMEOUTS.add(id);
    return id;
  };

  window.clearTimeout = function (id) {
    TIMEOUTS.delete(id);
    return origClearTimeout(id);
  };

  function attachContextLossHandler(canvas) {
    if (!canvas || canvas.__stabWatched) return;
    canvas.__stabWatched = true;
    canvas.addEventListener('webglcontextlost', function (e) {
      contextLost = true;
      e.preventDefault();
      console.warn('[stability] WebGL context lost');
    });
    canvas.addEventListener('webglcontextrestored', function () {
      contextLost = false;
      console.warn('[stability] WebGL context restored');
    });
  }

  function findAndWatchCanvas() {
    var canvas = document.getElementById('game') || document.querySelector('canvas');
    if (canvas) return attachContextLossHandler(canvas);
    var obs = new MutationObserver(function () {
      var c = document.getElementById('game') || document.querySelector('canvas');
      if (c) {
        attachContextLossHandler(c);
        obs.disconnect();
      }
    });
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
    origSetTimeout(function () { obs.disconnect(); }, 15000);
  }

  function ensureOverlay() {
    if (perfOverlay) return;
    perfOverlay = document.createElement('div');
    perfOverlay.id = 'stab-perf-overlay';
    perfOverlay.style.cssText =
      'position:fixed;top:8px;left:8px;z-index:99999;' +
      'background:rgba(0,0,0,0.85);color:#0f0;font:11px monospace;' +
      'padding:8px 10px;border-radius:6px;pointer-events:none;display:none;' +
      'border:1px solid rgba(0,255,0,0.3);max-width:340px;line-height:1.5;white-space:pre';
    document.body.appendChild(perfOverlay);
  }

  function updateOverlay() {
    if (!overlayVisible || !perfOverlay) return;
    var snap = window.__zombiePerfSnapshot ? window.__zombiePerfSnapshot() : null;
    perfOverlay.textContent =
      'FPS: ' + (snap ? snap.fps : '...') +
      '  avg: ' + (snap ? snap.avgMs.toFixed(1) + 'ms' : '...') +
      '  scale: ' + (snap ? snap.ratio.toFixed(2) : '...') +
      '\nquality: ' + (snap ? snap.quality : '...') +
      '  listeners: ' + LISTENERS.length +
      '  timers: ' + (INTERVALS.size + TIMEOUTS.size) +
      '  ctx: ' + (contextLost ? 'LOST' : 'OK');
  }

  window.addEventListener('keydown', function (e) {
    if (e.key === '`' || e.key === '~' || e.code === 'Backquote') {
      e.preventDefault();
      overlayVisible = !overlayVisible;
      ensureOverlay();
      perfOverlay.style.display = overlayVisible ? 'block' : 'none';
      updateOverlay();
    }
  });
  origSetInterval(updateOverlay, 500);

  window.__zombieCleanup = function () {
    for (var i = LISTENERS.length - 1; i >= 0; i--) {
      try { origRemove.call(LISTENERS[i].target, LISTENERS[i].type, LISTENERS[i].handler, LISTENERS[i].opts); } catch (e) {}
    }
    LISTENERS.length = 0;

    INTERVALS.forEach(function (id) { try { origClearInterval(id); } catch (e) {} });
    INTERVALS.clear();
    TIMEOUTS.forEach(function (id) { try { origClearTimeout(id); } catch (e) {} });
    TIMEOUTS.clear();

    contextLost = false;
    if (perfOverlay) perfOverlay.textContent = '';
    console.log('[stability] Cleanup complete');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', findAndWatchCanvas);
  } else {
    findAndWatchCanvas();
  }

  window.addEventListener('beforeunload', window.__zombieCleanup);
})();
