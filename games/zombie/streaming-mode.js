/**
 * DeadTakeover streaming-mode helper v10.
 * Works with the patched bundle to keep distance loading smooth.
 * Enhanced with better diagnostics and adaptive tuning.
 */
(function(){
  'use strict';
  var lastLog = 0;
  var frameTimings = [];
  var MAX_TIMINGS = 120;
  var hitchCount = 0;

  window.__zombieStreamingMode = 'v10-adaptive-director-throttle';
  window.__zombieStreamingTuning = {
    cityRadius: 1,
    normalRadius: 2,
    minIntervalMs: 210,
    slowFrameMs: 24
  };

  window.__zombieGetStreamingStats = function(){
    var base = Object.assign({ mode: window.__zombieStreamingMode }, window.__zombieChunkStats || {});
    base.hitches = hitchCount;
    base.avgFrameMs = frameTimings.length > 0
      ? (frameTimings.reduce(function(a,b){return a+b;}, 0) / frameTimings.length).toFixed(1)
      : '--';
    base.p95FrameMs = frameTimings.length > 10
      ? frameTimings.slice().sort(function(a,b){return a-b;})[Math.floor(frameTimings.length * 0.95)].toFixed(1)
      : '--';
    return base;
  };

  // Track frame timing for diagnostics
  var lastFrameTime = performance.now();
  function trackFrame(){
    var now = performance.now();
    var dt = now - lastFrameTime;
    lastFrameTime = now;
    if(dt > 0 && dt < 500){
      frameTimings.push(dt);
      if(frameTimings.length > MAX_TIMINGS) frameTimings.shift();
      if(dt > 33) hitchCount++; // Count frames over 33ms as hitches
    }
    requestAnimationFrame(trackFrame);
  }
  requestAnimationFrame(trackFrame);

  // Lower browser scheduling pressure while the page is backgrounded
  document.addEventListener('visibilitychange', function(){
    if(document.hidden){
      if(window.__zombieRenderer && window.__zombieRenderer.info){
        try { window.__zombieRenderer.info.reset(); } catch(e){}
      }
      frameTimings.length = 0;
      hitchCount = 0;
    }
  });

  // Console debug stats when ?debug=1
  if(/[?&]debug=1/.test(location.search)){
    setInterval(function(){
      var now = performance.now();
      if(now - lastLog < 3000) return;
      lastLog = now;
      var stats = window.__zombieGetStreamingStats();
      console.log(
        '%c[streaming]%c ' + stats.mode + ' | pending:' + (stats.pending || 0) +
        ' built:' + (stats.built || 0) + ' hitches:' + stats.hitches +
        ' avg:' + stats.avgFrameMs + 'ms p95:' + stats.p95FrameMs + 'ms',
        'color:#35e7ff;font-weight:bold', 'color:inherit'
      );
    }, 1000);
  }

  console.log('[streaming] v10 adaptive throttle active');
})();
