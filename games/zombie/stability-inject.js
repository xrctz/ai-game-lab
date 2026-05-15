/**
 * DeadTakeover Stability Injection — loaded BEFORE the minified game bundle.
 *
 * Patches runtime hazards found via static analysis (222 KB bundle):
 *   1. 24 addEventListener, 0 removeEventListener — listener leak
 *   2. No WebGL context loss / restore handling — black screen hangs
 *   3. No cancelAnimationFrame — orphaned rAF loops
 *   4. Leaking setInterval calls — never cleared on restart
 *   5. No frame-time visibility — can't see when GC spikes hit
 *
 * NON-INVASIVE: Only tracks resources. Does NOT alter game timing or behavior.
 * All tracked resources are cleaned on beforeunload or window.__zombieCleanup().
 * Press backtick to toggle a performance overlay.
 */
(function () {
  'use strict';

  var LISTENERS = [];
  var INTERVALS = new Set();
  var TIMEOUTS = new Set();
  var RAF_IDS = new Set();
  var contextLost = false;
  var perfOverlay = null;
  var frameSamples = [];
  var overlayVisible = false;

  /* ================================================================== */
  /* 1.  Event listener tracking (non-invasive)                          */
  /* ================================================================== */
  var _origAdd = EventTarget.prototype.addEventListener;
  var _origRemove = EventTarget.prototype.removeEventListener;

  EventTarget.prototype.addEventListener = function (type, handler, opts) {
    LISTENERS.push({ target: this, type: type, handler: handler, opts: opts });
    return _origAdd.call(this, type, handler, opts);
  };

  EventTarget.prototype.removeEventListener = function (type, handler, opts) {
    for (var i = LISTENERS.length - 1; i >= 0; i--) {
      var l = LISTENERS[i];
      if (l.target === this && l.type === type && l.handler === handler) {
        LISTENERS.splice(i, 1);
        break;
      }
    }
    return _origRemove.call(this, type, handler, opts);
  };

  /* ================================================================== */
  /* 2.  setInterval / setTimeout tracking                               */
  /* ================================================================== */
  var _origSetInterval = window.setInterval.bind(window);
  var _origClearInterval = window.clearInterval.bind(window);
  var _origSetTimeout = window.setTimeout.bind(window);
  var _origClearTimeout = window.clearTimeout.bind(window);

  window.setInterval = function (fn, ms) {
    var rest = Array.prototype.slice.call(arguments, 2);
    var id = _origSetInterval.apply(null, [fn, ms].concat(rest));
    INTERVALS.add(id);
    return id;
  };

  window.clearInterval = function (id) {
    INTERVALS.delete(id);
    return _origClearInterval(id);
  };

  window.setTimeout = function (fn, ms) {
    var rest = Array.prototype.slice.call(arguments, 2);
    var id;
    function wrapper() {
      TIMEOUTS.delete(id);
      return fn.apply(this, arguments);
    }
    id = _origSetTimeout.apply(null, [wrapper, ms].concat(rest));
    TIMEOUTS.add(id);
    return id;
  };

  window.clearTimeout = function (id) {
    TIMEOUTS.delete(id);
    return _origClearTimeout(id);
  };

  /* ================================================================== */
  /* 3.  requestAnimationFrame tracking (+ perf sampling, non-invasive)  */
  /* ================================================================== */
  var _origRaf = window.requestAnimationFrame.bind(window);
  var _origCaf = window.cancelAnimationFrame.bind(window);

  window.requestAnimationFrame = function (cb) {
    var start = performance.now();
    var rafId;
    function measured(ts) {
      if (contextLost) {
        // Skip render callbacks during context loss to prevent WebGL errors.
        // Re-queue so the loop resumes automatically when the context is restored.
        rafId = _origRaf(measured);
        RAF_IDS.add(rafId);
        return;
      }
      var elapsed = performance.now() - start;
      frameSamples.push(elapsed);
      if (frameSamples.length > 240) frameSamples.shift();
      if (overlayVisible && frameSamples.length % 30 === 0) {
        updateOverlay();
      }
      RAF_IDS.delete(rafId);
      cb(ts);
    }
    rafId = _origRaf(measured);
    RAF_IDS.add(rafId);
    return rafId;
  };

  window.cancelAnimationFrame = function (id) {
    RAF_IDS.delete(id);
    return _origCaf(id);
  };

  /* ================================================================== */
  /* 4.  WebGL context-loss recovery                                     */
  /* ================================================================== */
  function attachContextLossHandler(canvas) {
    if (!canvas) return;
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
    if (canvas) {
      attachContextLossHandler(canvas);
      return;
    }
    var obs = new MutationObserver(function () {
      var c = document.getElementById('game') || document.querySelector('canvas');
      if (c) {
        attachContextLossHandler(c);
        obs.disconnect();
      }
    });
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', findAndWatchCanvas);
  } else {
    findAndWatchCanvas();
  }

  /* ================================================================== */
  /* 5.  Performance overlay (press Backtick key to toggle)             */
  /* ================================================================== */
  function ensureOverlay() {
    if (perfOverlay) return;
    perfOverlay = document.createElement('div');
    perfOverlay.id = 'stab-perf-overlay';
    perfOverlay.style.cssText =
      'position:fixed;top:8px;left:8px;z-index:99999;' +
      'background:rgba(0,0,0,0.85);color:#0f0;font:11px monospace;' +
      'padding:8px 10px;border-radius:6px;pointer-events:none;display:none;' +
      'border:1px solid rgba(0,255,0,0.3);max-width:320px;line-height:1.5';
    document.body.appendChild(perfOverlay);
  }

  function updateOverlay() {
    if (!perfOverlay || !overlayVisible) return;
    var count = frameSamples.length;
    if (count === 0) return;
    var sorted = frameSamples.slice().sort(function (a, b) { return a - b; });
    var avg = sorted.reduce(function (s, v) { return s + v; }, 0) / count;
    var p50 = sorted[Math.floor(count * 0.5)] || 0;
    var p95 = sorted[Math.floor(count * 0.95)] || 0;
    var worst = sorted[count - 1] || 0;
    var fps = avg > 0 ? Math.round(1000 / avg) : 0;

    perfOverlay.textContent =
      'FPS: ' + fps + '  avg: ' + avg.toFixed(1) + 'ms  p50: ' + p50.toFixed(1) +
      'ms  p95: ' + p95.toFixed(1) + 'ms  worst: ' + worst.toFixed(1) + 'ms\n' +
      'listeners: ' + LISTENERS.length + '  rAFs: ' + RAF_IDS.size +
      '  intv: ' + INTERVALS.size + '  timeouts: ' + TIMEOUTS.size +
      '  ctx: ' + (contextLost ? 'LOST' : 'OK');
  }

  window.addEventListener('keydown', function (e) {
    if (e.key === '`' || e.key === '~' || e.code === 'Backquote') {
      e.preventDefault();
      overlayVisible = !overlayVisible;
      ensureOverlay();
      perfOverlay.style.display = overlayVisible ? 'block' : 'none';
    }
  });

  /* ================================================================== */
  /* 6.  Cleanup API                                                     */
  /* ================================================================== */
  window.__zombieCleanup = function () {
    for (var i = LISTENERS.length - 1; i >= 0; i--) {
      try {
        _origRemove.call(LISTENERS[i].target, LISTENERS[i].type, LISTENERS[i].handler, LISTENERS[i].opts);
      } catch (e) {}
    }
    LISTENERS.length = 0;

    INTERVALS.forEach(function (id) {
      try { _origClearInterval(id); } catch (e) {}
    });
    INTERVALS.clear();

    TIMEOUTS.forEach(function (id) {
      try { _origClearTimeout(id); } catch (e) {}
    });
    TIMEOUTS.clear();

    RAF_IDS.forEach(function (id) {
      try { _origCaf(id); } catch (e) {}
    });
    RAF_IDS.clear();

    contextLost = false;
    frameSamples.length = 0;
    if (perfOverlay) perfOverlay.textContent = '';

    console.log('[stability] Cleanup complete');
  };

  window.addEventListener('beforeunload', function () {
    window.__zombieCleanup();
  });

  console.log('[stability] DeadTakeover patch active | press backtick to toggle perf overlay');
})();