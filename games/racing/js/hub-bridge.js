/**
 * VEIL RUSH — hub embed bridge v1
 * Embed badge, quick-race hint, and open-full-tab recovery.
 */
(function () {
  'use strict';
  if (window.__veilRushHubBridge) return;
  window.__veilRushHubBridge = 'v1';

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
    if (document.getElementById('vr-hub-bridge-css')) return;
    var s = document.createElement('style');
    s.id = 'vr-hub-bridge-css';
    s.textContent = [
      '#vr-hub-chip{position:fixed;top:12px;right:12px;z-index:9000;',
      'font-family:IBM Plex Sans,system-ui,sans-serif;font-size:11px;font-weight:700;',
      'padding:7px 11px;border-radius:999px;letter-spacing:.04em;',
      'border:1px solid rgba(56,189,248,.28);color:#7dd3fc;',
      'background:rgba(6,12,24,.82);backdrop-filter:blur(10px);pointer-events:none}',
      '#vr-hub-chip strong{color:#38bdf8}',
      '#vr-hub-tip{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);',
      'z-index:9001;max-width:min(92vw,420px);padding:10px 14px;border-radius:12px;',
      'font-family:IBM Plex Sans,system-ui,sans-serif;font-size:11px;line-height:1.5;',
      'color:#cbd5e1;background:rgba(8,14,28,.9);border:1px solid rgba(56,189,248,.2);',
      'text-align:center;transition:opacity .4s ease}',
      '#vr-hub-tip.vr-hub-tip-hide{opacity:0;pointer-events:none}',
      '#vr-hub-tip a{color:#38bdf8;font-weight:700;text-decoration:none;margin-left:6px}'
    ].join('');
    document.head.appendChild(s);
  }

  function mountChrome() {
    if (!isEmbed()) return;
    injectStyles();
    document.body.classList.add('vr-embedded');

    var chip = document.createElement('div');
    chip.id = 'vr-hub-chip';
    chip.innerHTML = 'Hub · <strong>VEIL RUSH</strong>';
    document.body.appendChild(chip);

    var tip = document.createElement('div');
    tip.id = 'vr-hub-tip';
    tip.innerHTML =
      'Use <strong>Quick Race</strong> to skip cinematics in the hub iframe.' +
      '<a href="' + standaloneHref() + '" target="_blank" rel="noopener noreferrer">Open full tab ↗</a>';
    document.body.appendChild(tip);
    setTimeout(function () {
      tip.classList.add('vr-hub-tip-hide');
    }, 9000);
  }

  window.__veilRushIsEmbed = isEmbed;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountChrome);
  } else {
    mountChrome();
  }
})();
