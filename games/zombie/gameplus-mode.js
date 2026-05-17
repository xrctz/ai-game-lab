/**
 * DeadTakeover Lab+ v10 overlay — major overhaul.
 * Adds field guide, quick-panel, kill feed integration, and QoL features.
 */
(function(){
  'use strict';
  window.__deadTakeoverLabPlus = 'v10';

  var killFeedItems = [];
  var MAX_KILL_FEED = 6;
  var KILL_FEED_DURATION = 4000;

  function $(id){ return document.getElementById(id); }

  function createStyles(){
    var s = document.createElement('style');
    s.textContent = [
      '/* ── Lab+ Quick Panel ── */',
      '#dt-lab-panel{',
      '  position:fixed;left:16px;bottom:16px;z-index:9000;',
      '  display:flex;gap:6px;align-items:center;',
      '  font-family:Inter,system-ui,sans-serif;pointer-events:auto;',
      '}',
      '#dt-lab-panel .lab-btn{',
      '  border:1px solid rgba(53,231,255,.18);',
      '  background:linear-gradient(165deg,rgba(8,14,32,.82),rgba(4,6,16,.88));',
      '  backdrop-filter:blur(12px);',
      '  color:#8a96be;border-radius:12px;padding:8px 14px;',
      '  font-family:Inter,system-ui,sans-serif;font-size:11px;font-weight:700;',
      '  cursor:pointer;transition:all .18s ease;letter-spacing:.02em;',
      '  box-shadow:0 4px 16px rgba(0,0,0,.25);',
      '}',
      '#dt-lab-panel .lab-btn:hover{',
      '  border-color:rgba(53,231,255,.35);color:#35e7ff;',
      '  background:rgba(53,231,255,.08);transform:translateY(-1px);',
      '}',
      '#dt-lab-panel .lab-btn .lab-btn-icon{margin-right:5px;font-size:12px}',

      '/* ── Field Guide ── */',
      '#dt-field-guide{',
      '  position:fixed;inset:0;z-index:12000;display:none;place-items:center;',
      '  background:rgba(0,0,0,.75);backdrop-filter:blur(8px);',
      '  font-family:Inter,system-ui,sans-serif;color:#eaf0ff;padding:18px;',
      '}',
      '#dt-field-guide.open{display:grid}',

      '#dt-field-card{',
      '  width:min(900px,100%);max-height:88vh;overflow-y:auto;',
      '  border:1px solid rgba(53,231,255,.18);border-radius:24px;',
      '  background:linear-gradient(165deg,rgba(12,18,42,.97),rgba(6,8,20,.98));',
      '  box-shadow:0 32px 80px rgba(0,0,0,.5),0 0 40px rgba(53,231,255,.05);',
      '  padding:32px 36px;',
      '}',
      '#dt-field-card::before{',
      '  content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;',
      '  background:linear-gradient(135deg,rgba(53,231,255,.3),rgba(155,92,255,.15),rgba(255,79,216,.15));',
      '  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);',
      '  mask-composite:exclude;pointer-events:none;',
      '}',

      '#dt-field-guide-header{',
      '  display:flex;align-items:center;justify-content:space-between;',
      '  margin-bottom:24px;padding-bottom:18px;',
      '  border-bottom:1px solid rgba(255,255,255,.06);',
      '}',
      '#dt-field-guide-header h2{',
      '  font-family:Orbitron,Inter,sans-serif;font-size:1.6rem;font-weight:900;',
      '  letter-spacing:.04em;margin:0;',
      '  background:linear-gradient(90deg,#35e7ff,#9b5cff);',
      '  -webkit-background-clip:text;background-clip:text;color:transparent;',
      '}',
      '#dt-field-guide-header p{font-size:.84rem;color:#8a96be;margin:4px 0 0;line-height:1.5}',

      '#dt-close-guide{',
      '  border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);',
      '  color:#8a96be;border-radius:12px;padding:8px 16px;font-weight:700;',
      '  cursor:pointer;font-family:Inter,sans-serif;font-size:.84rem;transition:all .15s ease;',
      '}',
      '#dt-close-guide:hover{background:rgba(255,255,255,.1);color:#eaf0ff}',

      '.guide-sections{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:24px}',
      '.guide-section{',
      '  border:1px solid rgba(255,255,255,.06);border-radius:16px;',
      '  background:rgba(0,0,0,.15);padding:18px;transition:border-color .2s ease;',
      '}',
      '.guide-section:hover{border-color:rgba(53,231,255,.15)}',
      '.guide-section-icon{font-size:1.3rem;margin-bottom:10px;display:block}',
      '.guide-section h3{',
      '  font-family:Orbitron,Inter,sans-serif;font-size:.92rem;font-weight:800;',
      '  color:#35e7ff;margin:0 0 10px;letter-spacing:.03em;',
      '}',
      '.guide-section ul{margin:0;padding-left:18px;color:#8a96be;line-height:1.8;font-size:.84rem}',
      '.guide-section li::marker{color:#35e7ff}',

      '.guide-weapons{',
      '  border:1px solid rgba(255,255,255,.06);border-radius:16px;',
      '  background:rgba(0,0,0,.12);padding:18px;margin-bottom:24px;',
      '}',
      '.guide-weapons h3{',
      '  font-family:Orbitron,Inter,sans-serif;font-size:.92rem;font-weight:800;',
      '  color:#35e7ff;margin:0 0 14px;letter-spacing:.03em;',
      '}',
      '.guide-weapon-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}',
      '.guide-weapon-chip{',
      '  display:flex;align-items:center;gap:8px;padding:10px 12px;',
      '  border:1px solid rgba(255,255,255,.06);border-radius:12px;',
      '  background:rgba(255,255,255,.03);font-size:.78rem;color:#8a96be;',
      '}',
      '.guide-weapon-chip .gw-icon{font-size:1rem}',
      '.guide-weapon-chip .gw-name{font-weight:700;color:#eaf0ff;font-size:.8rem}',
      '.guide-weapon-chip .gw-detail{font-family:"JetBrains Mono",monospace;font-size:.68rem;color:#5a6588}',

      '.guide-zombies{',
      '  border:1px solid rgba(255,255,255,.06);border-radius:16px;',
      '  background:rgba(0,0,0,.12);padding:18px;',
      '}',
      '.guide-zombies h3{',
      '  font-family:Orbitron,Inter,sans-serif;font-size:.92rem;font-weight:800;',
      '  color:#ff4d6a;margin:0 0 14px;letter-spacing:.03em;',
      '}',
      '.guide-zombie-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}',
      '.guide-zombie-card{',
      '  border:1px solid rgba(255,77,106,.1);border-radius:14px;',
      '  background:rgba(255,77,106,.03);padding:14px;',
      '}',
      '.guide-zombie-card .gz-name{font-weight:800;color:#ff8fa3;font-size:.88rem;margin-bottom:4px}',
      '.guide-zombie-card .gz-desc{font-size:.76rem;color:#8a96be;line-height:1.5}',

      '@media(max-width:720px){',
      '  .guide-sections,.guide-zombie-grid{grid-template-columns:1fr}',
      '  .guide-weapon-grid{grid-template-columns:repeat(2,1fr)}',
      '  #dt-field-card{padding:20px}',
      '  #dt-lab-panel{left:10px;right:10px;justify-content:center;flex-wrap:wrap}',
      '}',

      '/* ── Kill Feed Animations ── */',
      '.kf-show{animation:kf-slide-in .3s ease forwards}',
      '.kf-hide{animation:kf-slide-out .4s ease forwards}',
      '@keyframes kf-slide-in{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}',
      '@keyframes kf-slide-out{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(20px)}}',
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildGuide(){
    var guide = document.createElement('div');
    guide.id = 'dt-field-guide';
    guide.innerHTML = [
      '<div id="dt-field-card">',
      '  <div id="dt-field-guide-header">',
      '    <div>',
      '      <h2>Survival Field Guide</h2>',
      '      <p>Everything you need to survive the apocalypse. Press <b>I</b> to toggle.</p>',
      '    </div>',
      '    <button id="dt-close-guide" type="button">✕ Close</button>',
      '  </div>',

      '  <div class="guide-sections">',
      '    <div class="guide-section">',
      '      <span class="guide-section-icon">🎒</span>',
      '      <h3>Starter Kit</h3>',
      '      <ul>',
      '        <li>All 10 weapons unlocked from the start</li>',
      '        <li>Extra grenades, molotovs, land mines, spike traps</li>',
      '        <li>Auto turret + noise maker in inventory</li>',
      '        <li>Starting materials: scrap, wood, metal, cloth, chemicals</li>',
      '        <li>Two skill points ready for early upgrades</li>',
      '      </ul>',
      '    </div>',
      '    <div class="guide-section">',
      '      <span class="guide-section-icon">⚔️</span>',
      '      <h3>Survival Loop</h3>',
      '      <ul>',
      '        <li>Kill zombies → loot materials from drops</li>',
      '        <li>Craft items at inventory (<kbd>Tab</kbd>)</li>',
      '        <li>Build barricades (<kbd>B</kbd>, cycle with <kbd>N</kbd>)</li>',
      '        <li>Upgrade weapons at benches (<kbd>U</kbd>)</li>',
      '        <li>Chase ★ supply drops for rare loot</li>',
      '        <li>Survive waves — each one gets harder</li>',
      '      </ul>',
      '    </div>',
      '    <div class="guide-section">',
      '      <span class="guide-section-icon">🎯</span>',
      '      <h3>Combat Tips</h3>',
      '      <ul>',
      '        <li>Headshots prevent corpse revives</li>',
      '        <li>Spitters leave acid pools — keep moving</li>',
      '        <li>Hunters pounce from range — dodge sideways</li>',
      '        <li>Chargers are deadly in corridors — flank them</li>',
      '        <li>Crawlers are fast and low — aim down</li>',
      '        <li>Upgrade mag size first for fewer reloads</li>',
      '      </ul>',
      '    </div>',
      '    <div class="guide-section">',
      '      <span class="guide-section-icon">⚡</span>',
      '      <h3>Performance</h3>',
      '      <ul>',
      '        <li>Quality: <kbd>Low</kbd> / <kbd>Balanced</kbd> / <kbd>High</kbd></li>',
      '        <li>Director overlay shows live FPS graph</li>',
      '        <li>Backtick (<kbd>`</kbd>) shows perf debug overlay</li>',
      '        <li><kbd>O</kbd> minimizes director, <kbd>I</kbd> toggles guide</li>',
      '        <li>Photo mode hides HUD for screenshots</li>',
      '      </ul>',
      '    </div>',
      '  </div>',

      '  <div class="guide-weapons">',
      '    <h3>Arsenal — All Unlocked</h3>',
      '    <div class="guide-weapon-grid">',
      '      <div class="guide-weapon-chip"><span class="gw-icon">🔫</span><div><div class="gw-name">Rifle</div><div class="gw-detail">5.56 AP · 30 mag · 24 dmg</div></div></div>',
      '      <div class="guide-weapon-chip"><span class="gw-icon">🔫</span><div><div class="gw-name">Pistol</div><div class="gw-detail">9mm HP · 15 mag · 20 dmg</div></div></div>',
      '      <div class="guide-weapon-chip"><span class="gw-icon">💥</span><div><div class="gw-name">Shotgun</div><div class="gw-detail">12g Buck · 8 mag · 10 pellets</div></div></div>',
      '      <div class="guide-weapon-chip"><span class="gw-icon">🏹</span><div><div class="gw-name">Crossbow</div><div class="gw-detail">Bolts · 1 mag · 92 dmg · silent</div></div></div>',
      '      <div class="guide-weapon-chip"><span class="gw-icon">🔥</span><div><div class="gw-name">Flamethrower</div><div class="gw-detail">Fuel · 120 mag · continuous burn</div></div></div>',
      '      <div class="guide-weapon-chip"><span class="gw-icon">🎯</span><div><div class="gw-name">Sniper</div><div class="gw-detail">.308 · 5 mag · 125 dmg · 2x pierce</div></div></div>',
      '      <div class="guide-weapon-chip"><span class="gw-icon">🚀</span><div><div class="gw-name">Rocket</div><div class="gw-detail">Rockets · 1 mag · 185 dmg · explosive</div></div></div>',
      '      <div class="guide-weapon-chip"><span class="gw-icon">⚙️</span><div><div class="gw-name">SMG</div><div class="gw-detail">9mm Para · 40 mag · 14 dmg · fast</div></div></div>',
      '      <div class="guide-weapon-chip"><span class="gw-icon">🔫</span><div><div class="gw-name">Revolver</div><div class="gw-detail">.44 Mag · 6 mag · 65 dmg · crit</div></div></div>',
      '      <div class="guide-weapon-chip"><span class="gw-icon">⚙️</span><div><div class="gw-name">Minigun</div><div class="gw-detail">7.62 Belt · 200 mag · 11 dmg · spray</div></div></div>',
      '    </div>',
      '  </div>',

      '  <div class="guide-zombies">',
      '    <h3>Enemy Types — Know Your Threats</h3>',
      '    <div class="guide-zombie-grid">',
      '      <div class="guide-zombie-card"><div class="gz-name">Standard Zombie</div><div class="gz-desc">Basic melee attacker. Revives if not headshot-killed. Loot materials on death.</div></div>',
      '      <div class="guide-zombie-card"><div class="gz-name">Spitter</div><div class="gz-desc">Ranged acid attacker. Leaves damaging pools on the ground. Keep moving after kills.</div></div>',
      '      <div class="guide-zombie-card"><div class="gz-name">Hunter</div><div class="gz-desc">Fast pounce attacker. Leaps from distance. Dodge sideways when you hear the cue.</div></div>',
      '      <div class="guide-zombie-card"><div class="gz-name">Charger</div><div class="gz-desc">Heavy melee charger. Deadly in straight corridors. Use side routes to flank.</div></div>',
      '      <div class="guide-zombie-card"><div class="gz-name">Crawler</div><div class="gz-desc">Fast, low-profile attacker. Hard to hit standing. Aim down or use explosives.</div></div>',
      '    </div>',
      '  </div>',

      '</div>',
    ].join('\n');
    document.body.appendChild(guide);

    $('dt-close-guide').addEventListener('click', function(){ guide.classList.remove('open'); });
    guide.addEventListener('click', function(e){ if(e.target === guide) guide.classList.remove('open'); });

    return guide;
  }

  function showPerf(){
    var perf = window.__zombiePerfSnapshot ? window.__zombiePerfSnapshot() : null;
    var stream = window.__zombieGetStreamingStats ? window.__zombieGetStreamingStats() : null;
    var msg = perf
      ? ('FPS ' + (perf.fps || '?') + ' · scale ' + ((perf.ratio || 0).toFixed ? perf.ratio.toFixed(2) : perf.ratio) + ' · ' + perf.quality + ' mode')
      : 'Performance data not ready yet';
    if(stream && stream.mode) msg += ' · ' + stream.mode;
    var m = $('message');
    if(m){
      var icon = m.querySelector('.msg-icon');
      m.textContent = '';
      if(icon) m.appendChild(icon);
      m.appendChild(document.createTextNode(' ' + msg));
    }
    console.log('[DeadTakeover Lab+]', { perf: perf, streaming: stream });
  }

  function addKillFeedItem(icon, name, detail){
    var feed = $('kill-feed');
    if(!feed) return;
    var item = document.createElement('div');
    item.className = 'kill-feed-item kf-show';
    item.innerHTML = '<span class="kf-icon">' + icon + '</span>'
      + '<span class="kf-name">' + name + '</span>'
      + (detail ? '<span class="kf-detail">' + detail + '</span>' : '');
    feed.appendChild(item);
    killFeedItems.push(item);
    while(killFeedItems.length > MAX_KILL_FEED){
      var old = killFeedItems.shift();
      if(old.parentNode) old.parentNode.removeChild(old);
    }
    setTimeout(function(){
      item.classList.remove('kf-show');
      item.classList.add('kf-hide');
      setTimeout(function(){
        if(item.parentNode) item.parentNode.removeChild(item);
        var idx = killFeedItems.indexOf(item);
        if(idx >= 0) killFeedItems.splice(idx, 1);
      }, 400);
    }, KILL_FEED_DURATION);
  }

  function hookGameEvents(){
    // Monitor the HUD message for kill/damage events to populate kill feed
    var lastStats = '';
    var lastExtra = '';
    var lastKills = 0;

    setInterval(function(){
      var statsEl = $('stats-meta');
      var extraEl = $('extra-meta');
      if(!statsEl) return;

      var stats = statsEl.textContent || '';
      if(stats !== lastStats){
        // Parse kills from stats
        var killsMatch = stats.match(/Kills:\s*(\d+)/i);
        if(killsMatch){
          var kills = parseInt(killsMatch[1], 10);
          if(kills > lastKills && lastKills > 0){
            addKillFeedItem('💀', 'Kill', '+' + (kills - lastKills));
          }
          lastKills = kills;
        }
        lastStats = stats;
      }

      var extra = extraEl ? extraEl.textContent || '' : '';
      if(extra !== lastExtra){
        lastExtra = extra;
      }
    }, 300);
  }

  function init(){
    createStyles();
    var guide = buildGuide();

    // Build quick panel
    var panel = document.createElement('div');
    panel.id = 'dt-lab-panel';
    panel.innerHTML = [
      '<button class="lab-btn" type="button" id="dt-guide-btn">',
      '  <span class="lab-btn-icon">📖</span> Guide',
      '</button>',
      '<button class="lab-btn" type="button" id="dt-perf-btn">',
      '  <span class="lab-btn-icon">📊</span> Stats',
      '</button>',
      '<button class="lab-btn" type="button" id="dt-low-btn">',
      '  <span class="lab-btn-icon">⚡</span> Low',
      '</button>',
      '<button class="lab-btn" type="button" id="dt-high-btn">',
      '  <span class="lab-btn-icon">✦</span> High',
      '</button>',
    ].join('');
    document.body.appendChild(panel);

    $('dt-guide-btn').addEventListener('click', function(){ guide.classList.add('open'); });
    $('dt-perf-btn').addEventListener('click', showPerf);
    $('dt-low-btn').addEventListener('click', function(){
      if(window.__zombieSetQuality) window.__zombieSetQuality('low');
      else localStorage.setItem('deadtakeover_render_quality','low');
    });
    $('dt-high-btn').addEventListener('click', function(){
      if(window.__zombieSetQuality) window.__zombieSetQuality('high');
      else localStorage.setItem('deadtakeover_render_quality','high');
    });

    document.addEventListener('keydown', function(e){
      if(e.code === 'KeyI' && !e.repeat){ e.preventDefault(); guide.classList.toggle('open'); }
    }, true);

    // Hook into game events for kill feed
    hookGameEvents();

    window.__labPlusKillFeed = addKillFeedItem;
    console.log('[DeadTakeover Lab+] v10 overlay active');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
