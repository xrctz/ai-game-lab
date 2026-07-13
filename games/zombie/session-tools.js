/**
 * DeadTakeover session tools (dtx layer, v1).
 * - Session stats report overlay (X): time, wave, kills, score, session FPS.
 * - Hotkey cheatsheet overlay (/): every game + overlay binding in one card.
 * - Canvas screenshot capture (F2 / Director "Shot" button): downloads a PNG
 *   of the live WebGL frame. Uses a requestAnimationFrame wrapper plus draw
 *   call detection so toBlob reads a valid buffer without preserveDrawingBuffer.
 * Everything reads game state from exposed globals / HUD DOM only and degrades
 * silently when that state is unavailable. No bundle modification.
 */
(function(){
  'use strict';
  if(window.__dtxSessionTools) return;
  window.__dtxSessionTools = 'v1';

  function $(id){ return document.getElementById(id); }
  function textOf(id){ var el = $(id); return el ? (el.textContent || '') : ''; }
  function parseNum(text, re){
    var m = text.match(re);
    return m ? parseInt(m[1], 10) : null;
  }
  function setMessage(msg){
    var m = $('message');
    if(!m) return;
    var icon = m.querySelector('.msg-icon');
    m.textContent = '';
    if(icon) m.appendChild(icon);
    m.appendChild(document.createTextNode(' ' + msg));
  }
  function pad2(n){ return n < 10 ? '0' + n : String(n); }

  /* ══════════ Session FPS / progress sampling ══════════ */

  var sessionStart = Date.now();
  var fpsSum = 0, fpsCount = 0, fpsMin = Infinity, fpsMax = 0;
  var bestWave = 0;

  function isGameplayActive(){
    var fx = window.__dtVisualEffects;
    if(fx && fx.isGameplayActive){
      try { return fx.isGameplayActive(); } catch(e){ return false; }
    }
    var menu = $('menu-overlay');
    return !menu || menu.classList.contains('is-hidden');
  }

  function sampleSession(){
    if(!isGameplayActive()) return;
    var snap = window.__zombiePerfSnapshot ? window.__zombiePerfSnapshot() : null;
    if(snap && snap.fps > 0){
      fpsSum += snap.fps;
      fpsCount++;
      if(snap.fps < fpsMin) fpsMin = snap.fps;
      if(snap.fps > fpsMax) fpsMax = snap.fps;
    }
    var wave = parseNum(textOf('world-stats'), /Wave\s*(\d+)/i);
    if(wave !== null && wave > bestWave) bestWave = wave;
  }

  function sessionTime(){
    var fx = window.__dtVisualEffects;
    if(fx && fx.getSessionTime){
      try { return fx.getSessionTime(); } catch(e){}
    }
    var s = Math.floor((Date.now() - sessionStart) / 1000);
    return pad2(Math.floor(s / 60)) + ':' + pad2(s % 60);
  }

  /* ══════════ Styles ══════════ */

  function injectStyles(){
    var s = document.createElement('style');
    s.id = 'dtx-session-tools-css';
    s.textContent = [
      '.dtx-overlay{',
      '  position:fixed;inset:0;z-index:12500;display:none;place-items:center;',
      '  background:rgba(0,0,0,.72);backdrop-filter:blur(8px);',
      '  font-family:var(--dt-font,Inter,system-ui,sans-serif);color:var(--dt-text,#eaf0ff);padding:18px;',
      '}',
      '.dtx-overlay.dtx-open{display:grid}',
      '.dtx-card{',
      '  position:relative;width:min(560px,100%);max-height:88vh;overflow-y:auto;',
      '  border:1px solid var(--dt-line,rgba(90,220,255,.14));border-radius:24px;',
      '  background:linear-gradient(165deg,rgba(12,18,42,.97),rgba(6,8,20,.98));',
      '  box-shadow:0 32px 80px rgba(0,0,0,.5),0 0 40px rgba(53,231,255,.05);',
      '  padding:26px 28px;scrollbar-width:thin;',
      '}',
      '.dtx-card::before{',
      '  content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;',
      '  background:linear-gradient(135deg,rgba(53,231,255,.3),rgba(155,92,255,.15),rgba(255,79,216,.15));',
      '  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);',
      '  mask-composite:exclude;pointer-events:none;',
      '}',
      '.dtx-head{',
      '  display:flex;align-items:center;justify-content:space-between;gap:12px;',
      '  margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,.06);',
      '}',
      '.dtx-head h2{',
      '  font-family:var(--dt-font-display,Orbitron,sans-serif);font-size:1.25rem;font-weight:900;',
      '  letter-spacing:.05em;margin:0;text-transform:uppercase;',
      '  background:linear-gradient(90deg,var(--dt-cyan,#35e7ff),var(--dt-violet,#9b5cff));',
      '  -webkit-background-clip:text;background-clip:text;color:transparent;',
      '}',
      '.dtx-head p{font-family:var(--dt-font-mono,monospace);font-size:.72rem;color:var(--dt-muted,#8a96be);margin:4px 0 0;letter-spacing:.04em}',
      '.dtx-close{',
      '  border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);',
      '  color:var(--dt-muted,#8a96be);border-radius:12px;padding:8px 16px;font-weight:700;',
      '  cursor:pointer;font-family:inherit;font-size:.82rem;transition:all .15s ease;',
      '}',
      '.dtx-close:hover{background:rgba(255,255,255,.1);color:var(--dt-text,#eaf0ff)}',
      '.dtx-foot{',
      '  margin-top:18px;padding-top:12px;border-top:1px solid rgba(255,255,255,.06);',
      '  font-family:var(--dt-font-mono,monospace);font-size:.68rem;color:var(--dt-dim,#5a6588);letter-spacing:.05em;',
      '}',

      '/* ── Session stats tiles ── */',
      '.dtx-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
      '.dtx-stat{',
      '  border:1px solid rgba(255,255,255,.06);border-radius:14px;',
      '  background:rgba(0,0,0,.2);padding:12px 14px;display:grid;gap:4px;',
      '  transition:border-color .2s ease;',
      '}',
      '.dtx-stat:hover{border-color:rgba(53,231,255,.2)}',
      '.dtx-stat-label{',
      '  font-family:var(--dt-font-mono,monospace);font-size:.62rem;text-transform:uppercase;',
      '  letter-spacing:.1em;color:var(--dt-dim,#5a6588);',
      '}',
      '.dtx-stat-value{',
      '  font-family:var(--dt-font-mono,monospace);font-size:1.05rem;font-weight:700;',
      '  color:var(--dt-text,#eaf0ff);letter-spacing:.02em;',
      '}',
      '.dtx-stat-value.dtx-accent{color:var(--dt-cyan,#35e7ff)}',
      '.dtx-stat-value.dtx-good{color:var(--dt-lime,#5dff96)}',
      '.dtx-stat-value.dtx-warn{color:var(--dt-orange,#ffb86c)}',

      '/* ── Cheatsheet ── */',
      '.dtx-keys-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}',
      '.dtx-keys-section{',
      '  border:1px solid rgba(255,255,255,.06);border-radius:14px;',
      '  background:rgba(0,0,0,.18);padding:14px 16px;',
      '}',
      '.dtx-keys-section h3{',
      '  font-family:var(--dt-font-mono,monospace);font-size:.66rem;text-transform:uppercase;',
      '  letter-spacing:.12em;color:var(--dt-cyan,#35e7ff);font-weight:700;margin:0 0 10px;',
      '}',
      '.dtx-keys-section.dtx-keys-tools h3{color:var(--dt-violet,#9b5cff)}',
      '.dtx-key-row{',
      '  display:flex;align-items:center;justify-content:space-between;gap:10px;',
      '  font-size:.76rem;color:var(--dt-muted,#8a96be);line-height:1.9;',
      '}',
      '.dtx-key-row kbd{',
      '  font-family:var(--dt-font-mono,monospace);font-size:.68rem;border:1px solid var(--dt-line,rgba(90,220,255,.14));',
      '  border-bottom-width:2px;border-radius:5px;padding:1px 7px;',
      '  background:rgba(255,255,255,.06);color:var(--dt-text,#eaf0ff);white-space:nowrap;',
      '}',

      '/* ── Screenshot flash ── */',
      '#dtx-shot-flash{',
      '  position:fixed;inset:0;z-index:13000;pointer-events:none;',
      '  background:#fff;opacity:0;',
      '}',
      '#dtx-shot-flash.dtx-flash{animation:dtx-flash-anim .35s ease-out}',
      '@keyframes dtx-flash-anim{0%{opacity:.55}100%{opacity:0}}',

      '@media(max-width:720px){',
      '  .dtx-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}',
      '  .dtx-keys-grid{grid-template-columns:1fr}',
      '  .dtx-card{padding:18px}',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ══════════ Session stats overlay (X) ══════════ */

  var statsOverlay = null;
  var statsRefreshTimer = null;

  function buildStatsOverlay(){
    statsOverlay = document.createElement('div');
    statsOverlay.id = 'dtx-stats-overlay';
    statsOverlay.className = 'dtx-overlay';
    statsOverlay.innerHTML = [
      '<div class="dtx-card">',
      '  <div class="dtx-head">',
      '    <div>',
      '      <h2>Session Report</h2>',
      '      <p>Live run telemetry · updates while open</p>',
      '    </div>',
      '    <button class="dtx-close" id="dtx-stats-close" type="button">\u2715 Close</button>',
      '  </div>',
      '  <div class="dtx-stat-grid" id="dtx-stat-grid"></div>',
      '  <div class="dtx-foot">Press <b>X</b> or <b>Esc</b> to close \u00b7 <b>/</b> shows all hotkeys</div>',
      '</div>',
    ].join('\n');
    document.body.appendChild(statsOverlay);

    $('dtx-stats-close').addEventListener('click', closeStatsOverlay);
    statsOverlay.addEventListener('click', function(e){
      if(e.target === statsOverlay) closeStatsOverlay();
    });
  }

  function statTile(label, value, cls){
    return '<div class="dtx-stat"><span class="dtx-stat-label">' + label + '</span>'
      + '<span class="dtx-stat-value' + (cls ? ' ' + cls : '') + '">' + value + '</span></div>';
  }

  function renderStats(){
    var grid = $('dtx-stat-grid');
    if(!grid) return;

    var statsText = textOf('stats-meta');
    var extraText = textOf('extra-meta');
    var worldText = textOf('world-stats');
    var kills = parseNum(statsText, /Kills:\s*(\d+)/i);
    var zombies = parseNum(statsText, /Zombies:\s*(\d+)/i);
    var score = parseNum(extraText, /Score:\s*(\d+)/i);
    var wave = parseNum(worldText, /Wave\s*(\d+)/i);
    var snap = window.__zombiePerfSnapshot ? window.__zombiePerfSnapshot() : null;
    var stream = window.__zombieGetStreamingStats ? window.__zombieGetStreamingStats() : null;

    var avgFps = fpsCount ? Math.round(fpsSum / fpsCount) : null;
    var avgCls = avgFps === null ? '' : avgFps >= 50 ? 'dtx-good' : avgFps >= 30 ? 'dtx-warn' : '';

    grid.innerHTML = [
      statTile('Time Survived', sessionTime(), 'dtx-accent'),
      statTile('Wave', wave !== null ? wave : (bestWave || '--'), 'dtx-accent'),
      statTile('Kills', kills !== null ? kills : '--'),
      statTile('Score', score !== null ? score : '--'),
      statTile('Zombies Active', zombies !== null ? zombies : '--'),
      statTile('FPS Now', snap && snap.fps ? snap.fps : '--'),
      statTile('FPS Avg', avgFps !== null ? avgFps : '--', avgCls),
      statTile('FPS Min / Max', fpsCount ? (fpsMin + ' / ' + fpsMax) : '--'),
      statTile('Render Scale', snap && snap.ratio ? snap.ratio.toFixed(2) : '--'),
      statTile('Quality', snap && snap.quality ? snap.quality : '--'),
      statTile('Chunks Built', stream && stream.built !== undefined ? stream.built : '--'),
      statTile('Frame Hitches', stream && stream.hitches !== undefined ? stream.hitches : '--',
        stream && stream.hitches > 5 ? 'dtx-warn' : ''),
    ].join('');
  }

  function openStatsOverlay(){
    if(!statsOverlay) return;
    renderStats();
    statsOverlay.classList.add('dtx-open');
    if(statsRefreshTimer) clearInterval(statsRefreshTimer);
    statsRefreshTimer = setInterval(renderStats, 1000);
  }

  function closeStatsOverlay(){
    if(!statsOverlay) return;
    statsOverlay.classList.remove('dtx-open');
    if(statsRefreshTimer){
      clearInterval(statsRefreshTimer);
      statsRefreshTimer = null;
    }
  }

  function toggleStatsOverlay(){
    if(!statsOverlay) return;
    if(statsOverlay.classList.contains('dtx-open')) closeStatsOverlay();
    else { closeKeysOverlay(); openStatsOverlay(); }
  }

  /* ══════════ Hotkey cheatsheet overlay (/) ══════════ */

  var keysOverlay = null;

  function keyRow(label, keys){
    return '<div class="dtx-key-row"><span>' + label + '</span><span>' + keys + '</span></div>';
  }
  function kbd(k){ return '<kbd>' + k + '</kbd>'; }

  function buildKeysOverlay(){
    keysOverlay = document.createElement('div');
    keysOverlay.id = 'dtx-keys-overlay';
    keysOverlay.className = 'dtx-overlay';
    keysOverlay.innerHTML = [
      '<div class="dtx-card">',
      '  <div class="dtx-head">',
      '    <div>',
      '      <h2>Hotkey Reference</h2>',
      '      <p>Game bindings + overlay tools</p>',
      '    </div>',
      '    <button class="dtx-close" id="dtx-keys-close" type="button">\u2715 Close</button>',
      '  </div>',
      '  <div class="dtx-keys-grid">',
      '    <div class="dtx-keys-section">',
      '      <h3>Movement</h3>',
      keyRow('Move', kbd('W') + kbd('A') + kbd('S') + kbd('D')),
      keyRow('Sprint', kbd('Shift')),
      keyRow('Crouch', kbd('C')),
      keyRow('Jump', kbd('Space')),
      '    </div>',
      '    <div class="dtx-keys-section">',
      '      <h3>Combat</h3>',
      keyRow('Shoot / Aim', kbd('LMB') + kbd('RMB')),
      keyRow('Reload', kbd('R')),
      keyRow('Weapons', kbd('1') + '\u2013' + kbd('7')),
      keyRow('Grenade / Knife', kbd('G') + kbd('F')),
      '    </div>',
      '    <div class="dtx-keys-section">',
      '      <h3>Tactical</h3>',
      keyRow('Barricade / Cycle', kbd('B') + kbd('N')),
      keyRow('Inventory', kbd('Tab')),
      keyRow('Upgrade Bench', kbd('U')),
      keyRow('Pause / Audio', kbd('P') + kbd('M')),
      '    </div>',
      '    <div class="dtx-keys-section dtx-keys-tools">',
      '      <h3>Overlay Tools</h3>',
      keyRow('Director Panel', kbd('O')),
      keyRow('Field Guide', kbd('I')),
      keyRow('Session Report', kbd('X')),
      keyRow('Screenshot', kbd('F2')),
      keyRow('Debug Overlay', kbd('`')),
      keyRow('This Cheatsheet', kbd('/')),
      '    </div>',
      '  </div>',
      '  <div class="dtx-foot">Press <b>/</b> or <b>Esc</b> to close</div>',
      '</div>',
    ].join('\n');
    document.body.appendChild(keysOverlay);

    $('dtx-keys-close').addEventListener('click', closeKeysOverlay);
    keysOverlay.addEventListener('click', function(e){
      if(e.target === keysOverlay) closeKeysOverlay();
    });
  }

  function closeKeysOverlay(){
    if(keysOverlay) keysOverlay.classList.remove('dtx-open');
  }

  function toggleKeysOverlay(){
    if(!keysOverlay) return;
    if(keysOverlay.classList.contains('dtx-open')) closeKeysOverlay();
    else { closeStatsOverlay(); keysOverlay.classList.add('dtx-open'); }
  }

  /* ══════════ Screenshot capture (F2) ══════════ */

  var glCtx = null;
  var pendingShot = false;
  var drewThisFrame = false;
  var savedDraws = null;
  var shotTimeout = null;
  var DRAW_FNS = ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced'];

  // Grab the game's WebGL context reference when the bundle creates it.
  // This script loads before the module bundle, so the patch is in place first.
  var origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type){
    var ctx = origGetContext.apply(this, arguments);
    try {
      if(ctx && !glCtx && this.id === 'game' && /webgl/i.test(String(type))){
        glCtx = ctx;
      }
    } catch(e){}
    return ctx;
  };

  // Without preserveDrawingBuffer the frame buffer is only readable inside the
  // rAF task that drew it, so capture right after a callback that issued draws.
  var origRAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function(cb){
    if(typeof cb !== 'function') return origRAF(cb);
    return origRAF(function(ts){
      try {
        return cb(ts);
      } finally {
        if(pendingShot && drewThisFrame){
          pendingShot = false;
          drewThisFrame = false;
          captureCanvas();
        }
      }
    });
  };

  function armDrawDetect(){
    if(!glCtx || savedDraws) return;
    savedDraws = {};
    for(var i = 0; i < DRAW_FNS.length; i++){
      var name = DRAW_FNS[i];
      var fn = glCtx[name];
      if(typeof fn !== 'function') continue;
      savedDraws[name] = fn;
      glCtx[name] = (function(orig){
        return function(){
          drewThisFrame = true;
          return orig.apply(this, arguments);
        };
      })(fn);
    }
  }

  function disarmDrawDetect(){
    if(!glCtx || !savedDraws) return;
    for(var name in savedDraws){
      if(Object.prototype.hasOwnProperty.call(savedDraws, name)){
        glCtx[name] = savedDraws[name];
      }
    }
    savedDraws = null;
  }

  function fileStamp(){
    var d = new Date();
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate())
      + '_' + pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds());
  }

  function shotFlash(){
    var flash = $('dtx-shot-flash');
    if(!flash){
      flash = document.createElement('div');
      flash.id = 'dtx-shot-flash';
      document.body.appendChild(flash);
    }
    flash.classList.remove('dtx-flash');
    flash.offsetHeight;
    flash.classList.add('dtx-flash');
  }

  function captureCanvas(){
    disarmDrawDetect();
    if(shotTimeout){ clearTimeout(shotTimeout); shotTimeout = null; }
    var canvas = $('game');
    if(!canvas || !canvas.width || !canvas.toBlob){
      setMessage('Screenshot unavailable.');
      return;
    }
    try {
      canvas.toBlob(function(blob){
        if(!blob){
          setMessage('Screenshot failed \u2014 canvas not readable.');
          return;
        }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'deadtakeover_' + fileStamp() + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function(){ URL.revokeObjectURL(url); }, 5000);
        shotFlash();
        setMessage('Screenshot saved to downloads.');
      }, 'image/png');
    } catch(e){
      setMessage('Screenshot failed.');
    }
  }

  function requestScreenshot(){
    if(pendingShot) return;
    if(!glCtx || !$('game')){
      setMessage('Screenshot unavailable \u2014 renderer not ready.');
      return;
    }
    drewThisFrame = false;
    armDrawDetect();
    if(!savedDraws){
      setMessage('Screenshot unavailable.');
      return;
    }
    pendingShot = true;
    // If nothing renders (menu open / paused with no frames) give up quietly.
    shotTimeout = setTimeout(function(){
      if(pendingShot){
        pendingShot = false;
        drewThisFrame = false;
        disarmDrawDetect();
        setMessage('Screenshot unavailable \u2014 deploy into a run first.');
      }
    }, 2000);
  }

  /* ══════════ Director panel integration ══════════ */

  function wireDirectorButtons(){
    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      var actions = document.querySelector('#dt-v9-director .dt-v9-actions');
      if(actions && !$('dtx-shot-btn')){
        var shotBtn = document.createElement('button');
        shotBtn.className = 'dt-btn';
        shotBtn.id = 'dtx-shot-btn';
        shotBtn.type = 'button';
        shotBtn.textContent = 'Shot';
        shotBtn.title = 'Save a PNG screenshot (F2)';
        shotBtn.addEventListener('click', requestScreenshot);
        actions.appendChild(shotBtn);

        var statsBtn = document.createElement('button');
        statsBtn.className = 'dt-btn';
        statsBtn.id = 'dtx-stats-btn';
        statsBtn.type = 'button';
        statsBtn.textContent = 'Report';
        statsBtn.title = 'Session report overlay (X)';
        statsBtn.addEventListener('click', toggleStatsOverlay);
        actions.appendChild(statsBtn);
      }
      if($('dtx-shot-btn') || tries >= 20){
        clearInterval(timer);
      }
    }, 250);
  }

  /* ══════════ Hotkeys ══════════ */

  function bindKeys(){
    document.addEventListener('keydown', function(e){
      if(e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target;
      if(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      if(e.code === 'KeyX'){
        toggleStatsOverlay();
      } else if(e.code === 'Slash'){
        e.preventDefault();
        toggleKeysOverlay();
      } else if(e.code === 'F2'){
        e.preventDefault();
        requestScreenshot();
      } else if(e.code === 'Escape'){
        closeStatsOverlay();
        closeKeysOverlay();
      }
    }, true);
  }

  /* ══════════ Init ══════════ */

  function init(){
    injectStyles();
    buildStatsOverlay();
    buildKeysOverlay();
    bindKeys();
    wireDirectorButtons();
    setInterval(sampleSession, 1000);

    window.__dtxTools = {
      version: 'v1',
      screenshot: requestScreenshot,
      toggleStats: toggleStatsOverlay,
      toggleKeys: toggleKeysOverlay
    };
    console.log('[session-tools] dtx layer active \u2014 X report \u00b7 / hotkeys \u00b7 F2 screenshot');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
