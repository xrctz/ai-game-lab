/**
 * DeadTakeover hub embed bridge v20
 * Polishes iframe play: open-in-new-tab recovery, quality badge, postMessage focus.
 */
(function () {
  'use strict';
  if (window.__dtHubEmbedBridge) return;
  window.__dtHubEmbedBridge = 'v20';

  function isEmbed() {
    try {
      if (window.self !== window.top) return true;
    } catch (e) {
      return true;
    }
    return /(?:^|[?&])embed=1(?:&|$)/.test(location.search);
  }

  function qualityFromQuery() {
    try {
      var q = new URLSearchParams(location.search).get('quality') || 'balanced';
      if (q === 'low' || q === 'high' || q === 'balanced') return q;
    } catch (e) {}
    return 'balanced';
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
    var s = document.createElement('style');
    s.id = 'dt-hub-embed-bridge-css';
    s.textContent = [
      '#dt-hub-chip{position:fixed;top:12px;right:12px;z-index:9500;',
      'font-family:Inter,system-ui,sans-serif;font-size:11px;font-weight:700;',
      'padding:7px 11px;border-radius:999px;letter-spacing:.03em;',
      'border:1px solid rgba(53,231,255,.22);color:#8a96be;',
      'background:rgba(6,10,22,.82);backdrop-filter:blur(10px);',
      'box-shadow:0 8px 24px rgba(0,0,0,.35);pointer-events:none}',
      '#dt-hub-chip strong{color:#35e7ff;font-weight:800}',
      '#dt-hub-fallback{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);',
      'z-index:9600;display:none;gap:8px;align-items:center;',
      'font-family:Inter,system-ui,sans-serif}',
      '#dt-hub-fallback.show{display:flex}',
      '#dt-hub-fallback a{',
      'padding:9px 14px;border-radius:12px;text-decoration:none;font-weight:800;font-size:12px;',
      'border:1px solid rgba(255,79,216,.35);color:#ffb0ea;',
      'background:linear-gradient(165deg,rgba(20,8,28,.9),rgba(8,6,16,.92));',
      'box-shadow:0 10px 28px rgba(0,0,0,.35)}',
      '#dt-hub-fallback a:hover{border-color:rgba(53,231,255,.4);color:#35e7ff}'
    ].join('');
    document.head.appendChild(s);
  }

  function mountChrome() {
    if (!isEmbed()) return;
    injectStyles();
    var chip = document.createElement('div');
    chip.id = 'dt-hub-chip';
    chip.innerHTML = 'Hub embed · quality <strong>' + qualityFromQuery() + '</strong>';
    document.body.appendChild(chip);

    var bar = document.createElement('div');
    bar.id = 'dt-hub-fallback';
    bar.innerHTML = '<a id="dt-hub-open-tab" href="' + standaloneHref() + '" target="_blank" rel="noopener noreferrer">Open full tab</a>';
    document.body.appendChild(bar);

    document.addEventListener('pointerlockerror', function () {
      bar.classList.add('show');
    });
    // Esc from pointer lock: soft hint
    document.addEventListener('pointerlockchange', function () {
      if (!document.pointerLockElement && isEmbed()) {
        setTimeout(function () {
          if (!document.pointerLockElement) bar.classList.add('show');
        }, 400);
      } else {
        bar.classList.remove('show');
      }
    });
  }

  window.addEventListener('message', function (ev) {
    if (!ev || !ev.data) return;
    if (ev.data.type === 'dt-hub-focus' || ev.data.type === 'aigl-focus-game') {
      try {
        var c = document.querySelector('canvas');
        if (c) c.focus();
      } catch (e) {}
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountChrome);
  } else {
    mountChrome();
  }
})();
