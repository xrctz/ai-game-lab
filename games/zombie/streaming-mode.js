/**
 * DeadTakeover streaming-mode helper.
 * Works with the patched bundle to keep distance loading smooth.
 */
(function(){
  'use strict';
  var lastLog=0;
  window.__zombieStreamingMode='v6-main-thread-throttle';
  window.__zombieGetStreamingStats=function(){
    return Object.assign({mode:window.__zombieStreamingMode}, window.__zombieChunkStats||{});
  };
  // Lower browser scheduling pressure while the page is backgrounded.
  document.addEventListener('visibilitychange', function(){
    if (document.hidden && window.__zombieRenderer && window.__zombieRenderer.info) {
      try { window.__zombieRenderer.info.reset(); } catch(e) {}
    }
  });
  // Optional console stats once every few seconds when ?debug=1 is used.
  if (/[?&]debug=1/.test(location.search)) {
    setInterval(function(){
      var now=performance.now();
      if(now-lastLog<3000)return;
      lastLog=now;
      console.log('[streaming]', window.__zombieGetStreamingStats());
    },1000);
  }
})();
