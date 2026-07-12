/**
 * CraftVerse — mobile touch controls (v23)
 * Load BEFORE the Vite bundle so the FPS shim can wrap listeners.
 */
(function () {
  'use strict';
  if (!window.AIGLMobile || !window.AIGLMobile.isTouchDevice()) return;

  window.AIGLMobile.ensureCss();
  window.AIGLMobile.installFpsShim();
  window.AIGLMobile.mountFpsControls({
    id: 'aigl-mob-voxel',
    banner: 'Touch sandbox — joystick to move, right side to look.',
    jump: true,
    reload: false,
    fire: false,
  });
})();
