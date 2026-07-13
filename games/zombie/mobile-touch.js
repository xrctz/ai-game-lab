/**
 * DeadTakeover — mobile touch controls (v24)
 * Load BEFORE the game bundle so the FPS shim can wrap listeners.
 */
(function () {
  'use strict';
  if (!window.AIGLMobile || !window.AIGLMobile.isTouchDevice()) return;

  window.AIGLMobile.ensureCss();
  window.AIGLMobile.installFpsShim();
  var mounted = window.AIGLMobile.mountFpsControls({
    id: 'aigl-mob-zombie',
    banner: 'Joystick move · drag upper-right to aim · Fire shoots',
    jump: true,
    reload: true,
  });

  function whenReady(fn) {
    var tries = 0;
    var timer = setInterval(function () {
      var root = document.getElementById('aigl-mob-zombie');
      if (root) {
        clearInterval(timer);
        fn(root);
        return;
      }
      if (++tries > 80) clearInterval(timer);
    }, 100);
  }

  function pulseKey(code, key) {
    window.AIGLMobile.synthKey(code, true, key);
    setTimeout(function () {
      window.AIGLMobile.synthKey(code, false, key);
    }, 80);
  }

  whenReady(function (root) {
    var actions = root.querySelector('.aigl-mob-actions');
    if (!actions) return;

    var row = document.createElement('div');
    row.className = 'aigl-mob-btn-row';

    var sprint = window.AIGLMobile.makeBtn('Sprint');
    window.AIGLMobile.bindHoldButton(sprint, 'ShiftLeft', 'Shift');
    row.appendChild(sprint);

    var crouch = window.AIGLMobile.makeBtn('Crouch');
    window.AIGLMobile.bindHoldButton(crouch, 'ControlLeft', 'Control');
    row.appendChild(crouch);

    var grenade = window.AIGLMobile.makeBtn('Gren');
    grenade.addEventListener('click', function () {
      pulseKey('KeyG', 'g');
    });
    row.appendChild(grenade);

    var weapon = window.AIGLMobile.makeBtn('Wpn');
    weapon.addEventListener('click', function () {
      pulseKey('Digit2', '2');
    });
    row.appendChild(weapon);

    actions.appendChild(row);
  });
})();
