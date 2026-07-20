/**
 * Midnight Watch — hub inject layer (v1)
 * Soft polish only: embed chrome, tip toast, reduced-motion class.
 * Does not modify the Vite bundle.
 */
(function () {
  'use strict';
  if (window.__mwLab) return;
  window.__mwLab = 'v1';

  var IS_EMBED = false;
  try {
    IS_EMBED =
      new URLSearchParams(location.search).get('embed') === '1' ||
      window.self !== window.top;
  } catch (_) {
    IS_EMBED = true;
  }

  var TIPS = [
    'Doors and lights drain power — peek before you seal.',
    'Cam 5 kitchen may be audio-only. Trust your ears.',
    'Closing the tablet briefly locks doors. Be ready.',
    'Hold Z / C for hall lights. Tap Q / E for doors.',
    'IR (I) helps in dark cams but burns power.',
    'Survive to 6 AM. Silence is a resource.'
  ];

  function injectStyles() {
    if (document.getElementById('mw-lab-style')) return;
    var s = document.createElement('style');
    s.id = 'mw-lab-style';
    s.textContent = [
      'body.mw-embedded #title-screen .title-content{',
      '  max-width:min(520px,92vw);margin:0 auto}',
      '#mw-lab-tip{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);',
      '  z-index:40;max-width:min(480px,90vw);padding:9px 14px;border-radius:10px;',
      '  background:rgba(4,8,6,.82);border:1px solid rgba(80,220,120,.28);',
      '  color:#c8f5d4;font:600 12px/1.4 ui-monospace,Menlo,monospace;',
      '  text-align:center;opacity:0;pointer-events:none;transition:opacity .45s ease;',
      '  letter-spacing:.02em;backdrop-filter:blur(6px)}',
      '#mw-lab-tip.visible{opacity:1}',
      '#mw-lab-tip .kicker{display:block;color:#5dff96;font-size:10px;',
      '  text-transform:uppercase;letter-spacing:.14em;margin-bottom:3px}',
      '#mw-lab-chip{position:fixed;top:10px;right:12px;z-index:35;',
      '  font:700 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;',
      '  color:rgba(180,255,200,.55);text-transform:uppercase;pointer-events:none}',
      'body.mw-embedded #mw-lab-chip{color:rgba(180,255,200,.4)}',
      'html.mw-reduced-motion #mw-lab-tip{transition:none!important}'
    ].join('');
    document.head.appendChild(s);
  }

  function preferReducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) {
      return false;
    }
  }

  function createChip() {
    var chip = document.createElement('div');
    chip.id = 'mw-lab-chip';
    chip.textContent = IS_EMBED ? 'Midnight Watch · hub' : 'Midnight Watch';
    document.body.appendChild(chip);
  }

  function createTip() {
    var tip = document.createElement('div');
    tip.id = 'mw-lab-tip';
    tip.innerHTML = '<span class="kicker">Night tip</span><span class="body"></span>';
    document.body.appendChild(tip);
    return tip;
  }

  function showTip() {
    var tip = document.getElementById('mw-lab-tip') || createTip();
    var body = tip.querySelector('.body');
    if (!body) return;
    var title = document.getElementById('title-screen');
    var hud = document.getElementById('hud');
    var titleHidden = !title || title.classList.contains('hidden');
    var hudVisible = hud && !hud.classList.contains('hidden');
    if (!titleHidden && !hudVisible) return;
    body.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
    tip.classList.add('visible');
    clearTimeout(showTip._t);
    showTip._t = setTimeout(function () {
      tip.classList.remove('visible');
    }, 4500);
  }

  function bindStartTip() {
    var btn = document.getElementById('btn-start');
    if (!btn) return;
    btn.addEventListener('click', function () {
      setTimeout(showTip, 2200);
    });
  }

  function init() {
    injectStyles();
    if (IS_EMBED) document.body.classList.add('mw-embedded');
    if (preferReducedMotion()) document.documentElement.classList.add('mw-reduced-motion');
    createChip();
    createTip();
    bindStartTip();
    setInterval(function () {
      var hud = document.getElementById('hud');
      if (hud && !hud.classList.contains('hidden')) showTip();
    }, 42000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
