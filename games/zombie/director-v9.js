/**
 * DeadTakeover v10 Director overlay — complete visual overhaul.
 * Rich UI with live stats, rotating intel, performance graph, quality controls.
 */
(function(){
  'use strict';

  var tips = [
    'Move in arcs while chunks stream. Straight-line sprinting forces more world generation.',
    'Build barricades near choke points — doorways and narrow streets work best.',
    'Headshots prevent corpse revives. Always aim for the head.',
    'Supply drops are worth chasing once you have spare stamina and ammo.',
    'Use Low quality mode if distant streaming still hitches on your hardware.',
    'Spitters leave acid pools — keep moving after killing them.',
    'Hunters pounce from distance. Listen for the audio cue and dodge sideways.',
    'Chargers are deadly in straight corridors. Use side routes to flank them.',
    'Upgrade your magazine capacity first — more rounds per mag means fewer reloads.',
    'Noise makers draw zombies away from objectives. Use them to create safe passages.',
    'Land mines and spike traps are great for defending barricade choke points.',
    'Use the photo mode button for clean screenshots without HUD clutter.',
    'The turret auto-fires at nearby zombies — place it where they funnel through.',
    'Collect scrap and metal from zombie drops to fuel weapon upgrades at benches.'
  ];
  var tipIndex = 0;
  var fpsHistory = [];
  var MAX_FPS_HISTORY = 60;
  var compactKey = 'deadtakeover_compact_hud';
  var photoActive = false;

  function $(id){ return document.getElementById(id); }
  function text(id){ var el=$(id); return el ? (el.textContent || '').trim() : ''; }
  function setMessage(msg){
    var m = $('message');
    if(m){
      var icon = m.querySelector('.msg-icon');
      m.textContent = '';
      if(icon) m.appendChild(icon);
      m.appendChild(document.createTextNode(' ' + msg));
    }
  }

  function injectStyles(){
    var s = document.createElement('style');
    s.textContent = [
      '#dt-v9-director{',
      '  position:fixed;right:16px;bottom:16px;z-index:9050;',
      '  width:min(340px,calc(100vw - 32px));',
      '  font-family:Inter,system-ui,sans-serif;color:#eafbff;pointer-events:auto;',
      '}',
      '#dt-v9-director .dt-card{',
      '  border:1px solid rgba(53,231,255,.18);',
      '  background:linear-gradient(165deg,rgba(8,14,32,.88),rgba(6,8,20,.92));',
      '  box-shadow:0 20px 60px rgba(0,0,0,.45),0 0 30px rgba(53,231,255,.04);',
      '  backdrop-filter:blur(16px);border-radius:20px;overflow:hidden;',
      '}',
      '#dt-v9-director .dt-card::before{',
      '  content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;',
      '  background:linear-gradient(135deg,rgba(53,231,255,.3),rgba(155,92,255,.12),rgba(255,79,216,.18));',
      '  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);',
      '  mask-composite:exclude;pointer-events:none;',
      '}',
      '#dt-v9-director header{',
      '  display:flex;align-items:center;justify-content:space-between;',
      '  gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);',
      '}',
      '#dt-v9-director .dt-head-left{display:flex;align-items:center;gap:10px}',
      '#dt-v9-director .dt-head-dot{width:8px;height:8px;border-radius:50%;',
      '  background:#5dff96;box-shadow:0 0 10px #5dff96;animation:dt-pulse 1.8s ease-in-out infinite}',
      '@keyframes dt-pulse{0%,100%{opacity:.6}50%{opacity:1}}',
      '#dt-v9-director .dt-head-title{',
      '  font-family:Orbitron,Inter,sans-serif;font-size:11px;font-weight:800;',
      '  letter-spacing:.1em;text-transform:uppercase;',
      '  background:linear-gradient(90deg,#35e7ff,#9b5cff);',
      '  -webkit-background-clip:text;background-clip:text;color:transparent;',
      '}',
      '#dt-v9-director .dt-head-sub{font-size:10px;color:#5a6588;letter-spacing:.04em}',
      '#dt-v9-director .dt-min-btn{',
      '  border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);',
      '  color:#8a96be;border-radius:8px;padding:4px 10px;font-size:10px;font-weight:700;',
      '  cursor:pointer;transition:all .15s ease;font-family:Inter,sans-serif;',
      '}',
      '#dt-v9-director .dt-min-btn:hover{background:rgba(53,231,255,.12);color:#35e7ff}',

      '#dt-v9-body{display:grid;gap:10px;padding:14px}',

      '.dt-v9-readout{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
      '.dt-v9-readout span{',
      '  border:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.2);',
      '  border-radius:12px;padding:10px 12px;font-size:10px;color:#8a96be;',
      '  display:grid;gap:3px;transition:border-color .2s ease;',
      '}',
      '.dt-v9-readout span:hover{border-color:rgba(53,231,255,.2)}',
      '.dt-v9-readout .dt-readout-label{font-family:"JetBrains Mono",monospace;',
      '  font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#5a6588}',
      '.dt-v9-readout b{display:block;color:#eaf0ff;font-size:12px;font-weight:700;',

      '  font-family:"JetBrains Mono",monospace;letter-spacing:.02em}',

      '.dt-v9-perf-graph{',
      '  height:36px;border:1px solid rgba(255,255,255,.06);border-radius:10px;',
      '  background:rgba(0,0,0,.15);overflow:hidden;position:relative;',
      '}',
      '.dt-v9-perf-graph canvas{display:block;width:100%;height:100%}',
      '.dt-v9-perf-label{position:absolute;top:4px;right:8px;font-family:"JetBrains Mono",monospace;',
      '  font-size:9px;color:#5a6588;letter-spacing:.04em}',

      '.dt-v9-tip{',
      '  font-size:11px;line-height:1.5;color:#8a96be;',
      '  border-left:2px solid #35e7ff;padding:8px 10px;',
      '  background:rgba(53,231,255,.04);border-radius:0 10px 10px 0;',
      '  transition:opacity .3s ease;',
      '}',

      '.dt-v9-actions{display:flex;gap:6px;flex-wrap:wrap}',
      '#dt-v9-director .dt-btn{',
      '  border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);',
      '  color:#8a96be;border-radius:10px;padding:6px 12px;font-size:10px;font-weight:700;',
      '  cursor:pointer;transition:all .15s ease;font-family:Inter,sans-serif;letter-spacing:.02em;',
      '}',
      '#dt-v9-director .dt-btn:hover{background:rgba(53,231,255,.12);color:#35e7ff;border-color:rgba(53,231,255,.25)}',
      '#dt-v9-director .dt-btn.dt-btn-active{background:rgba(53,231,255,.15);color:#35e7ff;border-color:rgba(53,231,255,.3)}',
      '#dt-v9-director .dt-btn.dt-btn-warn{color:#ffb86c;border-color:rgba(255,184,108,.2)}',
      '#dt-v9-director .dt-btn.dt-btn-warn:hover{background:rgba(255,184,108,.12);color:#ffb86c}',

      '#dt-v9-director .dt-v9-mini #dt-v9-body{display:none}',
      '.dt-v9-photo #hud,.dt-v9-photo #crosshair,.dt-v9-photo #dt-lab-panel,.dt-v9-photo #dt-v9-director,.dt-v9-photo .kill-feed{opacity:.03!important}',
      '.dt-v9-compact #hud-left,.dt-v9-compact #hud-right{transform:scale(.84);transform-origin:top left}',
      '.dt-v9-compact #hud-right{transform-origin:top right}',

      '@media(max-width:760px){',
      '  #dt-v9-director{left:12px;right:12px;bottom:60px;width:auto}',
      '  .dt-v9-readout{grid-template-columns:1fr 1fr}',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  }

  function build(){
    var box = document.createElement('div');
    box.id = 'dt-v9-director';
    box.innerHTML = [
      '<div class="dt-card">',
      '  <header>',
      '    <div class="dt-head-left">',
      '      <span class="dt-head-dot"></span>',
      '      <div>',
      '        <div class="dt-head-title">Director</div>',
      '        <div class="dt-head-sub" id="dt-v9-mode">session monitor</div>',
      '      </div>',
      '    </div>',
      '    <button class="dt-min-btn" id="dt-v9-min" type="button">Minimize</button>',
      '  </header>',
      '  <div id="dt-v9-body">',
      '    <div class="dt-v9-readout">',
      '      <span><span class="dt-readout-label">World</span><b id="dt-v9-world">--</b></span>',
      '      <span><span class="dt-readout-label">Combat</span><b id="dt-v9-stats">--</b></span>',
      '      <span><span class="dt-readout-label">Resources</span><b id="dt-v9-extra">--</b></span>',
      '      <span><span class="dt-readout-label">Streaming</span><b id="dt-v9-stream">--</b></span>',
      '    </div>',
      '    <div class="dt-v9-perf-graph">',
      '      <canvas id="dt-v9-fps-graph" height="36"></canvas>',
      '      <span class="dt-v9-perf-label" id="dt-v9-perf-label">-- fps</span>',
      '    </div>',
      '    <div class="dt-v9-tip" id="dt-v9-tip"></div>',
      '    <div class="dt-v9-actions">',
      '      <button class="dt-btn dt-btn-warn" id="dt-v9-low" type="button">Low</button>',
      '      <button class="dt-btn" id="dt-v9-bal" type="button">Balanced</button>',
      '      <button class="dt-btn" id="dt-v9-high" type="button">High</button>',
      '      <button class="dt-btn" id="dt-v9-hud" type="button">Compact</button>',
      '      <button class="dt-btn" id="dt-v9-photo" type="button">Photo</button>',
      '      <button class="dt-btn" id="dt-v9-guide" type="button">Guide</button>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('\n');
    document.body.appendChild(box);

    // Event bindings
    $('dt-v9-min').addEventListener('click', function(){
      box.classList.toggle('dt-v9-mini');
      this.textContent = box.classList.contains('dt-v9-mini') ? 'Open' : 'Minimize';
    });
    $('dt-v9-low').addEventListener('click', function(){
      if(window.__zombieSetQuality) window.__zombieSetQuality('low');
      else localStorage.setItem('deadtakeover_render_quality','low');
      setMessage('Director: Low quality selected.');
    });
    $('dt-v9-bal').addEventListener('click', function(){
      if(window.__zombieSetQuality) window.__zombieSetQuality('balanced');
      else localStorage.setItem('deadtakeover_render_quality','balanced');
      setMessage('Director: Balanced quality selected.');
    });
    $('dt-v9-high').addEventListener('click', function(){
      if(window.__zombieSetQuality) window.__zombieSetQuality('high');
      else localStorage.setItem('deadtakeover_render_quality','high');
      setMessage('Director: High quality selected.');
    });
    $('dt-v9-hud').addEventListener('click', function(){
      document.body.classList.toggle('dt-v9-compact');
      var on = document.body.classList.contains('dt-v9-compact');
      localStorage.setItem(compactKey, on ? '1' : '0');
      this.classList.toggle('dt-btn-active', on);
    });
    $('dt-v9-photo').addEventListener('click', function(){
      photoActive = !photoActive;
      document.body.classList.toggle('dt-v9-photo', photoActive);
      this.classList.toggle('dt-btn-active', photoActive);
      setMessage(photoActive ? 'Photo mode ON — press Photo again to restore.' : 'Photo mode OFF.');
    });
    $('dt-v9-guide').addEventListener('click', function(){
      var g = $('dt-field-guide');
      if(g) g.classList.add('open');
    });

    // O key shortcut
    document.addEventListener('keydown', function(e){
      if(e.code === 'KeyO' && !e.repeat) box.classList.toggle('dt-v9-mini');
    }, true);

    if(localStorage.getItem(compactKey) === '1'){
      document.body.classList.add('dt-v9-compact');
      var hud = $('dt-v9-hud');
      if(hud) hud.classList.add('dt-btn-active');
    }

    return box;
  }

  function drawFpsGraph(){
    var canvas = $('dt-v9-fps-graph');
    if(!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
    var h = canvas.height = 36 * (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);

    if(fpsHistory.length < 2) return;

    // Draw 60fps reference line
    ctx.strokeStyle = 'rgba(93,255,150,.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    var y60 = h - (60 / 75) * h;
    ctx.beginPath(); ctx.moveTo(0, y60); ctx.lineTo(w, y60); ctx.stroke();
    ctx.setLineDash([]);

    // Draw FPS line
    var step = w / (MAX_FPS_HISTORY - 1);
    ctx.beginPath();
    for(var i = 0; i < fpsHistory.length; i++){
      var x = i * step;
      var y = h - (Math.min(fpsHistory[i], 75) / 75) * h;
      if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#35e7ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Fill under curve
    ctx.lineTo((fpsHistory.length - 1) * step, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(53,231,255,.2)');
    grad.addColorStop(1, 'rgba(53,231,255,.0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  function update(){
    var perf = window.__zombiePerfSnapshot ? window.__zombiePerfSnapshot() : null;
    var stream = window.__zombieGetStreamingStats ? window.__zombieGetStreamingStats() : null;
    var world = text('world-stats') || 'Menu';
    var stats = text('stats-meta') || 'Waiting for run';
    var extra = text('extra-meta') || 'No resources yet';

    // FPS tracking
    var fps = perf && perf.fps ? perf.fps : 0;
    fpsHistory.push(fps);
    if(fpsHistory.length > MAX_FPS_HISTORY) fpsHistory.shift();

    // Streaming readout
    var streamText = stream ? ('pending ' + (stream.pending || 0) + ' · built ' + (stream.built || 0)) : 'standby';
    if(fps) streamText += ' · ' + fps + ' fps';

    // Render scale
    var scaleText = perf && perf.ratio ? (perf.ratio.toFixed ? perf.ratio.toFixed(2) : perf.ratio) : '--';

    var w = $('dt-v9-world'), st = $('dt-v9-stats'), ex = $('dt-v9-extra'), sr = $('dt-v9-stream');
    var tip = $('dt-v9-tip'), pl = $('dt-v9-perf-label');

    if(w) w.textContent = world;
    if(st) st.textContent = stats.replace(/\s*\|\s*/g, ' · ');
    if(ex) ex.textContent = extra.replace(/\s*\|\s*/g, ' · ');
    if(sr) sr.textContent = streamText;
    if(tip) tip.textContent = tips[tipIndex % tips.length];
    if(pl) pl.textContent = fps ? (fps + ' fps · scale ' + scaleText) : '-- fps';

    drawFpsGraph();
  }

  function init(){
    injectStyles();
    build();
    update();

    // Fast update for graph smoothness, slow update for tips
    setInterval(update, 500);
    setInterval(function(){ tipIndex++; }, 10000);

    window.__deadTakeoverV9 = {
      version: 'v10',
      showStats: update,
      tips: tips,
      setCompact: function(on){ document.body.classList.toggle('dt-v9-compact', !!on); }
    };
    console.log('[DeadTakeover] v10 director overlay active');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
