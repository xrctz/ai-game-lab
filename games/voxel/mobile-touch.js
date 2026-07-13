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

  function mouseBtn(type, button) {
    document.dispatchEvent(new MouseEvent(type, { button: button, bubbles: true }));
  }

  function makeBtn(label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'aigl-mob-btn aigl-mob-panel';
    b.textContent = label;
    b.setAttribute('aria-label', label);
    return b;
  }

  // Add Place (right-click) and Inv (KeyE) once the control root exists.
  (function addBlockButtons() {
    var row = document.querySelector('#aigl-mob-voxel .aigl-mob-btn-row');
    if (!row) { requestAnimationFrame(addBlockButtons); return; }

    var place = makeBtn('Place');
    var pressPlace = function (e) { if (e) e.preventDefault(); place.classList.add('is-active'); mouseBtn('mousedown', 2); };
    var relPlace = function () { place.classList.remove('is-active'); mouseBtn('mouseup', 2); };
    place.addEventListener('touchstart', pressPlace, { passive: false });
    place.addEventListener('touchend', relPlace);
    place.addEventListener('pointerdown', pressPlace);
    place.addEventListener('pointerup', relPlace);
    row.appendChild(place);

    var inv = makeBtn('Inv');
    inv.addEventListener('click', function () {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE', bubbles: true }));
      setTimeout(function () {
        document.dispatchEvent(new KeyboardEvent('keyup', { key: 'e', code: 'KeyE', bubbles: true }));
      }, 40);
    });
    row.appendChild(inv);
  })();
})();
