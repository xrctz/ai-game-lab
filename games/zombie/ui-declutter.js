/**
 * DeadTakeover UI declutter (v21)
 * - Hide Lab+/Director/hub chrome while the main menu is open
 * - Show inject tools only after Deploy / during play
 * - Extra spacing rules for menu card (less cramped)
 */
(function () {
  'use strict';
  if (window.__dtUiDeclutter) return;
  window.__dtUiDeclutter = 'v21';

  var STYLE_ID = 'dt-ui-declutter-css';
  var SELECTORS = [
    '#dt-v9-director',
    '#dt-lab-panel',
    '#dt-hub-chip',
    '#dt-hub-fallback'
  ];

  function isMenuOpen() {
    var menu = document.getElementById('menu-overlay');
    if (!menu) return false;
    return !menu.classList.contains('is-hidden');
  }

  function applyChromeVisibility() {
    var open = isMenuOpen();
    document.documentElement.classList.toggle('dt-menu-open', open);
    document.documentElement.classList.toggle('dt-in-game', !open);
    SELECTORS.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) return;
      if (open) {
        el.setAttribute('data-dt-boot-hidden', '1');
        el.style.setProperty('display', 'none', 'important');
      } else {
        if (el.getAttribute('data-dt-boot-hidden') === '1') {
          el.removeAttribute('data-dt-boot-hidden');
          // restore natural display from stylesheet
          el.style.removeProperty('display');
        }
        // Lab panel stays off in hub embed (director CSS already enforces this)
        if (el.id === 'dt-lab-panel' && document.body.classList.contains('dt-embedded')) {
          el.style.setProperty('display', 'none', 'important');
        }
      }
    });
    // Director starts minimized when revealed in-game
    if (!open) {
      var dir = document.getElementById('dt-v9-director');
      if (dir && !dir.dataset.dtUserOpened) {
        dir.classList.add('dt-v9-mini');
        var minBtn = document.getElementById('dt-v9-min');
        if (minBtn) minBtn.textContent = 'Open';
      }
    }
  }

  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '/* Declutter markers */',
      'html.dt-menu-open #dt-v9-director,',
      'html.dt-menu-open #dt-lab-panel,',
      'html.dt-menu-open #dt-hub-chip,',
      'html.dt-menu-open #dt-hub-fallback{display:none!important}',

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
      /* avoid fighting bottom message bar */
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
    // keep first two only
    var badges = wrap.querySelectorAll('.sys-badge');
    badges.forEach(function (b, i) {
      if (i > 1) b.remove();
    });
    var sub = document.getElementById('menu-subtitle');
    if (sub) sub.textContent = 'Select a theater · Deploy when ready';
  }

  function watchMenu() {
    var menu = document.getElementById('menu-overlay');
    if (!menu) return;
    applyChromeVisibility();
    var obs = new MutationObserver(function () {
      applyChromeVisibility();
    });
    obs.observe(menu, { attributes: true, attributeFilter: ['class'] });
    // also re-run when inject layers mount late
    var bodyObs = new MutationObserver(function () {
      applyChromeVisibility();
      wireControlsToggle();
      slimBadges();
    });
    bodyObs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { bodyObs.disconnect(); }, 8000);
  }

  function init() {
    injectCss();
    wireControlsToggle();
    slimBadges();
    watchMenu();
    applyChromeVisibility();
    // Re-apply after other injects finish mounting
    setTimeout(applyChromeVisibility, 50);
    setTimeout(applyChromeVisibility, 400);
    setTimeout(applyChromeVisibility, 1200);
  }

  // When user opens director via O, remember preference
  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyO' && !e.repeat) {
      var dir = document.getElementById('dt-v9-director');
      if (dir) dir.dataset.dtUserOpened = '1';
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
