/**
 * Dead Zone hub bridge v20
 * Improves embed detection, open-in-new-tab links, and quality hooks.
 */
(function () {
  'use strict';
  window.__deadZoneHubBridge = 'v20';

  function isEmbed() {
    try {
      if (window.self !== window.top) return true;
    } catch (e) {
      return true;
    }
    return /(?:^|[?&])embed=1(?:&|$)/.test(location.search);
  }

  function standaloneHref() {
    try {
      var u = new URL(location.href);
      u.searchParams.delete('embed');
      return u.pathname + (u.search ? u.search : '') + u.hash;
    } catch (e) {
      return './index.html';
    }
  }

  function ensureOpenTabLink() {
    var link = document.getElementById('open-new-tab');
    if (!link) return;
    link.href = standaloneHref();
    link.setAttribute('rel', 'noopener noreferrer');
  }

  function showLockError() {
    var overlay = document.getElementById('embed-overlay');
    var err = document.getElementById('embed-lock-error');
    if (overlay) overlay.style.display = 'grid';
    if (err) err.style.display = 'block';
    ensureOpenTabLink();
  }

  function hideOverlay() {
    var overlay = document.getElementById('embed-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  document.addEventListener('pointerlockerror', function () {
    if (isEmbed()) showLockError();
  });

  document.addEventListener('pointerlockchange', function () {
    if (document.pointerLockElement) hideOverlay();
  });

  function syncMapChoices() {
    var choices = document.querySelectorAll('.map-card[data-map]');
    choices.forEach(function (choice) {
      choice.addEventListener('click', function () {
        choices.forEach(function (item) {
          item.setAttribute('aria-pressed', item === choice ? 'true' : 'false');
        });
      });
    });
  }

  function initializeBridge() {
    syncMapChoices();
    if (!isEmbed()) return;

    document.documentElement.classList.add('dz-embedded');
    document.body.classList.add('dz-embedded');
    ensureOpenTabLink();
    // Prefer full-tab hint on small viewports
    if (Math.min(window.innerWidth, window.innerHeight) < 520) {
      var err = document.getElementById('embed-lock-error');
      if (err) {
        err.style.display = 'block';
        var tip = err.querySelector('.dz-mobile-tip');
        if (!tip) {
          tip = document.createElement('div');
          tip.className = 'dz-mobile-tip';
          tip.style.cssText = 'font-size:11px;color:#aaa;margin-top:8px;line-height:1.45';
          tip.textContent = 'Small screens often block iframe pointer lock — open full tab for best controls.';
          err.appendChild(tip);
        }
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBridge, { once: true });
  } else {
    initializeBridge();
  }

  window.__deadZoneShowLockError = showLockError;
  window.__deadZoneHideOverlay = hideOverlay;
})();
