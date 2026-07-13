/**
 * Dead Zone — mobile touch controls (v24)
 */
(function () {
  'use strict';
  if (!window.AIGLMobile || !window.AIGLMobile.isTouchDevice()) return;

  window.AIGLMobile.ensureCss();

  function pulseKey(input, code) {
    input.setMobileKey(code, true);
    input.setMobileKey(code, false);
  }

  function attach(game) {
    if (!game || !game.input || game.__mobileAttached) return;
    game.__mobileAttached = true;
    var input = game.input;
    input.setMobileActive(true);

    var root = window.AIGLMobile.createRoot('aigl-mob-deadzone', true);
    var banner = document.createElement('div');
    banner.className = 'aigl-mob-banner';
    banner.textContent = 'Joystick move · drag upper-right to aim';
    root.appendChild(banner);
    setTimeout(function () {
      if (banner.parentNode) banner.style.opacity = '0';
    }, 5000);

    var move = { x: 0, y: 0 };
    function applyMove() {
      var t = 0.25;
      input.setMobileKey('KeyW', move.y < -t);
      input.setMobileKey('KeyS', move.y > t);
      input.setMobileKey('KeyA', move.x < -t);
      input.setMobileKey('KeyD', move.x > t);
    }

    window.AIGLMobile.createJoystick(root, function (x, y) {
      move.x = x;
      move.y = y;
      applyMove();
    });

    window.AIGLMobile.createLookZone(root, function (dx, dy) {
      input.addMobileLook(dx, dy);
    });

    var actions = document.createElement('div');
    actions.className = 'aigl-mob-actions';
    var fire = window.AIGLMobile.makeBtn('Fire');
    fire.addEventListener('touchstart', function (e) {
      e.preventDefault();
      fire.classList.add('is-active');
      input.setMobileFire(true);
    }, { passive: false });
    fire.addEventListener('touchend', function () {
      fire.classList.remove('is-active');
      input.setMobileFire(false);
    });
    fire.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      fire.classList.add('is-active');
      input.setMobileFire(true);
    });
    fire.addEventListener('pointerup', function () {
      fire.classList.remove('is-active');
      input.setMobileFire(false);
    });
    actions.appendChild(fire);

    var row = document.createElement('div');
    row.className = 'aigl-mob-btn-row';
    var jump = window.AIGLMobile.makeBtn('Jump');
    window.AIGLMobile.bindHoldButton(jump, 'Space', ' ');
    row.appendChild(jump);
    var reload = window.AIGLMobile.makeBtn('Reload');
    reload.addEventListener('click', function () {
      pulseKey(input, 'KeyR');
    });
    row.appendChild(reload);
    actions.appendChild(row);

    var row2 = document.createElement('div');
    row2.className = 'aigl-mob-btn-row';
    var sprint = window.AIGLMobile.makeBtn('Sprint');
    sprint.addEventListener('touchstart', function (e) {
      e.preventDefault();
      sprint.classList.add('is-active');
      input.setMobileKey('ShiftLeft', true);
    }, { passive: false });
    sprint.addEventListener('touchend', function () {
      sprint.classList.remove('is-active');
      input.setMobileKey('ShiftLeft', false);
    });
  sprint.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      sprint.classList.add('is-active');
      input.setMobileKey('ShiftLeft', true);
    });
    sprint.addEventListener('pointerup', function () {
      sprint.classList.remove('is-active');
      input.setMobileKey('ShiftLeft', false);
    });
    row2.appendChild(sprint);

    var crouch = window.AIGLMobile.makeBtn('Crouch');
    window.AIGLMobile.bindHoldButton(crouch, 'ControlLeft', 'Control');
    row2.appendChild(crouch);

    var grenade = window.AIGLMobile.makeBtn('Gren');
    grenade.addEventListener('click', function () {
      pulseKey(input, 'KeyG');
    });
    row2.appendChild(grenade);
    actions.appendChild(row2);

    var row3 = document.createElement('div');
    row3.className = 'aigl-mob-btn-row';
    ['1', '2', '3'].forEach(function (digit, i) {
      var btn = window.AIGLMobile.makeBtn(digit);
      btn.addEventListener('click', function () {
        pulseKey(input, 'Digit' + (i + 1));
      });
      row3.appendChild(btn);
    });
    actions.appendChild(row3);
    root.appendChild(actions);

    var overlay = document.getElementById('embed-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  var tries = 0;
  var timer = setInterval(function () {
    if (window.__deadZoneGame) {
      clearInterval(timer);
      attach(window.__deadZoneGame);
      return;
    }
    if (++tries > 160) clearInterval(timer);
  }, 200);
})();
