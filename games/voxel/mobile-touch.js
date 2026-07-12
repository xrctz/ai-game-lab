/**
 * CraftVerse — mobile touch controls (v22)
 * Load BEFORE the Vite bundle so the FPS shim can wrap listeners.
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
    id: 'aigl-mob-voxel',
    banner: 'Touch sandbox — joystick to move, right side to look, Jump for space.',
    jump: true,
    reload: false,
    fire: false,
  });
})();
