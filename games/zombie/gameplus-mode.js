
/**
 * DeadTakeover Lab+ v8 overlay.
 * Adds quality controls, field guide, and safe UI extras without touching saves.
 */
(function(){
  'use strict';
  window.__deadTakeoverLabPlus = 'v8';
  function $(id){ return document.getElementById(id); }
  function createStyles(){
    var style = document.createElement('style');
    style.textContent = `
      #dt-lab-panel{position:fixed;left:14px;bottom:14px;z-index:9000;display:flex;gap:8px;align-items:center;font-family:Inter,Segoe UI,system-ui,sans-serif;pointer-events:auto}
      #dt-lab-panel button{border:1px solid rgba(90,240,255,.35);background:rgba(3,8,18,.78);color:#dffcff;border-radius:999px;padding:8px 10px;font-weight:800;cursor:pointer;backdrop-filter:blur(10px)}
      #dt-lab-panel button:hover{background:rgba(45,210,255,.18)}
      #dt-field-guide{position:fixed;inset:0;z-index:12000;display:none;place-items:center;background:rgba(0,0,0,.72);font-family:Inter,Segoe UI,system-ui,sans-serif;color:#f5fbff;padding:18px}
      #dt-field-guide.open{display:grid}#dt-field-card{width:min(860px,100%);max-height:86vh;overflow:auto;border:1px solid rgba(90,240,255,.28);border-radius:24px;background:linear-gradient(160deg,rgba(10,15,35,.96),rgba(7,6,18,.96));box-shadow:0 22px 80px rgba(0,0,0,.55);padding:24px}
      #dt-field-card h2{margin:0 0 8px;font-size:28px;letter-spacing:.03em}#dt-field-card p{color:#aeb8d8;line-height:1.65}#dt-field-card .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:18px 0}#dt-field-card section{border:1px solid rgba(255,255,255,.1);border-radius:18px;background:rgba(255,255,255,.045);padding:14px}#dt-field-card h3{margin:0 0 8px;color:#5df0ff}#dt-field-card ul{margin:0;padding-left:18px;color:#cbd3ec;line-height:1.7}#dt-close-guide{float:right;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:white;border-radius:12px;padding:8px 11px;cursor:pointer}@media(max-width:680px){#dt-field-card .grid{grid-template-columns:1fr}#dt-lab-panel{right:12px;left:12px;justify-content:center;flex-wrap:wrap}}`;
    document.head.appendChild(style);
  }
  function buildGuide(){
    var guide = document.createElement('div');
    guide.id = 'dt-field-guide';
    guide.innerHTML = '<div id="dt-field-card"><button id="dt-close-guide" type="button">Close</button><h2>DeadTakeover Lab+ Field Guide</h2><p>v8 adds a starter kit and unlocks the bonus weapons so testing and surviving feels better immediately. Press <b>I</b> anytime to toggle this guide.</p><div class="grid"><section><h3>Starter kit</h3><ul><li>Bonus weapons unlocked from the start.</li><li>Extra grenades, traps, turret, noise maker, and crafting materials.</li><li>Two skill points ready for early upgrades.</li></ul></section><section><h3>Survival loop</h3><ul><li>Loot zombies and supply drops for materials.</li><li>Use B/N to build and cycle barricade types.</li><li>Use Tab for inventory and U near benches for weapon upgrades.</li></ul></section><section><h3>Performance</h3><ul><li>Quality mode is controlled by the hub Play page or console.</li><li>Use Low mode if distant streaming still hitches.</li><li>Use the Perf button for a quick FPS/render-scale snapshot.</li></ul></section><section><h3>Hotkeys</h3><ul><li>WASD move, Shift sprint, C crouch.</li><li>Q/E swap, 1-7 weapon slots, R reload.</li><li>G/J/K/L/V tools, P pause, M audio.</li></ul></section></div></div>';
    document.body.appendChild(guide);
    $('dt-close-guide').addEventListener('click', function(){ guide.classList.remove('open'); });
    guide.addEventListener('click', function(e){ if(e.target === guide) guide.classList.remove('open'); });
    return guide;
  }
  function showPerf(){
    var perf = window.__zombiePerfSnapshot ? window.__zombiePerfSnapshot() : null;
    var stream = window.__zombieGetStreamingStats ? window.__zombieGetStreamingStats() : null;
    var msg = perf ? ('FPS ' + (perf.fps || '?') + ' · scale ' + ((perf.ratio || 0).toFixed ? perf.ratio.toFixed(2) : perf.ratio) + ' · quality ' + perf.quality) : 'Performance data not ready yet';
    if (stream && stream.mode) msg += ' · ' + stream.mode;
    var m = $('message');
    if (m) m.textContent = msg;
    console.log('[DeadTakeover Lab+]', { perf: perf, streaming: stream });
  }
  function init(){
    createStyles();
    var guide = buildGuide();
    var help = document.querySelector('.menu-help');
    if (help && !help.dataset.labplus) {
      help.dataset.labplus = '1';
      help.innerHTML = '<strong>Lab+ v8:</strong> bonus weapons unlocked, starter materials added, and in-game guide available with <kbd>I</kbd>. ' + help.innerHTML;
    }
    var panel = document.createElement('div');
    panel.id = 'dt-lab-panel';
    panel.innerHTML = '<button type="button" id="dt-guide-btn">Field Guide</button><button type="button" id="dt-perf-btn">Perf</button><button type="button" id="dt-low-btn">Low</button><button type="button" id="dt-high-btn">High</button>';
    document.body.appendChild(panel);
    $('dt-guide-btn').addEventListener('click', function(){ guide.classList.add('open'); });
    $('dt-perf-btn').addEventListener('click', showPerf);
    $('dt-low-btn').addEventListener('click', function(){ window.__zombieSetQuality ? window.__zombieSetQuality('low') : localStorage.setItem('deadtakeover_render_quality','low'); });
    $('dt-high-btn').addEventListener('click', function(){ window.__zombieSetQuality ? window.__zombieSetQuality('high') : localStorage.setItem('deadtakeover_render_quality','high'); });
    document.addEventListener('keydown', function(e){
      if (e.code === 'KeyI' && !e.repeat) { e.preventDefault(); guide.classList.toggle('open'); }
    }, true);
    console.log('[DeadTakeover Lab+] v8 overlay active');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
