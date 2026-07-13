/**
 * Dead Zone — mobile touch controls (v23)
 */
(function () {
  'use strict';
  if (!window.AIGLMobile || !window.AIGLMobile.isTouchDevice()) return;

  window.AIGLMobile.ensureCss();

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
    window.AIGLMobile.scheduleBannerHide(banner);

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
      input.setMobileKey('KeyR', true);
      input.setMobileKey('KeyR', false);
    });
    row.appendChild(reload);
    actions.appendChild(row);
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
