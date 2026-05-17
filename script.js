/* ================================================================
   AI Game Lab v11 — site interactions, launcher, and safe game player
   ================================================================ */
(function cursorSpotlight(){
  document.addEventListener('mousemove', function(e){
    document.body.style.setProperty('--cx', ((e.clientX / innerWidth) * 100).toFixed(2) + '%');
    document.body.style.setProperty('--cy', ((e.clientY / innerHeight) * 100).toFixed(2) + '%');
  }, { passive: true });
})();

(function registerSW(){
  if (!('serviceWorker' in navigator)) return;
  var reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', function(){
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
  navigator.serviceWorker.register('/ai-game-lab/showcase/sw.js', { scope: '/ai-game-lab/', updateViaCache: 'none' })
    .then(function(reg){
      reg.update();
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      reg.addEventListener('updatefound', function(){
        var worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', function(){
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    })
    .catch(function(){});
})();

(function initParticles(){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;opacity:.38;';
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var w = 0, h = 0, particles = [], raf = null, paused = false;
  function resize(){ w = canvas.width = innerWidth; h = canvas.height = innerHeight; }
  function create(){
    var count = Math.min(30, Math.max(14, Math.round(innerWidth / 55)));
    particles = Array.from({ length: count }, function(){
      return { x: Math.random()*w, y: Math.random()*h, vx:(Math.random()-.5)*.22, vy:(Math.random()-.5)*.22, r:Math.random()*1.8+.5, o:Math.random()*.18+.1 };
    });
  }
  var last = 0;
  function draw(ts){
    if (paused) { raf = null; return; }
    var dt = Math.min((ts - last) / 16 || 1, 2); last = ts;
    ctx.clearRect(0,0,w,h);
    for (var i=0;i<particles.length;i++){
      var p = particles[i]; p.x += p.vx*dt; p.y += p.vy*dt;
      if (p.x < -8) p.x = w + 8; if (p.x > w + 8) p.x = -8; if (p.y < -8) p.y = h + 8; if (p.y > h + 8) p.y = -8;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle = 'rgba(255,110,180,' + p.o + ')'; ctx.fill();
    }
    raf = requestAnimationFrame(draw);
  }
  window.__particlePause = function(){ paused = true; if (raf) cancelAnimationFrame(raf); raf = null; };
  window.__particleResume = function(){ if (!paused) return; paused = false; raf = requestAnimationFrame(draw); };
  addEventListener('resize', function(){ resize(); create(); }, { passive: true });
  resize(); create(); raf = requestAnimationFrame(draw);
})();

(function initTheme(){
  var saved = localStorage.getItem('theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
  var btn = document.getElementById('themeBtn');
  if (!btn) return;
  btn.addEventListener('click', function(){
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
})();

function showToast(msg, duration){
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(function(){ toast.classList.remove('show'); }, duration || 2200);
}

(function initCopy(){
  document.addEventListener('click', function(e){
    var btn = e.target.closest('[data-copy]');
    if (!btn || !navigator.clipboard) return;
    navigator.clipboard.writeText(btn.getAttribute('data-copy') || '').then(function(){ showToast('Copied to clipboard'); }).catch(function(){ showToast('Copy failed'); });
  });
})();

(function initScrollTop(){
  var btn = document.getElementById('scrollTop');
  if (!btn) return;
  var ticking = false;
  function update(){ btn.hidden = window.scrollY < 440; }
  addEventListener('scroll', function(){ if (!ticking) requestAnimationFrame(function(){ update(); ticking = false; }); ticking = true; }, { passive: true });
  btn.addEventListener('click', function(){ window.scrollTo({ top: 0, behavior: 'smooth' }); });
  update();
})();

(function initReveal(){
  var items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  if (!('IntersectionObserver' in window)) { items.forEach(function(el){ el.classList.add('visible'); }); return; }
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){ if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); } });
  }, { threshold: .12 });
  items.forEach(function(el){ obs.observe(el); });
})();

(function initMenu(){
  var toggle = document.getElementById('menuToggle');
  var nav = document.getElementById('siteNav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', function(){
    var open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', function(e){
    if (!nav.classList.contains('open')) return;
    if (!nav.contains(e.target) && !toggle.contains(e.target)) { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
  });
})();

(function highlightNav(){
  var nav = document.getElementById('siteNav');
  if (!nav) return;
  var path = location.pathname.replace(/\/$/, '') || '/';
  nav.querySelectorAll('a').forEach(function(a){
    var linkPath = new URL(a.href, location.origin).pathname.replace(/\/$/, '') || '/';
    if (path === linkPath) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
})();

(function setYear(){
  var el = document.getElementById('copyrightYear');
  if (el) el.textContent = new Date().getFullYear();
})();

(function initFilter(){
  var buttons = document.querySelectorAll('.filter-btn');
  if (!buttons.length) return;
  var cards = document.querySelectorAll('.game');
  var note = document.getElementById('resultsNote');
  buttons.forEach(function(btn){
    btn.addEventListener('click', function(){
      buttons.forEach(function(b){ b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active'); btn.setAttribute('aria-selected', 'true');
      var filter = btn.getAttribute('data-filter');
      var count = 0;
      cards.forEach(function(card){
        var match = filter === 'all' || card.getAttribute('data-category') === filter;
        card.style.display = match ? '' : 'none'; if (match) count++;
      });
      if (note) note.textContent = count + ' project' + (count === 1 ? '' : 's');
    });
  });
})();

(function prefetchPlay(){
  var done = false;
  function go(){
    if (done) return; done = true;
    var link = document.createElement('link'); link.rel = 'prefetch'; link.href = '/ai-game-lab/play/'; link.as = 'document'; document.head.appendChild(link);
  }
  document.querySelectorAll('a[href^="/ai-game-lab/play/"]').forEach(function(a){ a.addEventListener('mouseenter', go, { once: true }); a.addEventListener('focus', go, { once: true }); });
})();

(function initPlayer(){
  var playerScreen = document.getElementById('playerScreen');
  if (!playerScreen) return;
  var playerName = document.getElementById('playerName');
  var playerEmpty = document.getElementById('playerEmpty');
  var playerLoader = document.getElementById('playerLoader');
  var liveDot = document.getElementById('liveDot');
  var btnRefresh = document.getElementById('btnRefresh');
  var btnClose = document.getElementById('btnClose');
  var btnFullscreen = document.getElementById('btnFullscreen');
  var playerWrapper = document.querySelector('.player-wrapper');
  var playerLayout = document.querySelector('.player-layout');

  var GAME_URLS = {
    zombie: '/ai-game-lab/games/zombie/index.html',
    deadzone: '/ai-game-lab/games/deadzone/index.html',
    voxel: '/ai-game-lab/games/voxel/index.html',
    minecraft: '/ai-game-lab/games/voxel/index.html'
  };
  var GAME_NAMES = {
    zombie: 'DeadTakeover Protocol',
    deadzone: 'Dead Zone: Evacuation',
    voxel: 'CraftVerse Engine',
    minecraft: 'CraftVerse Engine',
    mindcraft: 'Mindcraft Control Deck'
  };
  var currentGame = null;
  var currentIframe = null;

  function getGameUrl(game){
    var url = GAME_URLS[game];
    if (game === 'zombie') {
      var qualityEl = document.getElementById('zombieQuality');
      var debugEl = document.getElementById('zombieDebug');
      var quality = (qualityEl && qualityEl.value) || localStorage.getItem('zombieQuality') || 'balanced';
      if (!/^(low|balanced|high)$/.test(quality)) quality = 'balanced';
      localStorage.setItem('zombieQuality', quality);
      var params = new URLSearchParams();
      params.set('quality', quality);
      params.set('embed', '1');
      if (debugEl && debugEl.checked) params.set('debug', '1');
      return url + '?' + params.toString();
    }
    if (game === 'deadzone' || game === 'voxel') {
      return url + '?embed=1';
    }
    return url;
  }

  function clearPanel(){
    playerScreen.querySelectorAll('.info-panel').forEach(function(el){ el.remove(); });
  }
  function clearPlayerOverlay(){
    var existing = playerScreen.querySelector('.player-click-overlay');
    if (existing) existing.remove();
  }
  function showPlayerOverlay(game){
    clearPlayerOverlay();
    if (!currentIframe) return;
    if (game === 'voxel') {
      try {
        currentIframe.focus();
        currentIframe.contentWindow.postMessage({ type: 'cv-lab-request-lock' }, '*');
      } catch(e) {}
      return;
    }
    var overlay = document.createElement('div');
    overlay.className = 'player-click-overlay';
    overlay.innerHTML = '<div class="pco-inner"><div class="pco-icon">🎯</div><strong>Click to capture mouse</strong><span>Click anywhere to start playing. Press <kbd>Esc</kbd> to release.</span></div>';
    overlay.addEventListener('click', function(){
      if (currentIframe && currentIframe.contentWindow) {
        try { currentIframe.focus(); } catch(e) {}
        overlay.remove();
      }
    });
    playerScreen.appendChild(overlay);
  }
  function clearIframe(){
    if (currentIframe) {
      try { if (currentIframe.contentWindow && currentIframe.contentWindow.__zombieCleanup) currentIframe.contentWindow.__zombieCleanup(); } catch(e) {}
      currentIframe.remove(); currentIframe = null;
    }
    clearPanel();
    clearPlayerOverlay();
    if (playerLoader) playerLoader.classList.remove('visible');
  }
  function setStatus(active, game){
    if (liveDot) liveDot.classList.toggle('active', !!active);
    if (playerName) playerName.textContent = active && game ? (GAME_NAMES[game] || game) : 'No game loaded';
  }
  function showMindcraft(){
    if (window.__particleResume) window.__particleResume();
    clearIframe(); currentGame = 'mindcraft';
    if (playerEmpty) playerEmpty.style.display = 'none';
    var panel = document.createElement('div');
    panel.className = 'info-panel';
    panel.innerHTML = '<div><span class="hero-kicker"><span class="pulse-dot"></span> Local launcher</span><h3>Mindcraft runs on your machine.</h3><p>GitHub Pages can only host static files, so this hub shows setup info instead of trying to iframe a missing local Java/Node app.</p><div class="hero-actions"><a class="btn btn-primary" href="https://github.com/xrctz/mindcraft" target="_blank" rel="noopener noreferrer">Open repo</a><a class="btn btn-secondary" href="/ai-game-lab/mindcraft-info.html">Setup notes</a></div></div>';
    playerScreen.appendChild(panel);
    setStatus(true, 'mindcraft');
    showToast('Mindcraft setup panel opened');
  }
  function loadGame(game){
    if (game === 'mindcraft') { showMindcraft(); return; }
    var url = getGameUrl(game);
    if (!url) { showToast('Unknown game: ' + game); return; }
    if (window.__particlePause) window.__particlePause();
    clearIframe();
    if (playerEmpty) playerEmpty.style.display = 'none';
    if (playerLoader) playerLoader.classList.add('visible');
    setStatus(false, null);
    var iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.loading = 'eager';
    iframe.allow = 'autoplay; fullscreen; gamepad; pointer-lock';
    iframe.title = GAME_NAMES[game] || game;
    iframe.tabIndex = -1;
    iframe.addEventListener('load', function(){
      if (playerLoader) playerLoader.classList.remove('visible');
      if (playerEmpty) playerEmpty.style.display = 'none';
      currentGame = game; setStatus(true, game); showToast((GAME_NAMES[game] || game) + ' loaded');
      try { iframe.focus(); } catch(e) {}
      showPlayerOverlay(game);
    });
    setTimeout(function(){
      if (currentIframe === iframe && playerLoader && playerLoader.classList.contains('visible')) {
        playerLoader.classList.remove('visible'); showToast('Still loading. Large games can take longer on first cache.');
      }
    }, 16000);
    currentIframe = iframe;
    playerScreen.appendChild(iframe);
  }
  function closeGame(){
    clearIframe(); currentGame = null; setStatus(false, null);
    if (playerEmpty) playerEmpty.style.display = '';
    if (window.__particleResume) window.__particleResume();
    showToast('Player closed');
  }
  document.addEventListener('click', function(e){
    var btn = e.target.closest('[data-play]');
    if (!btn) return;
    loadGame(btn.getAttribute('data-play'));
  });
  if (btnRefresh) btnRefresh.addEventListener('click', function(){ if (currentGame) loadGame(currentGame); });
  if (btnClose) btnClose.addEventListener('click', closeGame);

  function isPlayerFullscreen(){
    var fs = document.fullscreenElement || document.webkitFullscreenElement;
    return fs && playerWrapper && (fs === playerWrapper || playerWrapper.contains(fs));
  }
  function setPlayerFullscreenUi(on){
    if (playerLayout) playerLayout.classList.toggle('player-fs', !!on);
    if (btnFullscreen) btnFullscreen.classList.toggle('is-active', !!on);
    if (playerWrapper) playerWrapper.classList.toggle('is-fullscreen', !!on);
  }
  function togglePlayerFullscreen(){
    if (!playerWrapper || !currentIframe) {
      showToast('Load a game first, then use fullscreen.');
      return;
    }
    if (isPlayerFullscreen()) {
      var exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
      return;
    }
    var req = playerWrapper.requestFullscreen || playerWrapper.webkitRequestFullscreen;
    if (!req) {
      showToast('Fullscreen is not supported in this browser.');
      return;
    }
    Promise.resolve(req.call(playerWrapper)).catch(function(){
      showToast('Could not enter fullscreen.');
    });
  }
  if (btnFullscreen) btnFullscreen.addEventListener('click', togglePlayerFullscreen);
  document.addEventListener('fullscreenchange', function(){ setPlayerFullscreenUi(isPlayerFullscreen()); });
  document.addEventListener('webkitfullscreenchange', function(){ setPlayerFullscreenUi(isPlayerFullscreen()); });
  document.addEventListener('keydown', function(e){
    if (e.code !== 'KeyF' || e.repeat || !currentIframe) return;
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    togglePlayerFullscreen();
  });

  var requested = new URLSearchParams(location.search).get('game');
  if (requested) setTimeout(function(){ loadGame(requested); }, 250);
})();


(function initV8QualityControls(){
  var q = document.getElementById('zombieQuality');
  var d = document.getElementById('zombieDebug');
  if (q) {
    q.value = localStorage.getItem('zombieQuality') || 'balanced';
    q.addEventListener('change', function(){ localStorage.setItem('zombieQuality', q.value); showToast('DeadTakeover quality set to ' + q.value); });
  }
  if (d) d.checked = localStorage.getItem('zombieDebug') === '1';
  if (d) d.addEventListener('change', function(){ localStorage.setItem('zombieDebug', d.checked ? '1' : '0'); });
})();

(function initRuntimeChecks(){
  var checks = {
    webgl2: function(){ try { return !!document.createElement('canvas').getContext('webgl2'); } catch(e){ return false; } },
    sw: function(){ return 'serviceWorker' in navigator; },
    motion: function(){ return !window.matchMedia('(prefers-reduced-motion: reduce)').matches; },
    pointer: function(){ return 'pointerLockElement' in document || 'mozPointerLockElement' in document; }
  };
  Object.keys(checks).forEach(function(key){
    var el = document.querySelector('[data-check="' + key + '"]');
    if (!el) return;
    var ok = checks[key]();
    el.classList.add(ok ? 'ok' : 'warn');
    var label = el.textContent.split(':')[0];
    el.textContent = label + ': ' + (ok ? 'ready' : 'limited');
  });
  if (!document.querySelector('.runtime-strip') && document.body.classList) {
    var main = document.getElementById('main');
    if (!main || !document.querySelector('.hero-shell')) return;
    var strip = document.createElement('div');
    strip.className = 'runtime-strip reveal visible';
    var items = [
      ['WebGL2', checks.webgl2()], ['Service Worker', checks.sw()], ['Motion FX', checks.motion()], ['Pointer Lock', checks.pointer()]
    ];
    strip.innerHTML = items.map(function(item){ return '<span class="runtime-chip ' + (item[1] ? 'ok' : 'warn') + '">' + item[0] + ': ' + (item[1] ? 'ready' : 'limited') + '</span>'; }).join('');
    main.insertBefore(strip, main.firstChild);
  }
})();

(function initCommandPalette(){
  var commands = [
    {title:'Home', detail:'Return to the launch deck', href:'/ai-game-lab/', tag:'page'},
    {title:'Showcase', detail:'Browse all project cards', href:'/ai-game-lab/showcase/', tag:'page'},
    {title:'Play DeadTakeover Lab+', detail:'Boot the zombie game with visual effects and director HUD', href:'/ai-game-lab/play/?game=zombie', tag:'game'},
    {title:'Play Dead Zone: Evacuation', detail:'3D squad FPS with two maps and 15 waves', href:'/ai-game-lab/play/?game=deadzone', tag:'game'},
    {title:'Play CraftVerse', detail:'Boot the voxel sandbox', href:'/ai-game-lab/play/?game=voxel', tag:'game'},
    {title:'Story', detail:'Read the project origin log', href:'/ai-game-lab/story/', tag:'page'},
    {title:'Updates', detail:'Read release notes and runtime status', href:'/ai-game-lab/showcase/updates/', tag:'page'},
    {title:'Mindcraft Setup', detail:'Open local AI tool notes', href:'/ai-game-lab/mindcraft-info.html', tag:'tool'},
    {title:'GitHub Repo', detail:'Open source repository', href:'https://github.com/xrctz/ai-game-lab', tag:'external'}
  ];
  var shell = document.createElement('div');
  shell.className = 'command-shell';
  shell.setAttribute('role','dialog');
  shell.setAttribute('aria-modal','true');
  shell.setAttribute('aria-label','Command launcher');
  shell.innerHTML = '<div class="command-palette"><div class="command-head"><span>Ctrl+K</span><input id="commandSearch" type="search" placeholder="Launch a page or game…" autocomplete="off" /></div><div class="command-list" id="commandList"></div></div>';
  document.body.appendChild(shell);
  var orb = document.createElement('button');
  orb.className = 'launch-orb';
  orb.type = 'button';
  orb.innerHTML = '<span>Ctrl+K</span> Launcher';
  orb.setAttribute('aria-label','Open command launcher');
  document.body.appendChild(orb);
  var input = shell.querySelector('#commandSearch');
  var list = shell.querySelector('#commandList');
  var active = 0;
  function matches(cmd, q){ return !q || (cmd.title + ' ' + cmd.detail + ' ' + cmd.tag).toLowerCase().indexOf(q) !== -1; }
  function render(){
    var q = (input.value || '').trim().toLowerCase();
    var shown = commands.filter(function(c){ return matches(c, q); });
    if (active >= shown.length) active = 0;
    list.innerHTML = shown.map(function(c, i){ return '<button class="command-item ' + (i === active ? 'active' : '') + '" type="button" data-href="' + c.href + '"><span><strong>' + c.title + '</strong><small>' + c.detail + '</small></span><em>' + c.tag + '</em></button>'; }).join('') || '<div class="command-item"><span><strong>No match</strong><small>Try play, zombie, story, or GitHub.</small></span></div>';
  }
  function open(){ shell.classList.add('open'); active = 0; render(); setTimeout(function(){ input.focus(); input.select(); }, 20); }
  function close(){ shell.classList.remove('open'); }
  function launch(href){ if (!href) return; if (/^https?:/.test(href)) window.open(href, '_blank', 'noopener'); else location.href = href; }
  orb.addEventListener('click', open);
  shell.addEventListener('click', function(e){ if (e.target === shell) close(); var item = e.target.closest('.command-item[data-href]'); if (item) launch(item.getAttribute('data-href')); });
  input.addEventListener('input', function(){ active = 0; render(); });
  document.addEventListener('keydown', function(e){
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); shell.classList.contains('open') ? close() : open(); return; }
    if (!shell.classList.contains('open')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); active++; render(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); render(); }
    if (e.key === 'Enter') { e.preventDefault(); var item = list.querySelector('.command-item.active[data-href]'); if (item) launch(item.getAttribute('data-href')); }
  });
})();


(function initV9PlayerTools(){
  var lastKey = 'aigl_last_game';
  document.addEventListener('click', function(e){
    var play = e.target.closest('[data-play]');
    if (play) localStorage.setItem(lastKey, play.getAttribute('data-play'));
  });
  var lastBtn = document.getElementById('btnLastGame');
  if (lastBtn) lastBtn.addEventListener('click', function(){
    var game = localStorage.getItem(lastKey) || 'zombie';
    var target = document.querySelector('[data-play="' + game + '"]');
    if (target) target.click(); else location.href = '/ai-game-lab/play/?game=' + encodeURIComponent(game);
  });
  var clearBtn = document.getElementById('btnClearGameCache');
  if (clearBtn) clearBtn.addEventListener('click', function(){
    if (!('caches' in window)) { showToast('Browser cache API unavailable'); return; }
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k.indexOf('ai-game-lab') !== -1; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ showToast('Site cache refreshed. Reloading…'); setTimeout(function(){ location.reload(); }, 650); });
  });
  var checks = [
    ['zombie','/ai-game-lab/games/zombie/index.html','Zombie'],
    ['deadzone','/ai-game-lab/games/deadzone/index.html','Dead Zone'],
    ['voxel','/ai-game-lab/games/voxel/index.html','Voxel']
  ];
  checks.forEach(function(item){
    var el = document.querySelector('[data-route-check="' + item[0] + '"]');
    if (!el) return;
    var label = item[2];
    fetch(item[1], { method:'HEAD', cache:'no-store' }).then(function(res){
      el.classList.toggle('ok', res.ok); el.classList.toggle('warn', !res.ok);
      el.textContent = label + ' route: ' + (res.ok ? 'ready' : 'missing');
    }).catch(function(){ el.classList.add('warn'); el.textContent = label + ' route: offline'; });
  });
})();

(function initV9InstallPrompt(){
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault(); deferred = e;
    if (document.querySelector('.install-toast')) return;
    var box = document.createElement('div');
    box.className = 'install-toast show';
    box.innerHTML = '<strong>Install AI Game Lab?</strong><p>Add the hub like an app for faster launching.</p><div class="install-actions"><button class="btn-small primary" id="installAIGL" type="button">Install</button><button class="btn-small" id="dismissAIGL" type="button">Not now</button></div>';
    document.body.appendChild(box);
    box.querySelector('#dismissAIGL').addEventListener('click', function(){ box.remove(); });
    box.querySelector('#installAIGL').addEventListener('click', function(){
      if (!deferred) return; deferred.prompt(); deferred.userChoice.finally(function(){ deferred = null; box.remove(); });
    });
  });
})();

(function initV9PageBadges(){
  document.documentElement.dataset.build = 'v12-kawaii';
  window.__aiGameLabBuild = { version:'v12-kawaii', zombieBundle:'index-labplus-v9.js', updated:'kawaii pink anime visual overhaul' };
})();

(function initHeroVideo() {
  var v = document.getElementById('heroVideo');
  if (!v) return;
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  function tryPlay() {
    if (mq.matches) {
      v.pause();
      try { v.currentTime = 0; } catch (e) {}
      return;
    }
    v.muted = true;
    var p = v.play();
    if (p && typeof p.catch === 'function') p.catch(function () {});
  }
  function onFirstGesture() {
    tryPlay();
    document.removeEventListener('pointerdown', onFirstGesture);
    document.removeEventListener('touchstart', onFirstGesture);
  }
  v.addEventListener('loadeddata', tryPlay);
  v.addEventListener('canplay', tryPlay);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) tryPlay();
  });
  document.addEventListener('pointerdown', onFirstGesture, { passive: true });
  document.addEventListener('touchstart', onFirstGesture, { passive: true });
  tryPlay();
  if (mq.addEventListener) mq.addEventListener('change', tryPlay);
  else if (mq.addListener) mq.addListener(tryPlay);
})();
