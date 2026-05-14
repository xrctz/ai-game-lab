/* ================================================================
   AI Game Lab — Script
   Theme, nav, reveal, particles, spotlight, player, showcase
   ================================================================ */

/* ---------- Cursor spotlight ---------- */
document.addEventListener('mousemove', (e) => {
  const cx = (e.clientX / window.innerWidth) * 100;
  const cy = (e.clientY / window.innerHeight) * 100;
  document.body.style.setProperty('--cx', cx + '%');
  document.body.style.setProperty('--cy', cy + '%');
}, { passive: true });

/* ---------- Particle background (Canvas) ---------- */
(function initParticles() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  const existingAmbient = document.querySelector('.ambient');
  const surfaceEl = existingAmbient || document.body;
  canvas.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;opacity:0.65;';
  surfaceEl.insertAdjacentElement('afterend', canvas);
  const ctx = canvas.getContext('2d');
  let w, h, particles = [];

  function resize() { w = canvas.width = innerWidth; h = canvas.height = innerHeight; }
  function create() {
    particles = [];
    for (let i = 0; i < 35; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25 - 0.08,
        r: Math.random() * 1.5 + 0.5,
        o: Math.random() * 0.13 + 0.12
      });
    }
  }

  let last = 0;
  function draw(ts) {
    const dt = Math.min((ts - last) / 16, 2);
    last = ts;
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(155,48,255,' + p.o + ')';
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  addEventListener('resize', () => { resize(); create(); });
  resize();
  create();
  requestAnimationFrame(draw);
})();

/* ---------- Theme toggle ---------- */
(function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);

  const btn = document.getElementById('themeBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }
})();

/* ---------- Toast ---------- */
function showToast(msg, duration) {
  duration = duration || 2200;
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(function () { toast.classList.remove('show'); }, duration);
}

/* ---------- Copy to clipboard ---------- */
document.addEventListener('click', function (e) {
  var btn = e.target.closest('[data-copy]');
  if (!btn) return;
  var text = btn.getAttribute('data-copy');
  navigator.clipboard.writeText(text).then(function () {
    showToast('Copied to clipboard');
  }).catch(function () {
    showToast('Failed to copy');
  });
});

/* ---------- Scroll-to-top ---------- */
(function initScrollTop() {
  var btn = document.getElementById('scrollTop');
  if (!btn) return;
  var ticking = false;
  function update() { btn.hidden = window.scrollY < 400; }
  addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(function () { update(); ticking = false; }); ticking = true; }
  }, { passive: true });
  btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
})();

/* ---------- Reveal on scroll ---------- */
(function initReveal() {
  var reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  reveals.forEach(function (el) { observer.observe(el); });
})();

/* ---------- Hamburger menu ---------- */
(function initMenu() {
  var toggle = document.getElementById('menuToggle');
  var nav = document.getElementById('siteNav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', function () {
    var isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });
  document.addEventListener('click', function (e) {
    if (!nav.classList.contains('open')) return;
    if (!nav.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();

/* ---------- Active nav highlight ---------- */
(function highlightNav() {
  var nav = document.getElementById('siteNav');
  if (!nav) return;
  var links = nav.querySelectorAll('a');
  var path = location.pathname.replace(/\/$/, '') || '/';
  links.forEach(function (a) {
    var href = new URL(a.href, location.origin);
    var linkPath = href.pathname.replace(/\/$/, '') || '/';
    if (linkPath === path) {
      a.setAttribute('aria-current', 'page');
    } else {
      a.removeAttribute('aria-current');
    }
  });
})();

/* ---------- Dynamic copyright year ---------- */
(function setYear() {
  var el = document.getElementById('copyrightYear');
  if (el) el.textContent = new Date().getFullYear();
})();

/* ---------- Prefetch Play hub on hover (once) ---------- */
(function prefetchPlayHub() {
  var path = '/ai-game-lab/play/';
  var done = false;
  function addPrefetch() {
    if (done) return;
    done = true;
    var link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = path;
    link.as = 'document';
    document.head.appendChild(link);
  }
  document.querySelectorAll('a[href="' + path + '"]').forEach(function (a) {
    a.addEventListener('mouseenter', addPrefetch, { once: true });
    a.addEventListener('focus', addPrefetch, { once: true });
  });
})();

/* ---------- Showcase filter ---------- */
(function initFilter() {
  var buttons = document.querySelectorAll('.filter-btn');
  if (!buttons.length) return;
  var cards = document.querySelectorAll('.game');
  var note = document.getElementById('resultsNote');

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      buttons.forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      var filter = btn.getAttribute('data-filter');
      var count = 0;
      cards.forEach(function (card) {
        var match = filter === 'all' || card.getAttribute('data-category') === filter;
        card.style.display = match ? '' : 'none';
        if (match) count++;
      });
      if (note) note.textContent = count + ' project' + (count !== 1 ? 's' : '');
    });
  });
})();

/* ---------- Game player ---------- */
(function initPlayer() {
  var playerScreen = document.getElementById('playerScreen');
  var playerName = document.getElementById('playerName');
  var playerEmpty = document.getElementById('playerEmpty');
  var playerLoader = document.getElementById('playerLoader');
  var liveDot = document.getElementById('liveDot');
  var btnRefresh = document.getElementById('btnRefresh');
  var btnClose = document.getElementById('btnClose');

  var GAME_URLS = {
    zombie:   '/ai-game-lab/games/zombie/index.html',
    minecraft:'/ai-game-lab/games/craftverse/index.html',
    mindcraft:'/ai-game-lab/games/mindcraft/index.html'
  };

  var GAME_NAMES = {
    zombie:   'DeadTakeover Protocol',
    minecraft:'CraftVerse Engine',
    mindcraft:'Mindcraft Control Deck'
  };

  var currentGame = null;
  var currentIframe = null;

  function clearIframe() {
    if (currentIframe) {
      currentIframe.remove();
      currentIframe = null;
    }
    if (playerLoader) playerLoader.classList.remove('visible');
  }

  function setStatus(loaded, game) {
    if (!liveDot) return;
    if (loaded && game) {
      liveDot.classList.add('active');
      if (playerName) playerName.textContent = GAME_NAMES[game] || game;
    } else {
      liveDot.classList.remove('active');
      if (playerName) playerName.textContent = 'No game loaded';
    }
  }

  function loadGame(game) {
    var url = GAME_URLS[game];
    if (!url) {
      showToast('Unknown game: ' + game);
      return;
    }
    // Show loader, hide empty
    clearIframe();
    if (playerEmpty) playerEmpty.style.display = 'none';
    if (playerLoader) playerLoader.classList.add('visible');
    setStatus(false, null);

    var iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.allow = 'autoplay; fullscreen';
    iframe.title = GAME_NAMES[game] || game;

    // Once iframe is done loading, hide loader
    iframe.addEventListener('load', function () {
      if (playerLoader) playerLoader.classList.remove('visible');
      if (playerEmpty) playerEmpty.style.display = 'none';
      setStatus(true, game);
      currentGame = game;
      showToast(GAME_NAMES[game] + ' loaded');
    });

    // If iframe fails to load within 15s, show empty
    setTimeout(function () {
      if (playerLoader && playerLoader.classList.contains('visible')) {
        playerLoader.classList.remove('visible');
        if (playerEmpty) playerEmpty.style.display = '';
        setStatus(false, null);
        showToast('Game timed out. Try refreshing.');
        currentGame = null;
      }
    }, 18000);

    currentIframe = iframe;
    playerScreen.appendChild(iframe);
  }

  function closeGame() {
    clearIframe();
    currentGame = null;
    setStatus(false, null);
    if (playerEmpty) playerEmpty.style.display = '';
    showToast('Game closed');
  }

  // Delegate clicks on play buttons
  document.addEventListener('click', function (e) {
    var playBtn = e.target.closest('[data-play]');
    if (!playBtn) return;
    var game = playBtn.getAttribute('data-play');
    if (!game) return;
    loadGame(game);
  });

  if (btnRefresh) {
    btnRefresh.addEventListener('click', function () {
      if (!currentGame) return;
      loadGame(currentGame);
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', closeGame);
  }
})();

/* ---------- Hero loop video (replaces canvas) ---------- */
(function initHeroVideo() {
  var v = document.getElementById('heroVideo');
  if (!v) return;

  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');

  function sync() {
    if (mq.matches) {
      v.pause();
      try {
        v.currentTime = 0;
      } catch (e) {}
    } else {
      var p = v.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () {});
      }
    }
  }

  sync();
  if (mq.addEventListener) {
    mq.addEventListener('change', sync);
  } else if (mq.addListener) {
    mq.addListener(sync);
  }
})();