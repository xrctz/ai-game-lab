/**
 * AI Game Lab — shared mobile / touch control helpers
 */
(function (global) {
  'use strict';

  function isCoarsePointer() {
    try {
      if (global.matchMedia('(pointer: coarse)').matches) return true;
      if (global.matchMedia('(hover: none)').matches) return true;
    } catch (e) {}
    return Math.min(global.innerWidth, global.innerHeight) < 820;
  }

  function synthKey(code, down, key) {
    var ev = new KeyboardEvent(down ? 'keydown' : 'keyup', {
      code: code,
      key: key || code.replace('Key', '').toLowerCase(),
      bubbles: true,
      cancelable: true,
    });
    global.dispatchEvent(ev);
  }

  function bindHoldButton(btn, code, key) {
    var down = function (e) {
      e.preventDefault();
      btn.classList.add('is-active');
      synthKey(code, true, key);
    };
    var up = function (e) {
      e.preventDefault();
      btn.classList.remove('is-active');
      synthKey(code, false, key);
    };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointerleave', up);
    btn.addEventListener('pointercancel', up);
  }

  function makeBtn(label, className) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'aigl-mob-btn aigl-mob-panel' + (className ? ' ' + className : '');
    btn.textContent = label;
    btn.setAttribute('aria-label', label);
    return btn;
  }

  function createRoot(id, coarseOnly) {
    var root = document.getElementById(id);
    if (root) return root;
    root = document.createElement('div');
    root.id = id;
    root.className = 'aigl-mob-root' + (coarseOnly !== false ? ' aigl-mob-coarse-only' : '');
    document.body.appendChild(root);
    return root;
  }

  function createJoystick(root, onMove) {
    var zone = document.createElement('div');
    zone.className = 'aigl-mob-joystick aigl-mob-panel';
    var stick = document.createElement('div');
    stick.className = 'aigl-mob-stick';
    zone.appendChild(stick);
    root.appendChild(zone);

    var active = false;
    var origin = { x: 0, y: 0 };
    var radius = 42;

    function setStick(nx, ny) {
      stick.style.transform = 'translate(' + (nx * radius) + 'px,' + (ny * radius) + 'px)';
      onMove(nx, ny);
    }

    function reset() {
      active = false;
      setStick(0, 0);
    }

    zone.addEventListener('pointerdown', function (e) {
      active = true;
      zone.setPointerCapture(e.pointerId);
      var rect = zone.getBoundingClientRect();
      origin.x = rect.left + rect.width / 2;
      origin.y = rect.top + rect.height / 2;
      e.preventDefault();
    });

    zone.addEventListener('pointermove', function (e) {
      if (!active) return;
      var dx = e.clientX - origin.x;
      var dy = e.clientY - origin.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = Math.max(-1, Math.min(1, dx / radius));
      var ny = Math.max(-1, Math.min(1, dy / radius));
      if (len > radius) {
        nx = dx / len;
        ny = dy / len;
      }
      setStick(nx, ny);
      e.preventDefault();
    });

    zone.addEventListener('pointerup', function (e) {
      reset();
      e.preventDefault();
    });
    zone.addEventListener('pointercancel', reset);
    zone.addEventListener('pointerleave', function (e) {
      if (!active) return;
      reset();
    });

    return { reset: reset };
  }

  function createLookZone(root, onDelta) {
    var zone = document.createElement('div');
    zone.className = 'aigl-mob-look aigl-mob-panel';
    root.appendChild(zone);

    var last = null;
    zone.addEventListener('pointerdown', function (e) {
      last = { x: e.clientX, y: e.clientY };
      zone.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    zone.addEventListener('pointermove', function (e) {
      if (!last) return;
      var dx = e.clientX - last.x;
      var dy = e.clientY - last.y;
      last.x = e.clientX;
      last.y = e.clientY;
      onDelta(dx, dy);
      e.preventDefault();
    });
    function end() { last = null; }
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    return zone;
  }

  /**
   * FPS shim: virtual pointer lock + injected movementX/Y on mousemove.
   * Load BEFORE game bundles that pause without pointer lock.
   */
  function installFpsShim() {
    if (global.__aiglFpsShim) return global.__aiglFpsShim;
    var shim = {
      enabled: false,
      virtualLocked: false,
      lookDx: 0,
      lookDy: 0,
      sensitivity: 0.0024,
    };

    var origAdd = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (this === global && type === 'mousemove' && typeof listener === 'function') {
        var wrapped = function (e) {
          if (shim.enabled && shim.virtualLocked && (shim.lookDx || shim.lookDy)) {
            try {
              Object.defineProperty(e, 'movementX', { value: shim.lookDx, configurable: true });
              Object.defineProperty(e, 'movementY', { value: shim.lookDy, configurable: true });
            } catch (err) {}
            shim.lookDx = 0;
            shim.lookDy = 0;
          }
          return listener.call(this, e);
        };
        return origAdd.call(this, type, wrapped, options);
      }
      if (this === global && type === 'pointerlockchange' && typeof listener === 'function') {
        var wrappedLock = function () {
          return listener.call(this);
        };
        return origAdd.call(this, type, wrappedLock, options);
      }
      return origAdd.call(this, type, listener, options);
    };

    shim.pushLook = function (dx, dy) {
      shim.lookDx += dx;
      shim.lookDy += dy;
    };

    shim.setVirtualLock = function (on) {
      shim.virtualLocked = !!on;
      if (!shim.virtualLocked) {
        try { delete document.pointerLockElement; } catch (e) {}
        return;
      }
      var canvas = document.querySelector('canvas');
      if (!canvas) return;
      try {
        Object.defineProperty(document, 'pointerLockElement', {
          get: function () { return shim.virtualLocked ? canvas : null; },
          configurable: true,
        });
        global.dispatchEvent(new Event('pointerlockchange'));
      } catch (e) {}
    };

    global.__aiglFpsShim = shim;
    return shim;
  }

  function mountFpsControls(opts) {
    if (!isCoarsePointer()) return null;
    var shim = installFpsShim();
    shim.enabled = true;
    shim.sensitivity = opts.sensitivity || 0.0024;

    function build() {
      var root = createRoot(opts.id || 'aigl-mob-fps', true);
      if (opts.banner) {
        var banner = document.createElement('div');
        banner.className = 'aigl-mob-banner';
        banner.textContent = opts.banner;
        root.appendChild(banner);
      }

      var moveState = { x: 0, y: 0 };
      var keyMap = opts.keyMap || {
        up: 'KeyW',
        down: 'KeyS',
        left: 'KeyA',
        right: 'KeyD',
      };

      function applyMove() {
        var thr = 0.28;
        synthKey(keyMap.up, moveState.y < -thr, 'w');
        synthKey(keyMap.down, moveState.y > thr, 's');
        synthKey(keyMap.left, moveState.x < -thr, 'a');
        synthKey(keyMap.right, moveState.x > thr, 'd');
      }

      createJoystick(root, function (x, y) {
        moveState.x = x;
        moveState.y = y;
        applyMove();
      });

      createLookZone(root, function (dx, dy) {
        shim.pushLook(dx, dy);
      });

      var actions = document.createElement('div');
      actions.className = 'aigl-mob-actions';
      root.appendChild(actions);

      if (opts.fire !== false) {
        var fire = makeBtn(opts.fireLabel || 'Fire');
        fire.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          fire.classList.add('is-active');
          var down = new MouseEvent('mousedown', { button: 0, bubbles: true });
          global.dispatchEvent(down);
        });
        fire.addEventListener('pointerup', function () {
          fire.classList.remove('is-active');
          global.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
        });
        actions.appendChild(fire);
      }

      var row = document.createElement('div');
      row.className = 'aigl-mob-btn-row';
      actions.appendChild(row);

      if (opts.jump) {
        var jump = makeBtn('Jump');
        bindHoldButton(jump, 'Space', ' ');
        row.appendChild(jump);
      }
      if (opts.reload) {
        var reload = makeBtn('Reload');
        reload.addEventListener('click', function () {
          synthKey('KeyR', true, 'r');
          synthKey('KeyR', false, 'r');
        });
        row.appendChild(reload);
      }

      function enableVirtualLock() {
        if (document.querySelector('canvas')) {
          shim.setVirtualLock(true);
          return;
        }
        requestAnimationFrame(enableVirtualLock);
      }
      enableVirtualLock();
      return { root: root, shim: shim };
    }

    if (document.body) return build();
    document.addEventListener('DOMContentLoaded', build, { once: true });
    return { shim: shim };
  }

  function mountRacingControls(opts) {
    if (!isCoarsePointer()) return null;

    function build() {
      var root = createRoot(opts.id || 'aigl-mob-racing', true);

    var steer = document.createElement('div');
    steer.className = 'aigl-mob-steer';
    var left = makeBtn('◀ Steer');
    var right = makeBtn('Steer ▶');
    steer.appendChild(left);
    steer.appendChild(right);
    root.appendChild(steer);

    var actions = document.createElement('div');
    actions.className = 'aigl-mob-actions';
    var boost = makeBtn('Boost');
    var drift = makeBtn('Drift');
    actions.appendChild(boost);
    actions.appendChild(drift);
    root.appendChild(actions);

    var set = opts.setInput || function () {};
    function steerDown(side, on) {
      set(side === 'left' ? 'left' : 'right', on);
    }
    left.addEventListener('pointerdown', function (e) { e.preventDefault(); steerDown('left', true); left.classList.add('is-active'); });
    left.addEventListener('pointerup', function () { steerDown('left', false); left.classList.remove('is-active'); });
    left.addEventListener('pointerleave', function () { steerDown('left', false); left.classList.remove('is-active'); });
    right.addEventListener('pointerdown', function (e) { e.preventDefault(); steerDown('right', true); right.classList.add('is-active'); });
    right.addEventListener('pointerup', function () { steerDown('right', false); right.classList.remove('is-active'); });
    right.addEventListener('pointerleave', function () { steerDown('right', false); right.classList.remove('is-active'); });

    boost.addEventListener('pointerdown', function (e) { e.preventDefault(); set('boost', true); boost.classList.add('is-active'); });
    boost.addEventListener('pointerup', function () { set('boost', false); boost.classList.remove('is-active'); });
    drift.addEventListener('pointerdown', function (e) { e.preventDefault(); set('drift', true); drift.classList.add('is-active'); });
    drift.addEventListener('pointerup', function () { set('drift', false); drift.classList.remove('is-active'); });

      return root;
    }

    if (document.body) return build();
    document.addEventListener('DOMContentLoaded', build, { once: true });
    return null;
  }

  function mountFnafControls() {
    if (!isCoarsePointer()) return null;

    function build() {
      var root = createRoot('aigl-mob-fnaf', true);

    var grid = document.createElement('div');
    grid.className = 'aigl-mob-fnaf';

    var lookL = makeBtn('Look Left');
    var lookC = makeBtn('Desk');
    var lookR = makeBtn('Look Right');
    grid.appendChild(lookL);
    grid.appendChild(lookC);
    grid.appendChild(lookR);

    var doorL = makeBtn('L Door');
    var cam = makeBtn('Cameras', 'wide');
    var doorR = makeBtn('R Door');
    grid.appendChild(doorL);
    grid.appendChild(cam);
    grid.appendChild(doorR);

    var lightL = makeBtn('L Light');
    var flash = makeBtn('Flash');
    var lightR = makeBtn('R Light');
    grid.appendChild(lightL);
    grid.appendChild(flash);
    grid.appendChild(lightR);

    root.appendChild(grid);

    function tap(code, key) {
      synthKey(code, true, key);
      setTimeout(function () { synthKey(code, false, key); }, 80);
    }

    lookL.addEventListener('click', function () { tap('KeyA', 'a'); });
    lookC.addEventListener('click', function () { tap('KeyS', 's'); });
    lookR.addEventListener('click', function () { tap('KeyD', 'd'); });
    doorL.addEventListener('click', function () { tap('KeyQ', 'q'); });
    doorR.addEventListener('click', function () { tap('KeyE', 'e'); });
    cam.addEventListener('click', function () { tap('Space', ' '); });
    flash.addEventListener('click', function () { tap('KeyF', 'f'); });

    bindHoldButton(lightL, 'KeyZ', 'z');
    bindHoldButton(lightR, 'KeyC', 'c');

      return root;
    }

    if (document.body) return build();
    document.addEventListener('DOMContentLoaded', build, { once: true });
    return null;
  }

  global.AIGLMobile = {
    isCoarsePointer: isCoarsePointer,
    synthKey: synthKey,
    bindHoldButton: bindHoldButton,
    makeBtn: makeBtn,
    createRoot: createRoot,
    createJoystick: createJoystick,
    createLookZone: createLookZone,
    installFpsShim: installFpsShim,
    mountFpsControls: mountFpsControls,
    mountRacingControls: mountRacingControls,
    mountFnafControls: mountFnafControls,
  };
})(window);
