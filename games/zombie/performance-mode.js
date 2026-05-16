/**
 * DeadTakeover runtime performance mode.
 * Runs before the game bundle and adjusts render resolution when the frame
 * budget gets tight. It does not change gameplay state or saved data.
 */
(function () {
  'use strict';

  var settingsKey = 'deadtakeover_render_quality';
  var params = new URLSearchParams(location.search || '');
  var requested = (params.get('quality') || localStorage.getItem(settingsKey) || 'balanced').toLowerCase();
  if (!/^(low|balanced|high)$/.test(requested)) requested = 'balanced';
  localStorage.setItem(settingsKey, requested);

  var caps = {
    low:      { min: 0.36, max: 0.50, target: 48 },
    balanced: { min: 0.40, max: 0.62, target: 46 },
    high:     { min: 0.52, max: 0.78, target: 45 }
  }[requested];

  var currentRatio = 0;
  var lastTs = 0;
  var samples = [];
  var lastTune = 0;
  var lastResize = 0;
  var snapshot = { quality: requested, fps: 0, ratio: 0, avgMs: 0 };

  function getRenderer() {
    return window.__zombieRenderer || null;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function applyRatio(ratio) {
    var renderer = getRenderer();
    if (!renderer || !renderer.setPixelRatio) return;
    var base = window.__zombieBasePixelRatio || caps.max;
    var max = Math.min(caps.max, base, window.devicePixelRatio || caps.max);
    var next = clamp(ratio, caps.min, max);
    if (Math.abs(next - currentRatio) < 0.015) return;
    currentRatio = next;
    renderer.setPixelRatio(next);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    snapshot.ratio = next;
    window.__zombieRenderScale = next;
  }

  function average(list) {
    if (!list.length) return 0;
    var total = 0;
    for (var i = 0; i < list.length; i++) total += list[i];
    return total / list.length;
  }

  window.__zombiePerfTick = function (ts) {
    if (!currentRatio) applyRatio(caps.max);
    if (!lastTs) {
      lastTs = ts;
      return;
    }

    var dt = ts - lastTs;
    lastTs = ts;
    if (dt <= 0 || dt > 500) return;

    samples.push(dt);
    if (samples.length > 120) samples.shift();

    if (ts - lastTune < 2200 || samples.length < 45) return;
    lastTune = ts;

    var avg = average(samples);
    var fps = avg > 0 ? 1000 / avg : 0;
    snapshot.avgMs = avg;
    snapshot.fps = Math.round(fps);

    if (fps && fps < caps.target && currentRatio > caps.min) {
      applyRatio(currentRatio - 0.06);
    } else if (fps > 58 && currentRatio < caps.max && ts > 9000) {
      applyRatio(currentRatio + 0.025);
    }
  };

  window.__zombiePerfSnapshot = function () {
    return Object.assign({}, snapshot);
  };

  window.__zombieSetQuality = function (mode) {
    if (!/^(low|balanced|high)$/.test(mode)) return false;
    localStorage.setItem(settingsKey, mode);
    location.reload();
    return true;
  };

  window.addEventListener('resize', function () {
    var now = performance.now();
    if (now - lastResize < 120) return;
    lastResize = now;
    if (currentRatio) applyRatio(currentRatio);
  }, { passive: true });

  console.log('[performance] DeadTakeover quality mode:', requested);
})();
