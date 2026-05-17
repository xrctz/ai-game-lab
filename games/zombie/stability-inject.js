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
      'position:fixed;top:12px;left:12px;z-index:99999;' +
      'background:linear-gradient(165deg,rgba(8,14,32,.92),rgba(4,6,16,.95));' +
      'backdrop-filter:blur(12px);' +
      'color:#eaf0ff;font:11px "JetBrains Mono",monospace;' +
      'padding:14px 16px;border-radius:14px;pointer-events:none;display:none;' +
      'border:1px solid rgba(53,231,255,.18);min-width:300px;line-height:1.8;white-space:pre;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.4),0 0 20px rgba(53,231,255,.04)';
    document.body.appendChild(perfOverlay);
  }

  function updateOverlay() {
    if (!overlayVisible || !perfOverlay) return;
    var snap = window.__zombiePerfSnapshot ? window.__zombiePerfSnapshot() : null;
    var stream = window.__zombieGetStreamingStats ? window.__zombieGetStreamingStats() : null;

    var fpsColor = snap && snap.fps >= 50 ? '#5dff96' : snap && snap.fps >= 30 ? '#ffb86c' : '#ff4d6a';
    var ctxColor = contextLost ? '#ff4d6a' : '#5dff96';

    perfOverlay.innerHTML =
      '<div style="font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:.1em;color:#35e7ff;margin-bottom:8px;text-transform:uppercase">Debug Overlay</div>' +
      '<div>FPS: <span style="color:' + fpsColor + ';font-weight:700">' + (snap ? snap.fps : '...') + '</span>' +
      '  avg: <span style="color:#8a96be">' + (snap ? snap.avgMs.toFixed(1) + 'ms' : '...') + '</span>' +
      '  scale: <span style="color:#8a96be">' + (snap ? snap.ratio.toFixed(2) : '...') + '</span></div>' +
      '<div>quality: <span style="color:#35e7ff">' + (snap ? snap.quality : '...') + '</span>' +
      '  ctx: <span style="color:' + ctxColor + ';font-weight:700">' + (contextLost ? 'LOST' : 'OK') + '</span></div>' +
      '<div style="border-top:1px solid rgba(255,255,255,.06);padding-top:6px;margin-top:4px">listeners: <span style="color:#ffb86c">' + LISTENERS.length + '</span>' +
      '  timers: <span style="color:#ffb86c">' + (INTERVALS.size + TIMEOUTS.size) + '</span></div>' +
      (stream ? '<div>stream: <span style="color:#8a96be">pending ' + (stream.pending||0) + ' · built ' + (stream.built||0) + '</span>' +
        '  hitches: <span style="color:' + (stream.hitches > 5 ? '#ff4d6a' : '#8a96be') + '">' + (stream.hitches||0) + '</span></div>' : '') +
      '<div style="border-top:1px solid rgba(255,255,255,.06);padding-top:6px;margin-top:4px;font-size:10px;color:#5a6588">Press ` to toggle · O minimize director</div>';
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
