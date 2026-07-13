/**
 * Midnight Watch — hub embed bridge v1
 */
(function () {
  'use strict';
  if (window.__fnafHubBridge) return;
  window.__fnafHubBridge = 'v1';

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

  function injectStyles() {
    if (document.getElementById('fnaf-hub-bridge-css')) return;
    var s = document.createElement('style');
    s.id = 'fnaf-hub-bridge-css';
    s.textContent = [
      '#fnaf-hub-chip{position:fixed;top:10px;right:10px;z-index:12000;',
      'font-family:system-ui,sans-serif;font-size:10px;font-weight:700;letter-spacing:.06em;',
      'padding:6px 10px;border-radius:999px;border:1px solid rgba(167,139,250,.35);',
      'color:#c4b5fd;background:rgba(10,8,20,.85);pointer-events:none}',
      '#fnaf-hub-tip{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:12000;',
      'max-width:min(92vw,380px);padding:9px 12px;border-radius:10px;font-size:11px;line-height:1.45;',
      'color:#e9d5ff;background:rgba(12,8,24,.92);border:1px solid rgba(167,139,250,.25);text-align:center}',
      '#fnaf-hub-tip a{color:#a78bfa;font-weight:700;text-decoration:none;margin-left:6px}',
      'body.fnaf-embedded #title-screen{padding-bottom:72px}'
    ].join('');
    document.head.appendChild(s);
  }

  function mountChrome() {
    if (!isEmbed()) return;
    injectStyles();
    document.body.classList.add('fnaf-embedded');

    var chip = document.createElement('div');
    chip.id = 'fnaf-hub-chip';
    chip.textContent = 'Hub · Midnight Watch';
    document.body.appendChild(chip);

    if (Math.min(window.innerWidth, window.innerHeight) < 560) {
      var tip = document.createElement('div');
      tip.id = 'fnaf-hub-tip';
      tip.innerHTML =
        'Horror games work best full screen on phones.' +
        '<a href="' + standaloneHref() + '" target="_blank" rel="noopener noreferrer">Open tab ↗</a>';
      document.body.appendChild(tip);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountChrome);
  } else {
    mountChrome();
  }
})();
