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

  /**
   * Desktop shows "E inventory" in the controls hint, but
   * mountFpsControls() only ships jump/reload/fire action slots —
   * there is no on-screen way to open the inventory on mobile.
   * mountFpsControls() builds its DOM asynchronously (on
   * DOMContentLoaded), so poll for the actions row the same way
   * deadzone/js/mobile-controls.js polls for its game instance,
   * then append one small supplementary button consistent with
   * the existing makeBtn()/synthKey() pattern used everywhere else.
   */
  function addInventoryButton() {
    var actions = document.querySelector('#aigl-mob-voxel .aigl-mob-actions');
    if (!actions) return false;
    if (document.getElementById('aigl-mob-voxel-inv')) return true;

    var inv = window.AIGLMobile.makeBtn('Inv');
    inv.id = 'aigl-mob-voxel-inv';
    inv.addEventListener('click', function () {
      window.AIGLMobile.synthKey('KeyE', true, 'e');
      setTimeout(function () {
        window.AIGLMobile.synthKey('KeyE', false, 'e');
      }, 80);
    });
    actions.appendChild(inv);
    return true;
  }

  var invTries = 0;
  var invTimer = setInterval(function () {
    if (addInventoryButton() || ++invTries > 100) clearInterval(invTimer);
  }, 150);
})();
