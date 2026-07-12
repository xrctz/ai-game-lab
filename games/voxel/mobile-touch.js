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
    banner: 'Joystick move · drag upper-right to look',
    jump: true,
    reload: false,
    fire: false,
  });
})();
