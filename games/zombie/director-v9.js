
/**
 * DeadTakeover v9 Director overlay.
 * Lightweight UI layer only: reads existing HUD text and exposes quality/HUD tools.
 */
(function(){
  'use strict';
  var tips = [
    'Move in arcs while new chunks stream in; sudden straight-line sprinting forces more world generation.',
    'Use Low quality if you are testing gameplay systems instead of visuals.',
    'Build barricades near choke points, not out in wide streets.',
    'Supply drops are worth chasing once you have stamina and ammo spare.',
    'Use the director photo toggle for clean screenshots of the game.'
  ];
  var tipIndex = 0;
  var compactKey = 'deadtakeover_compact_hud';
  function $(id){ return document.getElementById(id); }
  function text(id){ var el=$(id); return el ? (el.textContent || '').trim() : ''; }
  function setMessage(msg){ var m=$('message'); if(m) m.textContent = msg; }
  function injectStyles(){
    var style=document.createElement('style');
    style.textContent = `
      #dt-v9-director{position:fixed;right:14px;bottom:14px;z-index:9050;width:min(310px,calc(100vw - 28px));font-family:Inter,Segoe UI,system-ui,sans-serif;color:#eafbff;pointer-events:auto}
      #dt-v9-director .dt-card{border:1px solid rgba(90,240,255,.28);background:linear-gradient(160deg,rgba(4,8,20,.84),rgba(10,8,22,.8));box-shadow:0 18px 60px rgba(0,0,0,.45);backdrop-filter:blur(14px);border-radius:20px;overflow:hidden}
      #dt-v9-director header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.1)}
      #dt-v9-director strong{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#68f3ff}#dt-v9-director small{color:#98a9c8;font-size:11px}
      #dt-v9-director button{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);color:#eafbff;border-radius:999px;padding:7px 9px;font-weight:800;cursor:pointer}#dt-v9-director button:hover{background:rgba(90,240,255,.16)}
      #dt-v9-body{display:grid;gap:8px;padding:11px}.dt-v9-readout{display:grid;grid-template-columns:1fr 1fr;gap:6px}.dt-v9-readout span{border:1px solid rgba(255,255,255,.09);background:rgba(0,0,0,.22);border-radius:12px;padding:7px;font-size:11px;color:#cbd7f0;min-height:42px}.dt-v9-readout b{display:block;color:#fff;font-size:12px;margin-top:2px}.dt-v9-tip{font-size:11px;line-height:1.45;color:#b8c7e6;border-left:2px solid #68f3ff;padding-left:8px}.dt-v9-actions{display:flex;gap:6px;flex-wrap:wrap}.dt-v9-mini #dt-v9-body{display:none}.dt-v9-photo #hud,.dt-v9-photo #crosshair,.dt-v9-photo #dt-lab-panel,.dt-v9-photo #dt-v9-director{opacity:.04!important}.dt-v9-compact #hud-left,.dt-v9-compact #hud-right{transform:scale(.86);transform-origin:top left}.dt-v9-compact #hud-right{transform-origin:top right}@media(max-width:760px){#dt-v9-director{left:12px;right:12px;bottom:58px;width:auto}.dt-v9-readout{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }
  function build(){
    var box=document.createElement('div');
    box.id='dt-v9-director';
    box.innerHTML='<div class="dt-card"><header><span><strong>v9 Director</strong><br><small id="dt-v9-mode">session monitor</small></span><button id="dt-v9-min" type="button">Min</button></header><div id="dt-v9-body"><div class="dt-v9-readout"><span>World<b id="dt-v9-world">--</b></span><span>Stats<b id="dt-v9-stats">--</b></span><span>Resources<b id="dt-v9-extra">--</b></span><span>Streaming<b id="dt-v9-stream">--</b></span></div><div class="dt-v9-tip" id="dt-v9-tip"></div><div class="dt-v9-actions"><button id="dt-v9-low" type="button">Low</button><button id="dt-v9-bal" type="button">Balanced</button><button id="dt-v9-hud" type="button">HUD</button><button id="dt-v9-photo" type="button">Photo</button><button id="dt-v9-guide" type="button">Guide</button></div></div></div>';
    document.body.appendChild(box);
    $('dt-v9-min').addEventListener('click', function(){ box.classList.toggle('dt-v9-mini'); this.textContent = box.classList.contains('dt-v9-mini') ? 'Open' : 'Min'; });
    $('dt-v9-low').addEventListener('click', function(){ window.__zombieSetQuality ? window.__zombieSetQuality('low') : localStorage.setItem('deadtakeover_render_quality','low'); setMessage('v9 Director: Low quality selected.'); });
    $('dt-v9-bal').addEventListener('click', function(){ window.__zombieSetQuality ? window.__zombieSetQuality('balanced') : localStorage.setItem('deadtakeover_render_quality','balanced'); setMessage('v9 Director: Balanced quality selected.'); });
    $('dt-v9-hud').addEventListener('click', function(){ document.body.classList.toggle('dt-v9-compact'); localStorage.setItem(compactKey, document.body.classList.contains('dt-v9-compact') ? '1' : '0'); });
    $('dt-v9-photo').addEventListener('click', function(){ document.body.classList.toggle('dt-v9-photo'); setMessage(document.body.classList.contains('dt-v9-photo') ? 'Photo mode on. Press Photo again to restore HUD.' : 'Photo mode off.'); });
    $('dt-v9-guide').addEventListener('click', function(){ var g=$('dt-field-guide'); if(g) g.classList.add('open'); });
    document.addEventListener('keydown', function(e){ if(e.code==='KeyO'&&!e.repeat){ box.classList.toggle('dt-v9-mini'); } }, true);
    if(localStorage.getItem(compactKey)==='1') document.body.classList.add('dt-v9-compact');
    return box;
  }
  function update(){
    var perf = window.__zombiePerfSnapshot ? window.__zombiePerfSnapshot() : null;
    var stream = window.__zombieGetStreamingStats ? window.__zombieGetStreamingStats() : null;
    var world = text('world-stats') || 'Menu';
    var stats = text('stats-meta') || 'Waiting for run';
    var extra = text('extra-meta') || 'No resources yet';
    var streamText = stream ? ('pending ' + (stream.pending || 0) + ' · built ' + (stream.built || 0)) : 'standby';
    if(perf && perf.fps) streamText += ' · ' + perf.fps + 'fps';
    var w=$('dt-v9-world'), st=$('dt-v9-stats'), ex=$('dt-v9-extra'), sr=$('dt-v9-stream'), tip=$('dt-v9-tip');
    if(w) w.textContent=world; if(st) st.textContent=stats.replace(/\s*\|\s*/g,' · '); if(ex) ex.textContent=extra.replace(/\s*\|\s*/g,' · '); if(sr) sr.textContent=streamText;
    if(tip) tip.textContent = tips[tipIndex % tips.length];
  }
  function init(){
    injectStyles(); build(); update();
    setInterval(update, 700);
    setInterval(function(){ tipIndex++; update(); }, 9000);
    window.__deadTakeoverV9 = { version:'v9', showStats:update, tips:tips, setCompact:function(on){ document.body.classList.toggle('dt-v9-compact', !!on); } };
    console.log('[DeadTakeover] v9 director overlay active');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
