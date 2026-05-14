/* ============================================================
   AI Game Lab — Shared JavaScript
   Each feature initializes only if its DOM is present.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Cursor spotlight tracking ---------- */
  document.addEventListener('mousemove', (e) => {
    const cx = (e.clientX / window.innerWidth) * 100;
    const cy = (e.clientY / window.innerHeight) * 100;
    document.body.style.setProperty('--cx', cx + '%');
    document.body.style.setProperty('--cy', cy + '%');
  }, { passive: true });

  /* ---------- Particle background ---------- */
  (function initParticles() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0.7;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let w, h, particles = [];
    function resize() { w = canvas.width = innerWidth; h = canvas.height = innerHeight; }
    function create() {
      particles = [];
      for (let i = 0; i < 40; i++) {
        particles.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3 - 0.1,
          r: Math.random() * 1.5 + 0.5,
          o: Math.random() * 0.15 + 0.15
        });
      }
    }
    let last = 0;
    function draw(ts) {
      const dt = Math.min((ts - last) / 16, 2);
      last = ts;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; if (p.y > h + 10) p.y = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124, 92, 255, ${p.o})`;
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    addEventListener('resize', () => { resize(); create(); });
    resize(); create(); requestAnimationFrame(draw);
  })();
  const html = document.documentElement;
  const THEME_KEY = 'aigamelab-theme';

  try {
    html.setAttribute('data-theme', localStorage.getItem(THEME_KEY) || 'dark');
  } catch { html.setAttribute('data-theme', 'dark'); }

  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore quota */ }
    });
  }

  /* ---------- Toast ---------- */
  const toastEl = document.getElementById('toast');
  let toastTimer;
  window.showToast = function (msg) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  };

  /* ---------- Copy to clipboard ---------- */
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sel = btn.getAttribute('data-copy');
      const el = sel ? document.querySelector(sel) : null;
      if (!el) return;
      const text = el.textContent.trim();
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard');
        const original = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(() => { btn.textContent = original; }, 1600);
      }).catch(() => showToast('Failed to copy'));
    });
  });

  /* ---------- Scroll-to-top ---------- */
  const scrollTopBtn = document.getElementById('scrollTop');
  if (scrollTopBtn) {
    const updateScrollTop = () => { scrollTopBtn.hidden = window.scrollY < 500; };
    window.addEventListener('scroll', updateScrollTop, { passive: true });
    scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    updateScrollTop();
  }

  /* ---------- Reveal animations ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });
    revealEls.forEach(el => io.observe(el));
  }

  /* ---------- Hamburger ---------- */
  const menuToggle = document.getElementById('menuToggle');
  const siteNav = document.getElementById('siteNav');
  if (menuToggle && siteNav) {
    const closeMenu = () => {
      siteNav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    };
    menuToggle.addEventListener('click', e => {
      e.stopPropagation();
      const open = siteNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', e => {
      if (!siteNav.classList.contains('open')) return;
      if (!menuToggle.contains(e.target) && !siteNav.contains(e.target)) closeMenu();
    });
    siteNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    window.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---------- Active nav link ---------- */
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    try {
      const linkPath = new URL(href, window.location.href).pathname.replace(/\/$/, '') || '/';
      if (currentPath === linkPath) link.setAttribute('aria-current', 'page');
    } catch { /* ignore bad URL */ }
  });

  /* ---------- Cursor-tracking spotlight on tiles ---------- */
  document.querySelectorAll('.tile').forEach(tile => {
    tile.addEventListener('pointermove', e => {
      const rect = tile.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      tile.style.setProperty('--mx', x + '%');
      tile.style.setProperty('--my', y + '%');
    });
  });

  /* ---------- Showcase filter ---------- */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const gameCards = document.querySelectorAll('.showcase-stack .game');
  const resultsNote = document.getElementById('resultsNote');

  if (filterBtns.length && gameCards.length) {
    const labels = {
      all: '3 projects',
      playable: '2 playable',
      tools: '1 tool',
    };
    const applyFilter = (filter) => {
      filterBtns.forEach(b => {
        const match = b.getAttribute('data-filter') === filter;
        b.classList.toggle('active', match);
        b.setAttribute('aria-selected', match);
      });
      let count = 0;
      gameCards.forEach(card => {
        const show = filter === 'all' || card.getAttribute('data-category') === filter;
        card.classList.toggle('is-hidden', !show);
        if (show) count++;
      });
      if (resultsNote) {
        resultsNote.textContent = labels[filter] || `${count} project${count !== 1 ? 's' : ''}`;
      }
    };
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const f = btn.getAttribute('data-filter');
        if (f) applyFilter(f);
      });
    });
  }

  /* ---------- Game player ---------- */
  const playerFrame = document.getElementById('playerFrame');
  const playerLoader = document.getElementById('playerLoader');
  const playerPlaceholder = document.getElementById('playerPlaceholder');
  const playerTitle = document.getElementById('playerTitle');
  const playerStatus = document.getElementById('playerStatus');
  const playerHint = document.getElementById('playerHint');
  const stopBtn = document.getElementById('stopBtn');
  const fullBtn = document.getElementById('fullBtn');
  const focusBtn = document.getElementById('focusBtn');
  const openHereBtn = document.getElementById('openHereBtn');
  const openTabLink = document.getElementById('openTab');

  if (playerFrame && playerLoader && playerPlaceholder && playerTitle) {
    const basePath = window.location.pathname.includes('/play/') ? '../' : './';
    const gameUrls = {
      voxel: { url: basePath + 'games/voxel/index.html', label: 'CraftVerse Engine' },
      zombie: { url: basePath + 'games/zombie/index.html', label: 'DeadTakeover Protocol' },
      mindcraft: { url: 'http://127.0.0.1:43110', label: 'Mindcraft Control Deck' },
    };

    let activeGame = null;
    let activeUrl = null;

    const updateSegSelection = () => {
      document.querySelectorAll('.player-controls [data-play]').forEach(b => {
        const match = b.getAttribute('data-play') === activeGame;
        b.setAttribute('aria-selected', match);
        b.classList.toggle('active', match);
      });
    };

    const setPlayerState = (gameKey) => {
      activeGame = gameKey;
      const info = gameUrls[gameKey];
      activeUrl = info ? info.url : null;

      if (gameKey && info) {
        playerTitle.textContent = info.label;
        if (playerStatus) playerStatus.classList.add('active');
        playerFrame.style.display = 'block';
        playerPlaceholder.style.display = 'none';
        playerFrame.src = info.url;
        playerLoader.classList.add('visible');
        if (playerHint) playerHint.hidden = false;
        if (stopBtn) stopBtn.disabled = false;
        if (fullBtn) fullBtn.disabled = false;
        if (focusBtn) focusBtn.disabled = false;
        if (openHereBtn) openHereBtn.disabled = false;
        if (openTabLink) {
          openTabLink.href = info.url;
          openTabLink.setAttribute('aria-disabled', 'false');
          openTabLink.style.pointerEvents = 'auto';
          openTabLink.style.opacity = '1';
        }
        updateSegSelection();
      } else {
        stopPlayer();
      }
    };

    const stopPlayer = () => {
      activeGame = null;
      activeUrl = null;
      playerFrame.src = '';
      playerFrame.style.display = 'none';
      playerPlaceholder.style.display = 'flex';
      playerTitle.textContent = 'Choose a game to start';
      if (playerStatus) playerStatus.classList.remove('active');
      playerLoader.classList.remove('visible');
      if (playerHint) playerHint.hidden = true;
      if (stopBtn) stopBtn.disabled = true;
      if (fullBtn) fullBtn.disabled = true;
      if (focusBtn) focusBtn.disabled = true;
      if (openHereBtn) openHereBtn.disabled = true;
      if (openTabLink) {
        openTabLink.href = '#';
        openTabLink.setAttribute('aria-disabled', 'true');
        openTabLink.style.pointerEvents = 'none';
        openTabLink.style.opacity = '0.3';
      }
      updateSegSelection();
    };

    playerFrame.addEventListener('load', () => playerLoader.classList.remove('visible'));
    playerFrame.addEventListener('error', () => {
      playerLoader.classList.remove('visible');
      showToast('Could not load game. Is the server running?');
    });

    // Play buttons (segmented controls + showcase cards)
    document.querySelectorAll('[data-play]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const gameKey = btn.getAttribute('data-play');
        if (!gameKey || !gameUrls[gameKey]) return;
        // If we're on play page already, just set; otherwise navigate-and-set is handled by anchor href
        if (window.location.pathname.includes('/play/')) {
          e.preventDefault?.();
          setPlayerState(gameKey);
          document.getElementById('player')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    if (stopBtn) stopBtn.addEventListener('click', stopPlayer);
    if (fullBtn) fullBtn.addEventListener('click', () => {
      if (playerFrame.style.display !== 'none' && playerFrame.src) {
        playerFrame.requestFullscreen?.().catch(() => showToast('Fullscreen not available'));
      }
    });
    if (focusBtn) focusBtn.addEventListener('click', () => {
      if (playerFrame.style.display !== 'none') {
        playerFrame.focus();
        playerFrame.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    if (openHereBtn) openHereBtn.addEventListener('click', () => {
      if (activeUrl) window.location.href = activeUrl;
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && activeGame && document.activeElement === document.body) {
        stopPlayer();
      }
    });

    stopPlayer();
  }

  /* ---------- Dynamic copyright year ---------- */
  const yearEl = document.getElementById('copyrightYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Ready log ---------- */
  console.log(
    '%c\u25B6 %cAI Game Lab %cready',
    'color:#7c5cff;font-weight:600;',
    'color:#f3f4f8;font-weight:500;',
    'color:#6c7280;'
  );
})();
