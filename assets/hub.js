/* ═══════════════════════════════════════════════════════════════
   AI Game Lab — Shared JavaScript
   Handles theme, nav, toast, copy, scroll, filters, player.
   Safe to load on any page — each feature activates only if its
   DOM elements exist.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Theme ──────────────────────────────────────────────────────
  const themeBtn = document.getElementById('themeBtn');
  const html = document.documentElement;
  const THEME_KEY = 'aigamelab-theme';

  function getStoredTheme() {
    try { return localStorage.getItem(THEME_KEY) || 'dark'; }
    catch { return 'dark'; }
  }

  html.setAttribute('data-theme', getStoredTheme());

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch { /* quota */ }
    });
  }

  // ── Toast ──────────────────────────────────────────────────────
  const toastEl = document.getElementById('toast');
  let toastTimer;

  window.showToast = function (msg) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  };

  // ── Copy-to-clipboard ──────────────────────────────────────────
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const selector = btn.getAttribute('data-copy');
      const el = document.querySelector(selector);
      if (!el) return;
      const text = el.textContent.trim();
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
      }).catch(() => showToast('Failed to copy'));
    });
  });

  // ── Scroll-to-top ──────────────────────────────────────────────
  const scrollTopBtn = document.getElementById('scrollTop');
  if (scrollTopBtn) {
    function updateScrollTop() {
      scrollTopBtn.hidden = window.scrollY < 500;
    }
    window.addEventListener('scroll', updateScrollTop, { passive: true });
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    updateScrollTop();
  }

  // ── Reveal animations (IntersectionObserver) ───────────────────
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { root: null, rootMargin: '0px 0px -60px 0px', threshold: 0.1 });
    revealEls.forEach(el => revealObserver.observe(el));
  }

  // ── Hamburger menu ─────────────────────────────────────────────
  const menuToggle = document.getElementById('menuToggle');
  const siteNav = document.getElementById('siteNav');
  if (menuToggle && siteNav) {
    menuToggle.addEventListener('click', () => {
      const open = siteNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', (e) => {
      if (!siteNav.classList.contains('open')) return;
      if (!menuToggle.contains(e.target) && !siteNav.contains(e.target)) {
        siteNav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
    siteNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        siteNav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ── Active nav link ────────────────────────────────────────────
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  const navLinks = document.querySelectorAll('.nav a');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    // Resolve relative href against current location
    const linkUrl = new URL(href, window.location.href);
    const linkPath = linkUrl.pathname.replace(/\/$/, '') || '/';
    if (currentPath === linkPath) {
      link.setAttribute('aria-current', 'page');
    }
  });

  // ── Showcase filter (only on pages with filter buttons) ───────
  const filterBtns = document.querySelectorAll('.filter-btn');
  const gameCards = document.querySelectorAll('.grid .game');
  const resultsNote = document.getElementById('resultsNote');

  if (filterBtns.length && gameCards.length) {
    const filterLabels = {
      all: 'Showing all projects',
      playable: 'Showing playable games',
      tools: 'Showing tools',
    };

    function applyFilter(filter) {
      filterBtns.forEach(b => {
        const match = b.getAttribute('data-filter') === filter;
        b.classList.toggle('active', match);
        b.setAttribute('aria-selected', match);
      });
      let count = 0;
      gameCards.forEach(card => {
        const cat = card.getAttribute('data-category');
        const show = filter === 'all' || cat === filter;
        card.classList.toggle('is-hidden', !show);
        if (show) count += 1;
      });
      if (resultsNote) {
        resultsNote.textContent = filterLabels[filter] ||
          `Showing ${count} project${count !== 1 ? 's' : ''}`;
      }
    }

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const f = btn.getAttribute('data-filter');
        if (f) applyFilter(f);
      });
    });
  }

  // ── Game player (only on pages with player elements) ──────────
  const playerFrame = document.getElementById('playerFrame');
  const playerLoader = document.getElementById('playerLoader');
  const playerPlaceholder = document.getElementById('playerPlaceholder');
  const playerTitle = document.getElementById('playerTitle');
  const playerHint = document.getElementById('playerHint');
  const stopBtn = document.getElementById('stopBtn');
  const fullBtn = document.getElementById('fullBtn');
  const focusBtn = document.getElementById('focusBtn');
  const openHereBtn = document.getElementById('openHere');
  const openTabLink = document.getElementById('openTab');

  // Only initialize player if all core elements exist
  if (playerFrame && playerLoader && playerPlaceholder && playerTitle) {

    // Resolve relative paths from play/ page
    const basePath = window.location.pathname.includes('/play/') ? '../' : './';

    const gameUrls = {
      voxel: { url: basePath + 'games/voxel/index.html', label: 'CraftVerse Engine' },
      zombie: { url: basePath + 'games/zombie/index.html', label: 'DeadTakeover Protocol' },
      mindcraft: { url: 'http://127.0.0.1:43110', label: 'Mindcraft Control Deck' },
    };

    let activeGame = null;
    let activeUrl = null;

    function setPlayerState(gameKey) {
      activeGame = gameKey;
      const info = gameUrls[gameKey];
      activeUrl = info ? info.url : null;

      if (gameKey && info) {
        playerTitle.textContent = info.label;
        playerTitle.classList.add('active');
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

        // Highlight active game button
        document.querySelectorAll('.player-actions [data-play]').forEach(b => {
          b.style.background = b.getAttribute('data-play') === gameKey ? 'rgba(255,255,255,0.12)' : '';
          b.style.borderColor = b.getAttribute('data-play') === gameKey ? 'rgba(255,255,255,0.3)' : '';
        });
      } else {
        stopPlayer();
      }
    }

    function stopPlayer() {
      activeGame = null;
      activeUrl = null;
      playerFrame.src = '';
      playerFrame.style.display = 'none';
      playerPlaceholder.style.display = 'flex';
      playerTitle.textContent = 'Choose a game to start';
      playerTitle.classList.remove('active');
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
        openTabLink.style.opacity = '0.35';
      }
      document.querySelectorAll('.player-actions [data-play]').forEach(b => {
        b.style.background = '';
        b.style.borderColor = '';
      });
    }

    playerFrame.addEventListener('load', () => playerLoader.classList.remove('visible'));
    playerFrame.addEventListener('error', () => {
      playerLoader.classList.remove('visible');
      showToast('Could not load game. Is the server running?');
    });

    // Play buttons — both in cards and player bar
    document.querySelectorAll('[data-play]').forEach(btn => {
      btn.addEventListener('click', () => {
        const gameKey = btn.getAttribute('data-play');
        if (!gameKey || !gameUrls[gameKey]) return;
        const scrollTarget = btn.getAttribute('data-scroll');
        if (scrollTarget) {
          const target = document.querySelector(scrollTarget);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setTimeout(() => setPlayerState(gameKey), 200);
      });
    });

    if (stopBtn) stopBtn.addEventListener('click', stopPlayer);

    if (fullBtn) {
      fullBtn.addEventListener('click', () => {
        if (playerFrame.style.display !== 'none' && playerFrame.src) {
          playerFrame.requestFullscreen?.().catch(() => showToast('Fullscreen not available'));
        }
      });
    }

    if (focusBtn) {
      focusBtn.addEventListener('click', () => {
        if (playerFrame.style.display !== 'none') {
          playerFrame.focus();
          playerFrame.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    if (openHereBtn) {
      openHereBtn.addEventListener('click', () => {
        if (activeUrl) window.location.href = activeUrl;
      });
    }

    // ESC to stop
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && activeGame && document.activeElement === document.body) {
        stopPlayer();
      }
    });

    stopPlayer();
  }

  // ── Dynamic copyright year ────────────────────────────────────
  const yearSpan = document.getElementById('copyrightYear');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // ── Ready log ──────────────────────────────────────────────────
  const pageName = document.title || 'AI Game Lab';
  console.log(
    '%c\u25B6 %c' + pageName + ' %cready',
    'color:#00e5ff;font-weight:bold;',
    'color:#edf0f7;',
    'color:#6b7394;'
  );
})();