/**
 * CraftVerse — mobile touch controls (v24)
 * Load BEFORE the Vite bundle so the FPS shim can wrap listeners.
 * The bundle listens on `window` for mousedown/mouseup/contextmenu, so the
 * touch buttons below dispatch synthetic mouse events on `document` (which
 * bubble up to `window`) to break/place blocks, plus KeyE for the inventory.
 */
(function () {
  'use strict';
  if (!window.AIGLMobile || !window.AIGLMobile.isTouchDevice()) return;

  window.AIGLMobile.ensureCss();
  window.AIGLMobile.installFpsShim();
  window.AIGLMobile.mountFpsControls({
    id: 'aigl-mob-voxel',
    banner: 'Joystick move · drag upper-right to look · Mine / Place blocks',
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

  function mouseBtn(type, button) {
    document.dispatchEvent(new MouseEvent(type, { button: button, bubbles: true }));
  }

  whenReady(function (root) {
    var actions = root.querySelector('.aigl-mob-actions');
    if (!actions) return;

    var row = document.createElement('div');
    row.className = 'aigl-mob-btn-row';

    // Place (right-click) — the bundle listens for mouse events on window.
    var place = window.AIGLMobile.makeBtn('Place');
    var pressPlace = function (e) { if (e) e.preventDefault(); place.classList.add('is-active'); mouseBtn('mousedown', 2); };
    var relPlace = function () { place.classList.remove('is-active'); mouseBtn('mouseup', 2); };
    place.addEventListener('touchstart', pressPlace, { passive: false });
    place.addEventListener('touchend', relPlace);
    place.addEventListener('pointerdown', pressPlace);
    place.addEventListener('pointerup', relPlace);
    row.appendChild(place);

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
