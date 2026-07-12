/**
 * DeadTakeover — mobile touch controls (v22)
 * Load BEFORE the game bundle so the FPS shim can wrap listeners.
 */
(function () {
  'use strict';
  if (!window.AIGLMobile || !window.AIGLMobile.isCoarsePointer()) return;

  function linkCss() {
    if (document.getElementById('aigl-mobile-css')) return;
    var link = document.createElement('link');
    link.id = 'aigl-mobile-css';
    link.rel = 'stylesheet';
    link.href = '../shared/aigl-mobile.css';
    document.head.appendChild(link);
  }

  linkCss();
  window.AIGLMobile.installFpsShim();
  window.AIGLMobile.mountFpsControls({
    id: 'aigl-mob-zombie',
    banner: 'Touch to play — joystick moves, right side aims, Fire shoots.',
    jump: true,
    reload: true,
  });
})();
