/**
 * DeadTakeover accessibility layer.
 * Adds motion preferences, dialog focus management, and useful screen-reader
 * semantics without coupling to the minified game bundle.
 */
(function () {
  'use strict';
  if (window.__dtAccessibility) return;

  var menu = null;
  var guide = null;
  var canvas = null;
  var activeDialog = null;
  var guideReturnFocus = null;
  var motionQuery = null;

  function $(id) {
    return document.getElementById(id);
  }

  function isMenuOpen() {
    return !!menu && !menu.classList.contains('is-hidden');
  }

  function isGuideOpen() {
    return !!guide && guide.classList.contains('open');
  }

  function focusableWithin(root) {
    if (!root) return [];
    return Array.prototype.filter.call(
      root.querySelectorAll('button, [href], input, select, textarea, [tabindex]'),
      function (element) {
        return !element.disabled &&
          element.getAttribute('aria-hidden') !== 'true' &&
          element.getAttribute('tabindex') !== '-1' &&
          element.getClientRects().length > 0;
      }
    );
  }

  function focusFirst(root, preferred) {
    var target = preferred && $(preferred);
    if (!target || !root.contains(target) || target.getClientRects().length === 0) {
      var candidates = focusableWithin(root);
      target = candidates.length ? candidates[0] : root;
    }
    if (target && typeof target.focus === 'function') {
      window.setTimeout(function () { target.focus(); }, 0);
    }
  }

  function syncDialogs() {
    var menuOpen = isMenuOpen();
    var guideOpen = isGuideOpen();

    if (menu) menu.setAttribute('aria-hidden', menuOpen ? 'false' : 'true');
    if (guide) guide.setAttribute('aria-hidden', guideOpen ? 'false' : 'true');
    if (canvas) canvas.tabIndex = menuOpen || guideOpen ? -1 : 0;

    var nextDialog = guideOpen ? guide : (menuOpen ? menu : null);
    if (nextDialog === activeDialog) return;
    var previousDialog = activeDialog;
    activeDialog = nextDialog;

    if (guideOpen) {
      if (previousDialog !== guide) guideReturnFocus = document.activeElement;
      focusFirst(guide, 'dt-close-guide');
    } else if (menuOpen) {
      focusFirst(menu, 'btn-start');
    } else if (previousDialog === guide && guideReturnFocus &&
      document.contains(guideReturnFocus) && typeof guideReturnFocus.focus === 'function') {
      guideReturnFocus.focus();
      guideReturnFocus = null;
    } else if (canvas && typeof canvas.focus === 'function') {
      canvas.focus();
    }
  }

  function trapDialogFocus(event) {
    if (event.key === 'Escape' && isGuideOpen()) {
      event.preventDefault();
      event.stopPropagation();
      guide.classList.remove('open');
      return;
    }
    if (event.key !== 'Tab' || !activeDialog) return;

    var focusable = focusableWithin(activeDialog);
    if (!focusable.length) {
      event.preventDefault();
      activeDialog.focus();
      return;
    }

    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !activeDialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function syncControlsToggle() {
    var toggle = $('dt-controls-toggle');
    var controls = menu && menu.querySelector('.menu-controls');
    if (!toggle || !controls) return;
    if (!controls.id) controls.id = 'dt-menu-controls';
    toggle.setAttribute('aria-controls', controls.id);
    toggle.setAttribute('aria-expanded', controls.classList.contains('is-open') ? 'true' : 'false');
  }

  function enhanceProgress(id, label) {
    var bar = $(id);
    if (!bar) return;
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', label);
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');

    function syncValue() {
      var value = parseFloat(bar.style.width);
      if (isNaN(value)) value = 100;
      bar.setAttribute('aria-valuenow', String(Math.round(Math.max(0, Math.min(100, value)))));
    }
    syncValue();
    new MutationObserver(syncValue).observe(bar, {
      attributes: true,
      attributeFilter: ['style']
    });
  }

  function applyMotionPreference() {
    var reduce = !!(motionQuery && motionQuery.matches);
    document.documentElement.classList.toggle('dt-reduced-motion', reduce);
  }

  function addSemantics() {
    menu = $('menu-overlay');
    guide = $('dt-field-guide');
    canvas = $('game');

    if (menu) {
      menu.setAttribute('role', 'dialog');
      menu.setAttribute('aria-modal', 'true');
      menu.setAttribute('aria-labelledby', 'menu-title');
      menu.tabIndex = -1;
      new MutationObserver(syncDialogs).observe(menu, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    if (guide) {
      guide.setAttribute('role', 'dialog');
      guide.setAttribute('aria-modal', 'true');
      guide.setAttribute('aria-labelledby', 'dt-field-guide-title');
      guide.setAttribute('aria-hidden', 'true');
      guide.tabIndex = -1;
      var title = guide.querySelector('h2');
      if (title) title.id = 'dt-field-guide-title';
      new MutationObserver(syncDialogs).observe(guide, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    if (canvas) {
      canvas.setAttribute('role', 'application');
      canvas.setAttribute(
        'aria-label',
        'DeadTakeover game. Use W A S D to move, Shift to sprint, and the mouse to aim and shoot.'
      );
    }

    var message = $('message');
    if (message) {
      message.setAttribute('role', 'status');
      message.setAttribute('aria-live', 'polite');
    }
    var alert = $('top-center-alert');
    if (alert) {
      alert.setAttribute('role', 'status');
      alert.setAttribute('aria-live', 'assertive');
    }
    var wave = $('wave-announce');
    if (wave) {
      wave.setAttribute('role', 'status');
      wave.setAttribute('aria-live', 'assertive');
      wave.setAttribute('aria-atomic', 'true');
    }

    enhanceProgress('health-fill', 'Health');
    enhanceProgress('stamina-fill', 'Stamina');
    syncControlsToggle();
    syncDialogs();
  }

  function injectStyles() {
    var style = document.createElement('style');
    style.id = 'dt-accessibility-css';
    style.textContent = [
      ':where(button,a,input,select,textarea,[tabindex]):focus-visible{',
      'outline:3px solid #ffd666!important;outline-offset:3px!important;',
      'box-shadow:0 0 0 5px rgba(5,8,16,.8)!important;',
      '}',
      '.dt-reduced-motion *,',
      '.dt-reduced-motion *::before,',
      '.dt-reduced-motion *::after{',
      'animation-duration:.01ms!important;',
      'animation-iteration-count:1!important;',
      'scroll-behavior:auto!important;',
      'transition-duration:.01ms!important;',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();
    try {
      motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      applyMotionPreference();
      if (motionQuery.addEventListener) motionQuery.addEventListener('change', applyMotionPreference);
      else if (motionQuery.addListener) motionQuery.addListener(applyMotionPreference);
    } catch (error) {}

    addSemantics();
    document.addEventListener('keydown', trapDialogFocus, true);
    document.addEventListener('click', function (event) {
      if (event.target && event.target.closest && event.target.closest('#dt-controls-toggle')) {
        window.setTimeout(syncControlsToggle, 0);
      }
    });
  }

  window.__dtAccessibility = {
    sync: syncDialogs,
    isReducedMotion: function () {
      return document.documentElement.classList.contains('dt-reduced-motion');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
