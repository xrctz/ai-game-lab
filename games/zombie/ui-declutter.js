/**
 * DeadTakeover UI declutter (v21.1)
 * - Hide Lab+/Director/hub chrome while the title menu is open
 * - Reveal inject tools after Deploy (menu gets is-hidden)
 * - NEVER watch document.body subtree — that re-entered on every
 *   world DOM mutation and froze the tab after Deploy (textContent /
 *   style writes feeding MutationObserver childList callbacks).
 */
(function () {
  'use strict';
  if (window.__dtUiDeclutter) return;
  window.__dtUiDeclutter = 'v21.1';

  var STYLE_ID = 'dt-ui-declutter-css';
  var CHROME_IDS = [
    'dt-v9-director',
    'dt-lab-panel',
    'dt-hub-chip',
    'dt-hub-fallback'
  ];

  /** Last applied menu-open flag; skip redundant DOM work. */
  var lastMenuOpen = null;
  var menuObserver = null;
  var lateMountTimer = null;
  var lateMountTicks = 0;

  function getMenu() {
    return document.getElementById('menu-overlay');
  }

  function isMenuOpen() {
    var menu = getMenu();
    // Missing menu: treat as not open so we never block forever.
    if (!menu) return false;
    return !menu.classList.contains('is-hidden');
  }

  /**
   * Idempotent chrome sync. Safe to call often; no-ops when state unchanged.
   * Does not write textContent (that caused observer feedback loops).
   */
  function applyChromeVisibility(force) {
    var open = isMenuOpen();
    if (!force && open === lastMenuOpen) return;
    lastMenuOpen = open;

    var root = document.documentElement;
    root.classList.toggle('dt-menu-open', open);
    root.classList.toggle('dt-in-game', !open);

    for (var i = 0; i < CHROME_IDS.length; i++) {
      var el = document.getElementById(CHROME_IDS[i]);
      if (!el) continue;

      if (open) {
        // CSS (html.dt-menu-open …) already hides these; only mark for restore.
        if (el.getAttribute('data-dt-boot-hidden') !== '1') {
          el.setAttribute('data-dt-boot-hidden', '1');
        }
        // Keep inline none as belt-and-suspenders for late-injected panels
        // that set their own display:flex after our CSS.
        if (el.style.getPropertyValue('display') !== 'none') {
          el.style.setProperty('display', 'none', 'important');
        }
      } else {
        if (el.getAttribute('data-dt-boot-hidden') === '1') {
          el.removeAttribute('data-dt-boot-hidden');
          el.style.removeProperty('display');
        }
        // Lab panel stays off in hub embed
        if (el.id === 'dt-lab-panel' && document.body.classList.contains('dt-embedded')) {
          el.style.setProperty('display', 'none', 'important');
        }
      }
    }

    // Director: prefer mini when first revealed in-game (class only — no text thrash)
    if (!open) {
      var dir = document.getElementById('dt-v9-director');
      if (dir && !dir.dataset.dtUserOpened && !dir.classList.contains('dt-v9-mini')) {
        dir.classList.add('dt-v9-mini');
        var minBtn = document.getElementById('dt-v9-min');
        // Only update label once when entering mini, if empty/wrong
        if (minBtn && minBtn.textContent !== 'Open') {
          minBtn.textContent = 'Open';
        }
      }
    }
  }

  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '/* Boot: hide inject chrome over title menu (CSS-only path) */',
      'html.dt-menu-open #dt-v9-director,',
      'html.dt-menu-open #dt-lab-panel,',
      'html.dt-menu-open #dt-hub-chip,',
      'html.dt-menu-open #dt-hub-fallback{display:none!important}',

      '/* Fail-safe: when game hides menu, never block the canvas */',
      '#menu-overlay.is-hidden{',
      '  display:none!important;',
      '  pointer-events:none!important;',
      '  visibility:hidden!important;',
      '}',

      '/* Roomier menu card */',
      '#menu-overlay .menu-card{',
      '  width:min(520px,92vw)!important;',
      '  max-height:min(88vh,820px)!important;',
      '  overflow-y:auto!important;',
      '  padding:28px 26px 22px!important;',
      '  text-align:left!important;',
      '  scrollbar-width:thin;',
      '}',
      '#menu-overlay .menu-brand{',
      '  display:flex;align-items:center;gap:14px;margin-bottom:18px;',
      '}',
      '#menu-overlay .menu-brand h1{',
      '  font-size:clamp(1.55rem,4vw,2rem)!important;',
      '  margin:0 0 4px!important;letter-spacing:.04em!important;',
      '}',
      '#menu-overlay #menu-subtitle{',
      '  margin:0!important;opacity:.75!important;font-size:.82rem!important;',
      '}',
      '#menu-overlay .map-select{margin-bottom:18px!important;padding:14px!important}',
      '#menu-overlay .map-grid{gap:8px!important}',
      '#menu-overlay .map-chip{padding:12px 14px!important}',
      '#menu-overlay .menu-actions{gap:10px!important;margin-bottom:16px!important}',
      '#menu-overlay .menu-actions button{padding:13px 16px!important;font-size:.95rem!important}',

      '/* Collapsed controls */',
      '#menu-overlay .menu-controls{display:none!important}',
      '#menu-overlay .menu-controls.is-open{display:grid!important;gap:12px!important;margin-top:4px!important}',
      '#dt-controls-toggle{',
      '  width:100%;margin:0 0 14px;padding:11px 14px;border-radius:10px;',
      '  border:1px solid rgba(170,200,140,.28);background:rgba(20,40,24,.45);',
      '  color:#e8f4dc;font:inherit;font-weight:700;font-size:.88rem;cursor:pointer;',
      '  letter-spacing:.02em;text-align:left;',
      '}',
      '#dt-controls-toggle:hover{border-color:rgba(130,220,120,.45);background:rgba(30,55,32,.55)}',
      '#dt-controls-toggle span{float:right;opacity:.7;font-size:.8rem}',

      '#menu-overlay .menu-ctrl-section{',
      '  border:1px solid rgba(170,200,140,.18);border-radius:10px;',
      '  padding:12px 14px;background:rgba(0,0,0,.18);margin:0!important;',
      '}',
      '#menu-overlay .menu-ctrl-title{',
      '  display:block;font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;',
      '  opacity:.7;margin-bottom:8px;font-weight:700;',
      '}',
      '#menu-overlay .menu-ctrl-grid{',
      '  display:grid!important;grid-template-columns:1fr 1fr;gap:6px 12px!important;',
      '  font-size:.8rem!important;line-height:1.45!important;',
      '}',
      '#menu-overlay .menu-sys-badges{',
      '  display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;justify-content:flex-start;',
      '}',
      '#menu-overlay .sys-badge{',
      '  padding:5px 10px;border-radius:999px;font-size:.7rem;font-weight:700;',
      '  border:1px solid rgba(130,220,120,.28);background:rgba(20,40,24,.4);color:#c8ffb8;',
      '}',
      '#menu-overlay .menu-footer-info{margin-top:8px}',
      '#menu-overlay .menu-credits{opacity:.5!important;font-size:.72rem!important;line-height:1.45!important;margin:0!important}',

      '/* In-game inject chrome: quieter corners */',
      'html.dt-in-game #dt-lab-panel{',
      '  left:14px;bottom:14px;gap:8px;z-index:9000;',
      '}',
      'html.dt-in-game #dt-v9-director{',
      '  right:14px;bottom:14px;z-index:9050;',
      '}',
      'html.dt-in-game #dt-hub-chip{',
      '  top:10px;right:10px;opacity:.85;font-size:10px;padding:5px 9px;',
      '}',
      'html.dt-in-game #dt-hub-fallback{bottom:56px}',

      '@media(max-width:720px){',
      '  #menu-overlay .menu-ctrl-grid{grid-template-columns:1fr!important}',
      '  #menu-overlay .menu-card{padding:20px 16px!important}',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function wireControlsToggle() {
    var controls = document.querySelector('#menu-overlay .menu-controls');
    if (!controls || document.getElementById('dt-controls-toggle')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'dt-controls-toggle';
    btn.innerHTML = 'Controls & systems <span>Show</span>';
    controls.classList.remove('is-open');
    controls.parentNode.insertBefore(btn, controls);
    btn.addEventListener('click', function () {
      var open = controls.classList.toggle('is-open');
      btn.innerHTML = open
        ? 'Controls & systems <span>Hide</span>'
        : 'Controls & systems <span>Show</span>';
    });
  }

  function slimBadges() {
    var wrap = document.querySelector('#menu-overlay .menu-sys-badges');
    if (!wrap || wrap.dataset.dtSlimmed) return;
    wrap.dataset.dtSlimmed = '1';
    var badges = wrap.querySelectorAll('.sys-badge');
    for (var i = badges.length - 1; i >= 2; i--) {
      badges[i].parentNode.removeChild(badges[i]);
    }
    var sub = document.getElementById('menu-subtitle');
    if (sub && sub.textContent !== 'Select a theater · Deploy when ready') {
      sub.textContent = 'Select a theater · Deploy when ready';
    }
  }

  /**
   * Cheap late-mount poll (no body MutationObserver).
   * Inject panels may appear after this script; re-apply a few times only.
   */
  function scheduleLateMountSync() {
    if (lateMountTimer) return;
    lateMountTicks = 0;
    lateMountTimer = setInterval(function () {
      lateMountTicks += 1;
      wireControlsToggle();
      slimBadges();
      applyChromeVisibility(true);
      // Stop once chrome nodes exist or after a short window
      var haveChrome =
        document.getElementById('dt-v9-director') ||
        document.getElementById('dt-lab-panel');
      if ((haveChrome && lateMountTicks >= 3) || lateMountTicks >= 12) {
        clearInterval(lateMountTimer);
        lateMountTimer = null;
      }
    }, 250);
  }

  function watchMenu() {
    var menu = getMenu();
    if (!menu) {
      // Menu not in DOM yet — retry briefly without body subtree watch
      var tries = 0;
      var t = setInterval(function () {
        tries += 1;
        if (getMenu() || tries > 40) {
          clearInterval(t);
          if (getMenu()) {
            watchMenu();
            wireControlsToggle();
            slimBadges();
            applyChromeVisibility(true);
          }
        }
      }, 100);
      return;
    }

    applyChromeVisibility(true);

    if (menuObserver) {
      menuObserver.disconnect();
      menuObserver = null;
    }

    // ONLY watch the menu overlay class list — never body/subtree.
    menuObserver = new MutationObserver(function () {
      applyChromeVisibility(false);
    });
    menuObserver.observe(menu, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  function init() {
    injectCss();
    wireControlsToggle();
    slimBadges();
    watchMenu();
    scheduleLateMountSync();
    // A couple of deferred force syncs for inject order; no continuous body watch
    setTimeout(function () {
      wireControlsToggle();
      slimBadges();
      applyChromeVisibility(true);
    }, 50);
    setTimeout(function () {
      applyChromeVisibility(true);
    }, 400);
  }

  // Remember if user deliberately opens Director (O)
  document.addEventListener(
    'keydown',
    function (e) {
      if (e.code === 'KeyO' && !e.repeat) {
        var dir = document.getElementById('dt-v9-director');
        if (dir) dir.dataset.dtUserOpened = '1';
      }
    },
    true
  );

  // Public hook for tests / debug
  window.__dtApplyChromeVisibility = function (force) {
    applyChromeVisibility(!!force);
  };
  window.__dtIsMenuOpen = isMenuOpen;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
