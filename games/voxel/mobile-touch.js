/**
 * CraftVerse — mobile touch controls (v24)
 * Load BEFORE the Vite bundle so the FPS shim can wrap listeners.
 */
(function () {
  'use strict';
  if (!window.AIGLMobile || !window.AIGLMobile.isTouchDevice()) return;

  window.AIGLMobile.ensureCss();
  window.AIGLMobile.installFpsShim();
  window.AIGLMobile.mountFpsControls({
    id: 'aigl-mob-voxel',
    banner: 'Joystick move · drag upper-right to look · Mine/Place to dig',
    jump: true,
    reload: false,
    fire: true,
    fireLabel: 'Mine',
  });

  function whenReady(fn) {
    var tries = 0;
    var timer = setInterval(function () {
      var root = document.getElementById('aigl-mob-voxel');
      if (root) {
        clearInterval(timer);
        fn(root);
        return;
      }
      if (++tries > 80) clearInterval(timer);
    }, 100);
  }

  whenReady(function (root) {
    var actions = root.querySelector('.aigl-mob-actions');
    if (!actions) return;

    var row = document.createElement('div');
    row.className = 'aigl-mob-btn-row';

    var inventory = window.AIGLMobile.makeBtn('Inv');
    inventory.addEventListener('click', function () {
      window.AIGLMobile.synthKey('KeyE', true, 'e');
      setTimeout(function () {
        window.AIGLMobile.synthKey('KeyE', false, 'e');
      }, 80);
    });
    row.appendChild(inventory);

    var sprint = window.AIGLMobile.makeBtn('Sprint');
    window.AIGLMobile.bindHoldButton(sprint, 'ShiftLeft', 'Shift');
    row.appendChild(sprint);

    actions.appendChild(row);
  });
})();
