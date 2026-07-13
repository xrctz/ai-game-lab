/* ================================================================
   AI Game Lab — Library OS (live hub) + FX polish
   ================================================================ */
var AIGL = window.AIGL_Config || {
  BUILD: '25-cinematic',
  ROOT: '/ai-game-lab',
  HUB: '/ai-game-lab'
};
var AIGL_ASSET_BUILD = AIGL.BUILD || '25-cinematic';
var AIGL_HUB = AIGL.HUB || '/ai-game-lab';
var AIGL_ROOT = AIGL.ROOT || '/ai-game-lab';
var AIGL_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

(function registerSW(){
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register(AIGL_ROOT + '/showcase/sw.js?v=' + AIGL_ASSET_BUILD, {
    scope: AIGL_ROOT + '/',
    updateViaCache: 'none'
  }).catch(function(){});
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
    showToast(next === 'dark' ? 'Dark mode' : 'Light mode');
    var c = document.getElementById('ambientCanvas');
    if (c) c.style.display = next === 'light' ? 'none' : '';
    if (next === 'light' && window.__aiglFxPause) window.__aiglFxPause();
    if (next === 'dark' && window.__aiglFxResume && !document.body.classList.contains('player-active')) {
      window.__aiglFxResume();
    }
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

(function initScrollTop(){
  var btn = document.getElementById('scrollTop');
  if (!btn) return;
  var ticking = false;
  function update(){ btn.hidden = window.scrollY < 400; }
  addEventListener('scroll', function(){
    if (!ticking) requestAnimationFrame(function(){ update(); ticking = false; });
    ticking = true;
  }, { passive: true });
  btn.addEventListener('click', function(){ window.scrollTo({ top: 0, behavior: 'smooth' }); });
  update();
})();

(function initReveal(){
  var items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  function activate(el){
    el.classList.add('visible');
    var shelf = el.classList.contains('shelf') ? el : el.querySelector('.shelf');
    if (shelf) shelf.classList.add('is-in');
    if (el.classList.contains('shelf-wrap')) {
      var s = el.querySelector('.shelf');
      if (s) s.classList.add('is-in');
    }
  }
  if (!('IntersectionObserver' in window) || AIGL_REDUCED) {
    items.forEach(activate);
    return;
  }
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) {
        activate(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
  items.forEach(function(el){ obs.observe(el); });
})();

(function initMenu(){
  var toggle = document.getElementById('menuToggle');
  var rail = document.getElementById('siteRail') || document.getElementById('siteNav');
  if (!toggle || !rail) return;
  function closeMenu(){
    rail.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  toggle.addEventListener('click', function(){
    var open = rail.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', function(e){
    if (!rail.classList.contains('open')) return;
    if (!rail.contains(e.target) && !toggle.contains(e.target)) closeMenu();
  });
  rail.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && rail.classList.contains('open')) closeMenu();
  });
})();

(function highlightNav(){
  var nav = document.getElementById('siteNav');
  if (!nav) return;
  var path = location.pathname.replace(/\/$/, '') || '/';
  nav.querySelectorAll('a').forEach(function(a){
    var linkPath = new URL(a.href, location.origin).pathname.replace(/\/$/, '') || '/';
    if (path === linkPath) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
})();

(function setYear(){
  var el = document.getElementById('copyrightYear');
  if (el) el.textContent = new Date().getFullYear();
})();

(function initFilterAndSearch(){
  var buttons = document.querySelectorAll('.filter-btn');
  var cards = document.querySelectorAll('.game');
  var note = document.getElementById('resultsNote');
  var search = document.getElementById('showcaseSearch');
  if (!buttons.length && !search) return;
  var activeFilter = 'all';

  function apply(){
    var q = (search && search.value || '').trim().toLowerCase();
    var count = 0;
    cards.forEach(function(card){
      var cat = card.getAttribute('data-category') || '';
      var cats = cat.split(/\s+/);
      var matchFilter = activeFilter === 'all' || cats.indexOf(activeFilter) !== -1 || cat === activeFilter;
      var text = (card.textContent || '').toLowerCase();
      var matchSearch = !q || text.indexOf(q) !== -1;
      var show = matchFilter && matchSearch;
      card.style.display = show ? '' : 'none';
      if (show) count++;
    });
    if (note) note.textContent = count + ' project' + (count === 1 ? '' : 's');
  }

  buttons.forEach(function(btn){
    btn.addEventListener('click', function(){
      buttons.forEach(function(b){ b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      activeFilter = btn.getAttribute('data-filter') || 'all';
      apply();
    });
  });
  if (search) search.addEventListener('input', apply);
})();

(function prefetchPlay(){
  var done = false;
  function go(){
    if (done) return; done = true;
    var link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = AIGL_HUB + '/play/';
    link.as = 'document';
    document.head.appendChild(link);
  }
  document.querySelectorAll('a[href*="/play"]').forEach(function(a){
    a.addEventListener('mouseenter', go, { once: true });
    a.addEventListener('focus', go, { once: true });
  });
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
  var btnOpenTab = document.getElementById('btnOpenTab');
  var playerWrapper = document.querySelector('.player-wrapper');
  var playerLayout = document.querySelector('.player-layout') || document.querySelector('.theater');
  var LAST_KEY = 'aigl_last_game';

  var urlsApi = window.AIGL_PlayerUrls || null;
  var GAME_URLS = (urlsApi && urlsApi.GAME_URLS) || {
    zombie: AIGL_ROOT + '/games/zombie/index.html',
    deadzone: AIGL_ROOT + '/games/deadzone/index.html',
    voxel: AIGL_ROOT + '/games/voxel/index.html',
    minecraft: AIGL_ROOT + '/games/voxel/index.html',
    racing: AIGL_ROOT + '/games/racing/index.html',
    fnaf: AIGL_ROOT + '/games/fnaf/index.html',
    pokemon: AIGL_ROOT + '/games/pokemon/index.html'
  };
  var GAME_NAMES = (urlsApi && urlsApi.GAME_NAMES) || {
    zombie: 'DeadTakeover Protocol',
    deadzone: 'Dead Zone: Evacuation',
    voxel: 'CraftVerse Engine',
    minecraft: 'CraftVerse Engine',
    mindcraft: 'Mindcraft Control Deck',
    racing: 'VEIL RUSH',
    fnaf: 'Midnight Watch',
    pokemon: 'Pokémon Adventure',
    nightofthedead: 'Night of the Dead'
  };
  var currentGame = null;
  var currentIframe = null;
  var loadTimer = null;

  function readZombieOpts(){
    var qualityEl = document.getElementById('zombieQuality');
    var debugEl = document.getElementById('zombieDebug');
    var quality = (qualityEl && qualityEl.value) || localStorage.getItem('zombieQuality') || 'balanced';
    if (urlsApi && urlsApi.normalizeQuality) quality = urlsApi.normalizeQuality(quality);
    else if (!/^(low|balanced|high)$/.test(quality)) quality = 'balanced';
    localStorage.setItem('zombieQuality', quality);
    return { quality: quality, debug: !!(debugEl && debugEl.checked) };
  }

  function getStandaloneUrl(game){
    if (urlsApi && urlsApi.getStandaloneUrl) {
      if (game === 'zombie') return urlsApi.getStandaloneUrl(game, readZombieOpts());
      return urlsApi.getStandaloneUrl(game);
    }
    var base = GAME_URLS[game];
    if (!base) return null;
    if (game === 'zombie') return base + '?quality=' + encodeURIComponent(readZombieOpts().quality);
    return base;
  }

  function isHubTouchDevice() {
    try {
      if (navigator.maxTouchPoints > 0) return true;
      if ('ontouchstart' in window) return true;
      if (/iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent || '')) return true;
      if (window.matchMedia('(hover: none)').matches) return true;
    } catch (e) {}
    return Math.min(window.innerWidth, window.innerHeight) < 900;
  }

  function getGameUrl(game){
    var touch = isHubTouchDevice();
    if (urlsApi && urlsApi.getEmbedUrl) {
      if (game === 'zombie') return urlsApi.getEmbedUrl(game, Object.assign({}, readZombieOpts(), { touch: touch }));
      return urlsApi.getEmbedUrl(game, { touch: touch });
    }
    var url = GAME_URLS[game];
    if (!url) return null;
    if (game === 'zombie') {
      var opts = readZombieOpts();
      var params = ['quality=' + encodeURIComponent(opts.quality), 'embed=1'];
      if (opts.debug) params.push('debug=1');
      url = url + '?' + params.join('&');
    } else if (game === 'deadzone' || game === 'voxel' || game === 'racing' || game === 'fnaf' || game === 'pokemon') {
      url = url + '?embed=1';
    }
    if (touch) url += (url.indexOf('?') >= 0 ? '&' : '?') + 'touch=1';
    return url;
  }

  function markBootActive(game){
    document.querySelectorAll('[data-play]').forEach(function(el){
      var on = el.getAttribute('data-play') === game;
      el.classList.toggle('is-active', on);
      if (el.tagName === 'BUTTON') el.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function rememberGame(game){
    if (!game || game === 'mindcraft' || game === 'nightofthedead') return;
    try { localStorage.setItem(LAST_KEY, game); } catch(e) {}
  }

  function clearPanel(){
    playerScreen.querySelectorAll('.info-panel, .player-error').forEach(function(el){ el.remove(); });
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
    var standalone = getStandaloneUrl(game) || '#';
    var overlay = document.createElement('div');
    overlay.className = 'player-click-overlay';
    overlay.innerHTML = '<div class="pco-inner"><div class="pco-icon">▶</div><strong>Click to capture</strong><span>Click the stage to play. <kbd>Esc</kbd> releases the pointer.</span><div class="pco-actions"><a href="' + standalone + '" target="_blank" rel="noopener noreferrer">Open full tab</a></div></div>';
    overlay.addEventListener('click', function(e){
      if (e.target.closest('a')) return;
      if (currentIframe) {
        try { currentIframe.focus(); } catch(err) {}
        overlay.remove();
      }
    });
    playerScreen.appendChild(overlay);
  }
  function showLoadError(game){
    clearPanel();
    clearPlayerOverlay();
    if (playerLoader) playerLoader.classList.remove('visible');
    var name = GAME_NAMES[game] || game;
    var standalone = getStandaloneUrl(game) || '#';
    var err = document.createElement('div');
    err.className = 'player-error';
    err.innerHTML = '<div><strong>' + name + ' failed</strong><span>Embed timed out or route missing. Hard refresh, clear cache, or open full tab.</span><div class="hero-actions"><a class="btn btn-primary" href="' + standalone + '" target="_blank" rel="noopener noreferrer">Full tab</a><button class="btn btn-secondary" type="button" data-retry-game="' + game + '">Retry</button></div></div>';
    playerScreen.appendChild(err);
    err.querySelector('[data-retry-game]').addEventListener('click', function(){ loadGame(game); });
  }
  function clearIframe(){
    if (loadTimer) { clearTimeout(loadTimer); loadTimer = null; }
    if (currentIframe) {
      try {
        if (currentIframe.contentWindow && currentIframe.contentWindow.__zombieCleanup) {
          currentIframe.contentWindow.__zombieCleanup();
        }
      } catch(e) {}
      currentIframe.remove();
      currentIframe = null;
    }
    clearPanel();
    clearPlayerOverlay();
    if (playerLoader) playerLoader.classList.remove('visible');
  }
  function setStatus(active, game){
    if (liveDot) liveDot.classList.toggle('active', !!active);
    if (playerName) playerName.textContent = active && game ? (GAME_NAMES[game] || game) : 'No game loaded';
    if (btnOpenTab) {
      if (active && game && GAME_URLS[game]) {
        btnOpenTab.hidden = false;
        btnOpenTab.href = getStandaloneUrl(game) || '#';
      } else {
        btnOpenTab.hidden = true;
        btnOpenTab.removeAttribute('href');
      }
    }
  }
  function showInfoPanel(game, kicker, title, body, primaryHref, primaryLabel, secondaryHref, secondaryLabel, toastMsg){
    clearIframe();
    currentGame = game;
    markBootActive(game);
    if (playerEmpty) playerEmpty.style.display = 'none';
    var panel = document.createElement('div');
    panel.className = 'info-panel';
    panel.innerHTML = '<div><span class="eyebrow" style="color:var(--accent);font-family:var(--font-mono);font-size:0.7rem;letter-spacing:0.12em;text-transform:uppercase">' + kicker + '</span><h3>' + title + '</h3><p>' + body + '</p><div class="hero-actions"><a class="btn btn-primary" href="' + primaryHref + '" target="_blank" rel="noopener noreferrer">' + primaryLabel + '</a><a class="btn btn-secondary" href="' + secondaryHref + '">' + secondaryLabel + '</a></div></div>';
    playerScreen.appendChild(panel);
    setStatus(true, game);
    showToast(toastMsg);
  }
  function showMindcraft(){
    showInfoPanel('mindcraft', 'Local launcher', 'Mindcraft runs locally', 'Pages hosts static files only. Setup notes instead of a missing Java/Node app.', 'https://github.com/xrctz/mindcraft', 'Open repo', AIGL_HUB + '/mindcraft-info.html', 'Setup notes', 'Mindcraft panel');
  }
  function showNightOfTheDead(){
    showInfoPanel('nightofthedead', 'Native desktop', 'Night of the Dead is native', 'Raylib + .NET needs GPU drivers on your machine — not embeddable like WebGL builds.', 'https://github.com/xrctz/ai-game-lab', 'Repo', AIGL_HUB + '/nightofthedead-info.html', 'Setup notes', 'Native setup panel');
  }
  function loadGame(game){
    if (game === 'mindcraft') { showMindcraft(); return; }
    if (game === 'nightofthedead') { showNightOfTheDead(); return; }
    var url = getGameUrl(game);
    if (!url) { showToast('Unknown game: ' + game); return; }
    rememberGame(game);
    markBootActive(game);
    clearIframe();
    if (playerEmpty) playerEmpty.style.display = 'none';
    if (playerLoader) playerLoader.classList.add('visible');
    setStatus(false, null);
    var iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.loading = 'eager';
    iframe.allow = 'autoplay; fullscreen; gamepad; pointer-lock';
    iframe.referrerPolicy = 'same-origin';
    iframe.title = GAME_NAMES[game] || game;
    iframe.tabIndex = -1;
    var settled = false;
    iframe.addEventListener('load', function(){
      if (settled || currentIframe !== iframe) return;
      settled = true;
      if (loadTimer) { clearTimeout(loadTimer); loadTimer = null; }
      if (playerLoader) playerLoader.classList.remove('visible');
      if (playerEmpty) playerEmpty.style.display = 'none';
      currentGame = game;
      setStatus(true, game);
      document.body.classList.add('player-active');
      showToast((GAME_NAMES[game] || game) + ' loaded');
      try { iframe.focus(); } catch(e) {}
      showPlayerOverlay(game);
    });
    loadTimer = setTimeout(function(){
      if (currentIframe !== iframe || settled) return;
      if (playerLoader && playerLoader.classList.contains('visible')) {
        showToast('Still loading… first cache can be slow');
        loadTimer = setTimeout(function(){
          if (currentIframe === iframe && !settled) {
            settled = true;
            showLoadError(game);
          }
        }, 14000);
      }
    }, 16000);
    currentIframe = iframe;
    playerScreen.appendChild(iframe);
  }
  function closeGame(){
    clearIframe();
    currentGame = null;
    markBootActive(null);
    setStatus(false, null);
    document.body.classList.remove('player-active');
    if (playerEmpty) playerEmpty.style.display = '';
    showToast('Theater closed');
  }
  document.addEventListener('click', function(e){
    var btn = e.target.closest('[data-play]');
    if (!btn) return;
    e.preventDefault();
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
      showToast('Load a game first');
      return;
    }
    if (isPlayerFullscreen()) {
      var exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
      return;
    }
    var req = playerWrapper.requestFullscreen || playerWrapper.webkitRequestFullscreen;
    if (!req) { showToast('Fullscreen not supported'); return; }
    Promise.resolve(req.call(playerWrapper)).catch(function(){ showToast('Fullscreen failed'); });
  }
  if (btnFullscreen) btnFullscreen.addEventListener('click', togglePlayerFullscreen);
  document.addEventListener('fullscreenchange', function(){ setPlayerFullscreenUi(isPlayerFullscreen()); });
  document.addEventListener('webkitfullscreenchange', function(){ setPlayerFullscreenUi(isPlayerFullscreen()); });
  document.addEventListener('keydown', function(e){
    if (e.code !== 'KeyF' || e.repeat || !currentIframe) return;
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (document.pointerLockElement) return;
    e.preventDefault();
    togglePlayerFullscreen();
  });

  var requested = new URLSearchParams(location.search).get('game');
  if (requested) setTimeout(function(){ loadGame(requested); }, 200);
})();

(function initQualityControls(){
  var q = document.getElementById('zombieQuality');
  var d = document.getElementById('zombieDebug');
  if (q) {
    q.value = localStorage.getItem('zombieQuality') || 'balanced';
    q.addEventListener('change', function(){
      localStorage.setItem('zombieQuality', q.value);
      showToast('Quality: ' + q.value);
    });
  }
  if (d) {
    d.checked = localStorage.getItem('zombieDebug') === '1';
    d.addEventListener('change', function(){
      localStorage.setItem('zombieDebug', d.checked ? '1' : '0');
    });
  }
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
    var label = el.textContent.split(':')[0].replace(/…/g, '').trim();
    el.textContent = label;
  });
})();

(function initCommandPalette(){
  var pages = (AIGL && AIGL.pages) || {
    home: AIGL_HUB + '/',
    showcase: AIGL_HUB + '/showcase/',
    play: AIGL_HUB + '/play/',
    story: AIGL_HUB + '/story/',
    updates: AIGL_HUB + '/updates/',
    mindcraft: AIGL_HUB + '/mindcraft-info.html'
  };
  var commands = [
    {title:'Library', detail:'Home shelves', href: pages.home, tag:'page'},
    {title:'Catalog', detail:'Full inventory', href: pages.showcase, tag:'page'},
    {title:'Play DeadTakeover', detail:'Zombie FPS Lab+', href: pages.play + '?game=zombie', tag:'game'},
    {title:'Play Dead Zone', detail:'Squad FPS', href: pages.play + '?game=deadzone', tag:'game'},
    {title:'Play CraftVerse', detail:'Voxel sandbox', href: pages.play + '?game=voxel', tag:'game'},
    {title:'Play VEIL RUSH', detail:'Racing', href: pages.play + '?game=racing', tag:'game'},
    {title:'Play Midnight Watch', detail:'Horror', href: pages.play + '?game=fnaf', tag:'game'},
    {title:'Play Pokémon Adventure', detail:'RPG', href: pages.play + '?game=pokemon', tag:'game'},
    {title:'Story', detail:'Origin log', href: pages.story, tag:'page'},
    {title:'Updates', detail:'Release notes', href: pages.updates, tag:'page'},
    {title:'Mindcraft Setup', detail:'Local tool', href: pages.mindcraft, tag:'tool'},
    {title:'GitHub', detail:'Source repo', href: 'https://github.com/xrctz/ai-game-lab', tag:'external'}
  ];
  var shell = document.createElement('div');
  shell.className = 'command-shell';
  shell.setAttribute('role', 'dialog');
  shell.setAttribute('aria-modal', 'true');
  shell.setAttribute('aria-label', 'Command launcher');
  shell.setAttribute('aria-hidden', 'true');
  shell.innerHTML = '<div class="command-palette"><div class="command-head"><span>Ctrl+K</span><input id="commandSearch" type="search" placeholder="Jump to page or game…" autocomplete="off" aria-label="Search commands" /></div><div class="command-list" id="commandList" role="listbox"></div></div>';
  document.body.appendChild(shell);
  var orb = document.createElement('button');
  orb.className = 'launch-orb';
  orb.type = 'button';
  orb.innerHTML = '<span>Ctrl+K</span> Jump';
  orb.setAttribute('aria-label', 'Open command launcher');
  document.body.appendChild(orb);
  var input = shell.querySelector('#commandSearch');
  var list = shell.querySelector('#commandList');
  var active = 0;
  var lastFocus = null;
  function matches(cmd, q){
    return !q || (cmd.title + ' ' + cmd.detail + ' ' + cmd.tag).toLowerCase().indexOf(q) !== -1;
  }
  function render(){
    var q = (input.value || '').trim().toLowerCase();
    var shown = commands.filter(function(c){ return matches(c, q); });
    if (active >= shown.length) active = Math.max(0, shown.length - 1);
    list.innerHTML = shown.map(function(c, i){
      return '<button class="command-item ' + (i === active ? 'active' : '') + '" type="button" role="option" aria-selected="' + (i === active) + '" data-href="' + c.href + '"><span><strong>' + c.title + '</strong><small>' + c.detail + '</small></span><em>' + c.tag + '</em></button>';
    }).join('') || '<div class="command-item"><span><strong>No match</strong><small>Try zombie, play, story…</small></span></div>';
  }
  function open(){
    lastFocus = document.activeElement;
    shell.classList.add('open');
    shell.setAttribute('aria-hidden', 'false');
    active = 0;
    render();
    setTimeout(function(){ input.focus(); input.select(); }, 20);
  }
  function close(){
    shell.classList.remove('open');
    shell.setAttribute('aria-hidden', 'true');
    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus(); } catch(e) {}
    }
  }
  function launch(href){
    if (!href) return;
    close();
    if (/^https?:/.test(href)) window.open(href, '_blank', 'noopener');
    else location.href = href;
  }
  orb.addEventListener('click', open);
  shell.addEventListener('click', function(e){
    if (e.target === shell) close();
    var item = e.target.closest('.command-item[data-href]');
    if (item) launch(item.getAttribute('data-href'));
  });
  input.addEventListener('input', function(){ active = 0; render(); });
  document.addEventListener('keydown', function(e){
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      shell.classList.contains('open') ? close() : open();
      return;
    }
    if (!shell.classList.contains('open')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); active++; render(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); render(); }
    if (e.key === 'Enter') {
      e.preventDefault();
      var item = list.querySelector('.command-item.active[data-href]');
      if (item) launch(item.getAttribute('data-href'));
    }
  });
})();

(function initPlayerTools(){
  var lastKey = 'aigl_last_game';
  var lastBtn = document.getElementById('btnLastGame');
  if (lastBtn) lastBtn.addEventListener('click', function(){
    var game = localStorage.getItem(lastKey) || 'zombie';
    if (game === 'mindcraft' || game === 'nightofthedead') game = 'zombie';
    var target = document.querySelector('[data-play="' + game + '"]');
    if (target) target.click();
    else location.href = AIGL_HUB + '/play/?game=' + encodeURIComponent(game);
  });
  var clearBtn = document.getElementById('btnClearGameCache');
  if (clearBtn) clearBtn.addEventListener('click', function(){
    if (!('caches' in window)) { showToast('Cache API unavailable'); return; }
    var jobs = [caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k.indexOf('ai-game-lab') !== -1; }).map(function(k){ return caches.delete(k); }));
    })];
    if ('serviceWorker' in navigator) {
      jobs.push(navigator.serviceWorker.getRegistrations().then(function(regs){
        return Promise.all(regs.map(function(r){ return r.unregister(); }));
      }));
    }
    Promise.all(jobs).then(function(){
      showToast('Cache cleared — reloading');
      setTimeout(function(){ location.href = location.pathname + '?_=' + Date.now(); }, 600);
    });
  });
  var checks = [
    ['zombie', AIGL_ROOT + '/games/zombie/index.html', 'Zombie'],
    ['deadzone', AIGL_ROOT + '/games/deadzone/index.html', 'Dead Zone'],
    ['voxel', AIGL_ROOT + '/games/voxel/index.html', 'Voxel'],
    ['racing', AIGL_ROOT + '/games/racing/index.html', 'Racing'],
    ['fnaf', AIGL_ROOT + '/games/fnaf/index.html', 'FNAF'],
    ['pokemon', AIGL_ROOT + '/games/pokemon/index.html', 'Pokémon']
  ];
  checks.forEach(function(item){
    var el = document.querySelector('[data-route-check="' + item[0] + '"]');
    if (!el) return;
    fetch(item[1], { method: 'HEAD', cache: 'no-store' }).then(function(res){
      el.classList.toggle('ok', res.ok);
      el.classList.toggle('warn', !res.ok);
      el.textContent = item[2] + ': ' + (res.ok ? 'ready' : 'missing');
    }).catch(function(){
      el.classList.add('warn');
      el.textContent = item[2] + ': offline';
    });
  });
})();

(function initInstallPrompt(){
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferred = e;
    if (document.querySelector('.install-toast')) return;
    var box = document.createElement('div');
    box.className = 'install-toast';
    box.innerHTML = '<strong>Install Lab?</strong><p>Add as an app for faster launches.</p><div class="install-actions"><button class="btn-small primary" id="installAIGL" type="button">Install</button><button class="btn-small" id="dismissAIGL" type="button">Later</button></div>';
    document.body.appendChild(box);
    box.querySelector('#dismissAIGL').addEventListener('click', function(){ box.remove(); });
    box.querySelector('#installAIGL').addEventListener('click', function(){
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.finally(function(){ deferred = null; box.remove(); });
    });
  });
})();

(function initBuildBadge(){
  document.documentElement.dataset.build = 'v25-cinematic';
  window.__aiGameLabBuild = {
    version: 'v25-cinematic',
    assets: AIGL_ASSET_BUILD,
    hub: AIGL_HUB,
    note: 'Library OS cinematic motion — live hub'
  };
  requestAnimationFrame(function(){
    document.body.classList.remove('boot');
    document.body.classList.add('booted');
  });
})();

/* ---- Ambient stage + chrome inject (all pages) ---- */
(function initAmbientStage(){
  if (!document.querySelector('.ambient-stage')) {
    var stage = document.createElement('div');
    stage.className = 'ambient-stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = '<div class="ambient-mesh"></div><div class="ambient-grid"></div><div class="ambient-scan"></div><div class="ambient-noise"></div>';
    document.body.prepend(stage);
  }
  if (!document.getElementById('scrollProgress')) {
    var bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.id = 'scrollProgress';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<i></i>';
    document.body.prepend(bar);
  }
  if (!document.getElementById('pointerGlow') && !AIGL_REDUCED) {
    var glow = document.createElement('div');
    glow.className = 'pointer-glow';
    glow.id = 'pointerGlow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.prepend(glow);
  }
})();

/* ---- Constellation ambient canvas ---- */
(function initAmbientCanvas(){
  if (AIGL_REDUCED) return;
  if (document.documentElement.getAttribute('data-theme') === 'light') return;
  var canvas = document.createElement('canvas');
  canvas.id = 'ambientCanvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  var w = 0, h = 0, parts = [], raf = null, paused = false, last = 0;
  var linkDist = 110;
  function resize(){
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
    linkDist = Math.min(140, Math.max(90, innerWidth / 12));
  }
  function create(){
    var n = Math.min(36, Math.max(14, Math.round(innerWidth / 48)));
    parts = Array.from({ length: n }, function(){
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.8 + 0.5,
        o: Math.random() * 0.28 + 0.1,
        pulse: Math.random() * Math.PI * 2
      };
    });
  }
  function draw(ts){
    if (paused) { raf = null; return; }
    var dt = Math.min((ts - last) / 16 || 1, 2);
    last = ts;
    ctx.clearRect(0, 0, w, h);
    var i, j, p, q, dx, dy, dist, alpha;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.pulse += 0.02 * dt;
      if (p.x < -8) p.x = w + 8;
      if (p.x > w + 8) p.x = -8;
      if (p.y < -8) p.y = h + 8;
      if (p.y > h + 8) p.y = -8;
    }
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      for (j = i + 1; j < parts.length; j++) {
        q = parts[j];
        dx = p.x - q.x;
        dy = p.y - q.y;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < linkDist) {
          alpha = (1 - dist / linkDist) * 0.14;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = 'rgba(200,245,66,' + alpha.toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      var glow = p.o * (0.75 + 0.25 * Math.sin(p.pulse));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200,245,66,' + glow.toFixed(3) + ')';
      ctx.fill();
    }
    raf = requestAnimationFrame(draw);
  }
  function pause(){ paused = true; if (raf) cancelAnimationFrame(raf); raf = null; }
  function resume(){
    if (document.documentElement.getAttribute('data-theme') === 'light') return;
    if (!paused && raf) return;
    paused = false;
    last = performance.now();
    raf = requestAnimationFrame(draw);
  }
  window.__aiglFxPause = pause;
  window.__aiglFxResume = resume;
  var mo = new MutationObserver(function(){
    if (document.body.classList.contains('player-active')) pause();
    else if (!document.hidden) resume();
  });
  mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', function(){
    if (document.hidden) pause(); else if (!document.body.classList.contains('player-active')) resume();
  });
  addEventListener('resize', function(){ resize(); create(); }, { passive: true });
  resize(); create(); resume();
})();

/* ---- Featured banner carousel + parallax ---- */
(function initFeatureCarousel(){
  var root = document.getElementById('featureBanner');
  if (!root || !root.hasAttribute('data-carousel')) return;
  var slides = [
    {
      title: 'DeadTakeover Protocol',
      eyebrow: 'Featured · Lab+',
      lede: 'Open-world zombie survival FPS. Streamed worlds, loot runs, and browser-native WebGL — no install.',
      chips: ['Playable', 'Three.js', 'FPS', '/games/zombie'],
      href: AIGL_HUB + '/play/?game=zombie'
    },
    {
      title: 'VEIL RUSH',
      eyebrow: 'Featured · Racing',
      lede: 'Pilot the Dawnshard skimmer across the Glass Meridian — spectrum orbs, prism gates, aurora desert.',
      chips: ['Playable', 'Three.js', 'Racing', '/games/racing'],
      href: AIGL_HUB + '/play/?game=racing'
    },
    {
      title: 'Midnight Watch',
      eyebrow: 'Featured · Horror',
      lede: 'Guard Bruno\'s Pizzeria through five nights. Cameras, doors, power — one mistake ends the shift.',
      chips: ['Playable', 'Three.js', 'Horror', '/games/fnaf'],
      href: AIGL_HUB + '/play/?game=fnaf'
    }
  ];
  var bg = document.getElementById('bannerBg');
  var title = document.getElementById('bannerTitle');
  var eyebrow = document.getElementById('bannerEyebrow');
  var lede = document.getElementById('bannerLede');
  var meta = document.getElementById('bannerMeta');
  var play = document.getElementById('bannerPlay');
  var progress = document.getElementById('bannerProgress');
  var dotsWrap = document.getElementById('bannerDots');
  var content = root.querySelector('.feature-banner-content');
  var prevBtn = document.getElementById('bannerPrev');
  var nextBtn = document.getElementById('bannerNext');
  var slideEls = bg ? bg.querySelectorAll('.banner-slide') : [];
  var idx = 0;
  var duration = 8000;
  var started = 0;
  var timer = null;
  var raf = null;
  var swapping = false;

  function renderDots(){
    if (!dotsWrap) return;
    dotsWrap.innerHTML = slides.map(function(_, i){
      return '<button type="button" role="tab" aria-label="Featured ' + (i + 1) + '"' + (i === idx ? ' aria-current="true"' : '') + ' data-i="' + i + '"></button>';
    }).join('');
    dotsWrap.querySelectorAll('button').forEach(function(btn){
      btn.addEventListener('click', function(){ go(+btn.getAttribute('data-i')); });
    });
  }
  function paint(i){
    idx = (i + slides.length) % slides.length;
    var s = slides[idx];
    slideEls.forEach(function(el, n){ el.classList.toggle('is-active', n === idx); });
    if (title) title.textContent = s.title;
    if (eyebrow) eyebrow.innerHTML = '<span aria-hidden="true">●</span> ' + s.eyebrow;
    if (lede) lede.textContent = s.lede;
    if (meta) {
      meta.innerHTML = s.chips.map(function(c, n){
        return '<span class="chip' + (n === 0 ? ' live' : '') + '">' + c + '</span>';
      }).join('');
    }
    if (play) {
      play.href = s.href;
      play.textContent = '▶ Play now';
    }
    renderDots();
    started = performance.now();
  }
  function apply(i, animate){
    if (!animate || AIGL_REDUCED || !content) {
      paint(i);
      if (content) {
        content.classList.remove('is-swapping');
        content.classList.add('is-ready');
      }
      return;
    }
    if (swapping) return;
    swapping = true;
    content.classList.add('is-swapping');
    content.classList.remove('is-ready');
    setTimeout(function(){
      paint(i);
      content.classList.remove('is-swapping');
      content.classList.add('is-ready');
      swapping = false;
    }, 220);
  }
  function go(i){
    apply(i, true);
  }
  function tick(now){
    if (AIGL_REDUCED) return;
    var p = Math.min(1, (now - started) / duration);
    if (progress) progress.style.width = (p * 100).toFixed(2) + '%';
    if (p >= 1) go(idx + 1);
    raf = requestAnimationFrame(tick);
  }
  apply(0, false);
  if (!AIGL_REDUCED) {
    started = performance.now();
    raf = requestAnimationFrame(tick);
    root.addEventListener('mouseenter', function(){ if (raf) cancelAnimationFrame(raf); raf = null; });
    root.addEventListener('mouseleave', function(){
      started = performance.now() - (duration * (parseFloat(progress && progress.style.width) || 0) / 100);
      if (!raf) raf = requestAnimationFrame(tick);
    });
  }
  if (prevBtn) prevBtn.addEventListener('click', function(){ go(idx - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function(){ go(idx + 1); });
  root.addEventListener('keydown', function(e){
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
  });
  root.setAttribute('tabindex', '0');

  // Pointer parallax on banner bg
  if (!AIGL_REDUCED && bg && window.matchMedia('(hover: hover)').matches) {
    root.addEventListener('pointermove', function(e){
      var r = root.getBoundingClientRect();
      var x = ((e.clientX - r.left) / r.width - 0.5) * 16;
      var y = ((e.clientY - r.top) / r.height - 0.5) * 10;
      bg.style.setProperty('--px', x.toFixed(2) + 'px');
      bg.style.setProperty('--py', y.toFixed(2) + 'px');
    }, { passive: true });
    root.addEventListener('pointerleave', function(){
      bg.style.setProperty('--px', '0px');
      bg.style.setProperty('--py', '0px');
    });
  }
})();

/* ---- Tile 3D tilt ---- */
(function initTileTilt(){
  if (AIGL_REDUCED || !window.matchMedia('(hover: hover)').matches) return;
  document.querySelectorAll('[data-tilt], .game-tile, .catalog-card').forEach(function(tile){
    if (tile._tiltBound) return;
    tile._tiltBound = true;
    tile.addEventListener('pointermove', function(e){
      var r = tile.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      var ry = ((px - 0.5) * 10).toFixed(2) + 'deg';
      var rx = ((0.5 - py) * 8).toFixed(2) + 'deg';
      tile.style.setProperty('--rx', rx);
      tile.style.setProperty('--ry', ry);
    }, { passive: true });
    tile.addEventListener('pointerleave', function(){
      tile.style.setProperty('--rx', '0deg');
      tile.style.setProperty('--ry', '0deg');
    });
  });
})();

/* ---- Stats count-up ---- */
(function initCountUp(){
  var bar = document.querySelector('.stats-bar');
  if (!bar) return;
  var nums = bar.querySelectorAll('[data-count]');
  if (!nums.length) return;
  function run(){
    nums.forEach(function(el){
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      if (AIGL_REDUCED) { el.textContent = String(target); return; }
      var start = performance.now();
      var dur = 900;
      function frame(now){
        var t = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = String(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }
  if (bar.classList.contains('visible') || AIGL_REDUCED) {
    run();
    return;
  }
  if (!('IntersectionObserver' in window)) { run(); return; }
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) {
        run();
        obs.disconnect();
      }
    });
  }, { threshold: 0.3 });
  obs.observe(bar);
})();

/* ---- Auto tile-play inject for catalog cards ---- */
(function injectTilePlay(){
  document.querySelectorAll('.catalog-card .game-tile-art, .run-card-preview').forEach(function(art){
    if (art.querySelector('.tile-play')) return;
    var overlay = document.createElement('div');
    overlay.className = 'tile-play';
    overlay.innerHTML = '<span>▶ View</span>';
    art.appendChild(overlay);
  });
})();

/* ---- Scroll progress ---- */
(function initScrollProgress(){
  var bar = document.getElementById('scrollProgress');
  if (!bar) return;
  var fill = bar.querySelector('i');
  if (!fill) return;
  var ticking = false;
  function update(){
    var max = document.documentElement.scrollHeight - innerHeight;
    var p = max > 0 ? (scrollY / max) * 100 : 0;
    fill.style.width = Math.max(0, Math.min(100, p)).toFixed(2) + '%';
  }
  addEventListener('scroll', function(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function(){ update(); ticking = false; });
  }, { passive: true });
  addEventListener('resize', update, { passive: true });
  update();
})();

/* ---- Pointer glow / spotlight ---- */
(function initPointerGlow(){
  if (AIGL_REDUCED || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var glow = document.getElementById('pointerGlow');
  if (!glow) return;
  var x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, raf = null;
  function loop(){
    x += (tx - x) * 0.12;
    y += (ty - y) * 0.12;
    glow.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    raf = requestAnimationFrame(loop);
  }
  addEventListener('pointermove', function(e){
    tx = e.clientX;
    ty = e.clientY;
    glow.classList.add('is-on');
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  addEventListener('pointerleave', function(){
    glow.classList.remove('is-on');
  });
  document.addEventListener('visibilitychange', function(){
    if (document.hidden) {
      glow.classList.remove('is-on');
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }
  });
})();

/* ---- Magnetic panels + CTAs ---- */
(function initMagnetic(){
  if (AIGL_REDUCED || !window.matchMedia('(hover: hover)').matches) return;
  document.querySelectorAll('[data-magnetic], .btn-primary, .btn-rail.primary').forEach(function(el){
    if (el._magBound) return;
    el._magBound = true;
    el.addEventListener('pointermove', function(e){
      var r = el.getBoundingClientRect();
      var mx = ((e.clientX - r.left) / r.width) * 100;
      var my = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty('--mx', mx.toFixed(1) + '%');
      el.style.setProperty('--my', my.toFixed(1) + '%');
      if (el.classList.contains('btn-primary') || el.classList.contains('btn-rail')) {
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.12;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.16;
        el.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      }
    }, { passive: true });
    el.addEventListener('pointerleave', function(){
      el.style.transform = '';
      el.style.removeProperty('--mx');
      el.style.removeProperty('--my');
    });
  });
})();

/* ---- Section underline trigger via parent reveal ---- */
(function initSectionHeads(){
  document.querySelectorAll('.section > .section-head').forEach(function(head){
    if (!head.classList.contains('reveal')) return;
    var section = head.parentElement;
    if (!section) return;
    var obsTarget = head;
    if (!('IntersectionObserver' in window) || AIGL_REDUCED) {
      head.classList.add('visible');
      return;
    }
    // already handled by initReveal; ensure underline draws
  });
})();
