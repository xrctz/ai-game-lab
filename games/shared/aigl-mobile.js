/**
 * AI Game Lab — shared mobile / touch control helpers (v23)
 * Reliable on iPhone Safari and hub iframes.
 */
(function (global) {
  'use strict';

  var mounted = {};

  function isTouchDevice() {
    try {
      if (/[?&](?:touch|mobile)=1(?:&|$)/i.test(location.search)) return true;
      if (global.navigator && global.navigator.maxTouchPoints > 0) return true;
      if ('ontouchstart' in global) return true;
      var ua = global.navigator && global.navigator.userAgent || '';
      if (/iPhone|iPad|iPod|Android|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
      if (global.matchMedia('(pointer: coarse)').matches) return true;
      if (global.matchMedia('(hover: none)').matches) return true;
      if (global.matchMedia('(any-pointer: coarse)').matches) return true;
    } catch (e) {}
    return Math.min(global.innerWidth || 0, global.innerHeight || 0) < 900;
  }

  function sharedAssetUrl(file) {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      if (src.indexOf('/games/shared/aigl-mobile.js') !== -1) {
        return src.replace(/aigl-mobile\.js.*$/, file);
      }
    }
    var path = location.pathname || '';
    var gamesIdx = path.indexOf('/games/');
    if (gamesIdx >= 0) {
      return path.slice(0, gamesIdx) + '/games/shared/' + file;
    }
    return '/ai-game-lab/games/shared/' + file;
  }

  function ensureCss() {
    if (document.getElementById('aigl-mobile-css')) return;
    var link = document.createElement('link');
    link.id = 'aigl-mobile-css';
    link.rel = 'stylesheet';
    link.href = sharedAssetUrl('aigl-mobile.css');
    document.head.appendChild(link);
  }

  function synthKey(code, down, key) {
    var opts = {
      code: code,
      key: key || code.replace('Key', '').toLowerCase(),
      bubbles: true,
      cancelable: true,
      view: global,
    };
    var ev;
    try {
      ev = new KeyboardEvent(down ? 'keydown' : 'keyup', opts);
    } catch (err) {
      ev = document.createEvent('KeyboardEvent');
      ev.initKeyboardEvent(down ? 'keydown' : 'keyup', true, true, global.view, key || '', '', false, '', false, false);
    }
    global.dispatchEvent(ev);
    document.dispatchEvent(ev);
  }

  function bindHoldButton(btn, code, key) {
    var down = function (e) {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.add('is-active');
      synthKey(code, true, key);
    };
    var up = function (e) {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.remove('is-active');
      synthKey(code, false, key);
    };
    btn.addEventListener('touchstart', down, { passive: false });
    btn.addEventListener('touchend', up, { passive: false });
    btn.addEventListener('touchcancel', up, { passive: false });
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
    root.className = 'aigl-mob-root aigl-mob-active' + (coarseOnly !== false ? ' aigl-mob-coarse-only' : '');
    if (/[?&](?:touch|mobile)=1/i.test(location.search)) {
      root.classList.add('aigl-mob-force');
    }
    document.body.appendChild(root);
    return root;
  }

  function bindDragSurface(el, onStart, onMove, onEnd) {
    function getPoint(e) {
      if (e.touches && e.touches[0]) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY, id: e.touches[0].identifier };
      }
      return { x: e.clientX, y: e.clientY, id: e.pointerId };
    }

    var active = false;
    var captureId = null;

    function start(e) {
      active = true;
      var p = getPoint(e);
      captureId = p.id;
      if (el.setPointerCapture && e.pointerId != null) {
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
      }
      onStart(p);
      e.preventDefault();
    }

    function move(e) {
      if (!active) return;
      var p = getPoint(e);
      if (captureId != null && p.id != null && p.id !== captureId) return;
      onMove(p);
      e.preventDefault();
    }

    function end(e) {
      if (!active) return;
      active = false;
      captureId = null;
      onEnd();
      e.preventDefault();
    }

    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end, { passive: false });
    el.addEventListener('touchcancel', end, { passive: false });
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', function (e) {
      if (!active) return;
      end(e);
    });
  }

  function createJoystick(root, onMove) {
    var zone = document.createElement('div');
    zone.className = 'aigl-mob-joystick aigl-mob-panel';
    var stick = document.createElement('div');
    stick.className = 'aigl-mob-stick';
    zone.appendChild(stick);
    root.appendChild(zone);

    var origin = { x: 0, y: 0 };
    var radius = 44;

    function setStick(nx, ny) {
      stick.style.transform = 'translate(' + (nx * radius) + 'px,' + (ny * radius) + 'px)';
      onMove(nx, ny);
    }

    function reset() {
      setStick(0, 0);
    }

    bindDragSurface(zone, function (p) {
      var rect = zone.getBoundingClientRect();
      origin.x = rect.left + rect.width / 2;
      origin.y = rect.top + rect.height / 2;
    }, function (p) {
      var dx = p.x - origin.x;
      var dy = p.y - origin.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = Math.max(-1, Math.min(1, dx / radius));
      var ny = Math.max(-1, Math.min(1, dy / radius));
      if (len > radius) {
        nx = dx / len;
        ny = dy / len;
      }
      setStick(nx, ny);
    }, reset);

    return { reset: reset };
  }

  function createLookZone(root, onDelta) {
    var zone = document.createElement('div');
    zone.className = 'aigl-mob-look aigl-mob-panel';
    root.appendChild(zone);

    var last = null;
    bindDragSurface(zone, function (p) {
      last = p;
    }, function (p) {
      if (!last) return;
      onDelta(p.x - last.x, p.y - last.y);
      last = p;
    }, function () {
      last = null;
    });

    return zone;
  }

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

  function whenReady(fn) {
    if (document.body) {
      fn();
      return;
    }
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  function mountFpsControls(opts) {
    if (!isTouchDevice()) return null;
    if (mounted[opts.id || 'aigl-mob-fps']) return mounted[opts.id || 'aigl-mob-fps'];

    ensureCss();
    var shim = installFpsShim();
    shim.enabled = true;

    function build() {
      var root = createRoot(opts.id || 'aigl-mob-fps', true);
      if (opts.banner) {
        var banner = document.createElement('div');
        banner.className = 'aigl-mob-banner';
        banner.textContent = opts.banner;
        root.appendChild(banner);
      }

      var moveState = { x: 0, y: 0 };
      var keyMap = opts.keyMap || { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };

      function applyMove() {
        var thr = 0.25;
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
        fire.addEventListener('touchstart', function (e) {
          e.preventDefault();
          fire.classList.add('is-active');
          document.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
        }, { passive: false });
        fire.addEventListener('touchend', function () {
          fire.classList.remove('is-active');
          document.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
        });
        fire.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          fire.classList.add('is-active');
          document.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
        });
        fire.addEventListener('pointerup', function () {
          fire.classList.remove('is-active');
          document.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
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

      (function enableVirtualLock() {
        if (document.querySelector('canvas')) {
          shim.setVirtualLock(true);
          return;
        }
        requestAnimationFrame(enableVirtualLock);
      })();

      mounted[opts.id || 'aigl-mob-fps'] = { root: root, shim: shim };
      return mounted[opts.id || 'aigl-mob-fps'];
    }

    whenReady(build);
    return { shim: shim };
  }

  function mountRacingControls(opts) {
    if (!isTouchDevice()) return null;
    if (mounted['aigl-mob-racing']) return mounted['aigl-mob-racing'];

    ensureCss();
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
      left.addEventListener('touchstart', function (e) { e.preventDefault(); steerDown('left', true); left.classList.add('is-active'); }, { passive: false });
      left.addEventListener('touchend', function () { steerDown('left', false); left.classList.remove('is-active'); });
      right.addEventListener('touchstart', function (e) { e.preventDefault(); steerDown('right', true); right.classList.add('is-active'); }, { passive: false });
      right.addEventListener('touchend', function () { steerDown('right', false); right.classList.remove('is-active'); });
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

      mounted['aigl-mob-racing'] = root;
      return root;
    }

    whenReady(build);
    return null;
  }

  function mountFnafControls() {
    if (!isTouchDevice()) return null;
    if (mounted['aigl-mob-fnaf']) return mounted['aigl-mob-fnaf'];

    ensureCss();
    function build() {
      var root = createRoot('aigl-mob-fnaf', true);
      var grid = document.createElement('div');
      grid.className = 'aigl-mob-fnaf';

      var lookL = makeBtn('Look Left');
      var lookC = makeBtn('Desk');
      var lookR = makeBtn('Look Right');
      var doorL = makeBtn('L Door');
      var cam = makeBtn('Cameras', 'wide');
      var doorR = makeBtn('R Door');
      var lightL = makeBtn('L Light');
      var flash = makeBtn('Flash');
      var lightR = makeBtn('R Light');

      [lookL, lookC, lookR, doorL, cam, doorR, lightL, flash, lightR].forEach(function (b) {
        grid.appendChild(b);
      });
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

      mounted['aigl-mob-fnaf'] = root;
      return root;
    }

    whenReady(build);
    return null;
  }

  function autoInit() {
    if (!isTouchDevice()) return;
    ensureCss();
    installFpsShim();
  }

  global.AIGLMobile = {
    isTouchDevice: isTouchDevice,
    isCoarsePointer: isTouchDevice,
    sharedAssetUrl: sharedAssetUrl,
    ensureCss: ensureCss,
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

  autoInit();
})(window);
