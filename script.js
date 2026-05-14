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

/* ---------- Hero canvas visual ---------- */
(function initHeroCanvas() {
  var canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var dpr = Math.min(devicePixelRatio || 1, 2);
  var w, h, cx, cy;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    w = rect.width; h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w / 2; cy = h / 2;
  }

  var time = 0;
  var lastTs = 0;

  function glowArc(x, y, r, a1, a2, color, alpha, width) {
    var grad = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 1.3);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(x, y, r, a1, a2);
    ctx.strokeStyle = grad;
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawRing(centerX, centerY, radius, segments, color1, color2, rot) {
    var step = (Math.PI * 2) / segments;
    for (var i = 0; i < segments; i++) {
      var a = rot + i * step;
      var nx = Math.cos(a);
      var ny = Math.sin(a);
      var x1 = centerX + nx * radius;
      var y1 = centerY + ny * radius;
      var x2 = centerX + nx * (radius * 0.35);
      var y2 = centerY + ny * (radius * 0.35);

      var prog = i / segments;
      var alpha = 0.2 + 0.35 * Math.abs(Math.sin(prog * Math.PI * 3 + time * 1.5));
      var r = radius * (0.2 + 0.15 * Math.sin(prog * 6 + time * 2));

      // Glow dot
      var g = ctx.createRadialGradient(x1, y1, 0, x1, y1, r * 2.5);
      g.addColorStop(0, color1);
      g.addColorStop(0.4, color2);
      g.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(x1, y1, r * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.globalAlpha = alpha;
      ctx.fill();

      // Connector line
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = color2;
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = alpha * 0.5;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawOrbitingParticle(centerX, centerY, orbitR, angle, size, color) {
    var x = centerX + Math.cos(angle) * orbitR;
    var y = centerY + Math.sin(angle) * orbitR;
    var g = ctx.createRadialGradient(x, y, 0, x, y, size * 5);
    g.addColorStop(0, color);
    g.addColorStop(0.3, color);
    g.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(x, y, size * 5, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Trail
    var trailAlpha = 0.08;
    for (var i = 1; i <= 5; i++) {
      var ta = angle - i * 0.15;
      var tx = centerX + Math.cos(ta) * orbitR;
      var ty = centerY + Math.sin(ta) * orbitR;
      ctx.beginPath();
      ctx.arc(tx, ty, size * (1 - i * 0.15), 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = trailAlpha * (1 - i / 6);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawCenterGlow(x, y, r) {
    var pulse = 1 + 0.15 * Math.sin(time * 1.3);
    var g = ctx.createRadialGradient(x, y, 0, x, y, r * pulse);
    g.addColorStop(0, 'rgba(155, 48, 255, 0.5)');
    g.addColorStop(0.35, 'rgba(155, 48, 255, 0.15)');
    g.addColorStop(0.7, 'rgba(0, 240, 255, 0.04)');
    g.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(x, y, r * pulse, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  function drawInnerCore(x, y, r) {
    // Diamond shape
    var pulse = 1 + 0.08 * Math.sin(time * 2.5);
    var g = ctx.createRadialGradient(x, y, 0, x, y, r * pulse);
    g.addColorStop(0, 'rgba(180, 80, 255, 0.9)');
    g.addColorStop(0.5, 'rgba(155, 48, 255, 0.4)');
    g.addColorStop(1, 'rgba(155, 48, 255, 0)');

    ctx.beginPath();
    ctx.arc(x, y, r * pulse, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    // Bright center dot
    ctx.beginPath();
    ctx.arc(x, y, r * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
  }

  function drawRays(x, y, outerR, count) {
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2 + time * 0.3;
      var len = outerR * (0.6 + 0.3 * Math.sin(time * 3 + i));
      var startR = outerR * 0.08;
      var x1 = x + Math.cos(a) * startR;
      var y1 = y + Math.sin(a) * startR;
      var x2 = x + Math.cos(a) * len;
      var y2 = y + Math.sin(a) * len;

      var g = ctx.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(0, 'rgba(155, 48, 255, 0.25)');
      g.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = g;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.35;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function draw(ts) {
    resize();
    if (!lastTs) lastTs = ts;
    var dt = (ts - lastTs) / 1000;
    lastTs = ts;
    time += dt;

    ctx.clearRect(0, 0, w, h);

    var size = Math.min(w, h);
    var radius = size * 0.35;

    // Center glow
    drawCenterGlow(cx, cy, radius * 1.2);

    // Rays
    drawRays(cx, cy, radius * 1.4, 24);

    // Outer ring
    drawRing(cx, cy, radius, 28, 'rgba(155, 48, 255, 0.8)', 'rgba(155, 48, 255, 0.25)', time * 0.4);

    // Inner ring
    drawRing(cx, cy, radius * 0.55, 18, 'rgba(0, 240, 255, 0.7)', 'rgba(0, 240, 255, 0.2)', -time * 0.55);

    // Middle sparse ring
    drawRing(cx, cy, radius * 0.78, 8, 'rgba(180, 80, 255, 0.6)', 'rgba(155, 48, 255, 0.15)', time * 0.32);

    // Orbiting particles
    drawOrbitingParticle(cx, cy, radius * 0.85, time * 1.4, 3, 'rgba(155, 48, 255, 0.9)');
    drawOrbitingParticle(cx, cy, radius * 0.82, time * 1.4 + Math.PI, 3, 'rgba(155, 48, 255, 0.9)');
    drawOrbitingParticle(cx, cy, radius * 0.95, -time * 0.9 + Math.PI * 0.7, 2.5, 'rgba(0, 240, 255, 0.85)');
    drawOrbitingParticle(cx, cy, radius * 0.93, -time * 0.9 + Math.PI * 1.7, 2.5, 'rgba(0, 240, 255, 0.85)');
    drawOrbitingParticle(cx, cy, radius * 0.6, time * 1.7, 2, 'rgba(255, 255, 255, 0.6)');

    // Inner core
    drawInnerCore(cx, cy, radius * 0.12);

    // Glow arcs
    glowArc(cx, cy, radius, time * 0.8, time * 0.8 + Math.PI * 0.7, 'rgba(155, 48, 255, 0.4)', 0.6, 2);
    glowArc(cx, cy, radius, -time * 0.6, -time * 0.6 + Math.PI * 0.5, 'rgba(0, 240, 255, 0.35)', 0.5, 1.5);

    requestAnimationFrame(draw);
  }

  resize();
  requestAnimationFrame(draw);

  // Re-observe hero container for resize
  var heroRight = canvas.parentElement;
  if (!heroRight) return;
  var ro = new ResizeObserver(function () { resize(); });
  ro.observe(heroRight);
})();