/**
 * DeadTakeover — mobile touch controls (v23)
 * Load BEFORE the game bundle so the FPS shim can wrap listeners.
 */
(function () {
  'use strict';
  if (!window.AIGLMobile || !window.AIGLMobile.isTouchDevice()) return;

  window.AIGLMobile.ensureCss();
  window.AIGLMobile.installFpsShim();
  window.AIGLMobile.mountFpsControls({
    id: 'aigl-mob-zombie',
    banner: 'Joystick move · drag upper-right to aim · Fire shoots',
    jump: true,
    reload: true,
  });
})();
