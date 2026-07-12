/**
 * Battle visual effects — particles, projectiles, flashes, damage numbers
 */

const TYPE_COLORS = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  grass: '#78c850',
  electric: '#f8d030',
  ice: '#98d8d8',
  fighting: '#c03028',
  poison: '#a040a0',
  ground: '#e0c068',
  flying: '#a890f0',
  psychic: '#f85888',
  bug: '#a8b820',
  rock: '#b8a038',
  ghost: '#705898',
  dragon: '#7038f8',
};

const VFX = {
  layer: null,
  particles: [],
  raf: null,
  last: 0,
};

function vfxInit() {
  VFX.layer = document.getElementById('vfx-layer');
  if (!VFX.layer) return;
  if (!VFX.raf) {
    VFX.last = performance.now();
    VFX.raf = requestAnimationFrame(vfxTick);
  }
}

function vfxClear() {
  VFX.particles = [];
  if (VFX.layer) VFX.layer.innerHTML = '';
  const arena = document.getElementById('battle-arena');
  if (arena) {
    arena.classList.remove('shake', 'shake-hard', 'flash-white', 'flash-red', 'flash-super');
  }
}

function vfxTick(now) {
  const dt = Math.min((now - VFX.last) / 1000, 0.05);
  VFX.last = now;

  // Update DOM particles
  for (let i = VFX.particles.length - 1; i >= 0; i--) {
    const p = VFX.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      p.el.remove();
      VFX.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.gravity || 0) * dt;
    p.vx *= p.drag ?? 0.98;
    p.vy *= p.drag ?? 0.98;
    const t = p.life / p.maxLife;
    p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rot || 0}deg) scale(${p.scale * (0.4 + t * 0.6)})`;
    p.el.style.opacity = String(Math.max(0, t));
    if (p.spin) p.rot = (p.rot || 0) + p.spin * dt;
  }

  VFX.raf = requestAnimationFrame(vfxTick);
}

function vfxRect(el) {
  const layer = VFX.layer;
  if (!layer || !el) return { x: 0, y: 0, w: 0, h: 0, cx: 0, cy: 0 };
  const lr = layer.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return {
    x: r.left - lr.left,
    y: r.top - lr.top,
    w: r.width,
    h: r.height,
    cx: r.left - lr.left + r.width / 2,
    cy: r.top - lr.top + r.height / 2,
  };
}

function spawnParticle(opts) {
  if (!VFX.layer) return;
  const el = document.createElement('div');
  el.className = 'vfx-particle ' + (opts.className || '');
  el.textContent = opts.char || '';
  if (opts.bg) el.style.background = opts.bg;
  if (opts.color) el.style.color = opts.color;
  if (opts.size) {
    el.style.width = opts.size + 'px';
    el.style.height = opts.size + 'px';
    el.style.fontSize = opts.size + 'px';
  }
  el.style.left = '0';
  el.style.top = '0';
  VFX.layer.appendChild(el);

  const p = {
    el,
    x: opts.x,
    y: opts.y,
    vx: opts.vx || 0,
    vy: opts.vy || 0,
    life: opts.life || 0.6,
    maxLife: opts.life || 0.6,
    gravity: opts.gravity || 0,
    drag: opts.drag,
    scale: opts.scale || 1,
    rot: opts.rot || 0,
    spin: opts.spin || 0,
  };
  el.style.transform = `translate(${p.x}px, ${p.y}px) scale(${p.scale})`;
  VFX.particles.push(p);
  return p;
}

function getSpriteEls(side) {
  // side = attacker side: 'player' or 'enemy'
  const atk = document.getElementById(side === 'player' ? 'player-sprite' : 'enemy-sprite');
  const def = document.getElementById(side === 'player' ? 'enemy-sprite' : 'player-sprite');
  return { atk, def };
}

/** Lunge attacker toward target */
function vfxAttackLunge(side) {
  const { atk } = getSpriteEls(side);
  if (!atk) return;
  atk.classList.remove('attack', 'attack-enemy');
  void atk.offsetWidth;
  atk.classList.add(side === 'player' ? 'attack' : 'attack-enemy');
  setTimeout(() => atk.classList.remove('attack', 'attack-enemy'), 350);
}

/** Type-colored projectile + impact burst */
function vfxMoveProjectile(side, moveType, power = 40) {
  vfxInit();
  const { atk, def } = getSpriteEls(side);
  if (!atk || !def || !VFX.layer) return Promise.resolve();

  const a = vfxRect(atk);
  const d = vfxRect(def);
  const color = TYPE_COLORS[moveType] || '#fff';

  // Beam / orb flying
  const orb = document.createElement('div');
  orb.className = 'vfx-orb';
  orb.style.background = `radial-gradient(circle, #fff 0%, ${color} 45%, transparent 70%)`;
  orb.style.boxShadow = `0 0 18px ${color}, 0 0 36px ${color}`;
  VFX.layer.appendChild(orb);

  const size = Math.min(48, 18 + power / 4);
  orb.style.width = size + 'px';
  orb.style.height = size + 'px';

  const start = { x: a.cx - size / 2, y: a.cy - size / 2 };
  const end = { x: d.cx - size / 2, y: d.cy - size / 2 };
  const duration = Math.max(0.22, 0.45 - power / 400);

  // Dense trail particles along path
  const trailN = 10 + Math.floor(power / 15);
  for (let i = 0; i < trailN; i++) {
    const t = i / trailN;
    setTimeout(() => {
      const px = start.x + (end.x - start.x) * t + size / 2;
      const py = start.y + (end.y - start.y) * t + size / 2;
      const arc = Math.sin(t * Math.PI) * (side === 'player' ? -30 : 30);
      spawnTypeSpark(moveType, px, py + arc, 0.4);
      // secondary smoke trail
      if (i % 2 === 0) {
        spawnParticle({
          className: 'vfx-spark',
          char: '●',
          color: color,
          x: px + (Math.random() - 0.5) * 8,
          y: py + arc + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          life: 0.25,
          size: 6 + Math.random() * 6,
          scale: 0.5,
          drag: 0.9,
        });
      }
    }, t * duration * 1000);
  }

  return new Promise((resolve) => {
    const t0 = performance.now();
    let lastSpark = 0;
    function frame(now) {
      const t = Math.min(1, (now - t0) / (duration * 1000));
      const ease = 1 - Math.pow(1 - t, 2);
      const x = start.x + (end.x - start.x) * ease;
      const y = start.y + (end.y - start.y) * ease;
      const arc = Math.sin(t * Math.PI) * (side === 'player' ? -30 : 30);
      const pulse = 1 + Math.sin(t * Math.PI) * 0.35 + Math.sin(now / 40) * 0.08;
      orb.style.transform = `translate(${x}px, ${y + arc}px) scale(${pulse})`;
      // continuous drip trail
      if (now - lastSpark > 28) {
        lastSpark = now;
        spawnTypeSpark(moveType, x + size / 2, y + arc + size / 2, 0.28);
      }
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        orb.remove();
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

function spawnTypeSpark(type, x, y, life = 0.5) {
  const color = TYPE_COLORS[type] || '#fff';
  const chars = {
    fire: ['✦', '●', '◆'],
    water: ['●', '◦', '💧'],
    grass: ['☘', '✦', '◆'],
    electric: ['⚡', '✦', '×'],
    psychic: ['✦', '◇', '◎'],
    poison: ['●', '☠', '◆'],
    ground: ['▪', '◆', '●'],
    rock: ['▪', '◆', '■'],
    flying: ['～', '✦', '◇'],
    ice: ['❄', '✦', '◇'],
    bug: ['✦', '●', '◆'],
    ghost: ['✧', '◎', '·'],
    dragon: ['◆', '✦', '◇'],
    fighting: ['×', '✦', '■'],
    normal: ['●', '✦', '○'],
  };
  const set = chars[type] || chars.normal;
  const char = set[Math.floor(Math.random() * set.length)];
  const angle = Math.random() * Math.PI * 2;
  const speed = 40 + Math.random() * 80;
  spawnParticle({
    className: 'vfx-spark',
    char,
    color,
    x: x + (Math.random() - 0.5) * 10,
    y: y + (Math.random() - 0.5) * 10,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 20,
    life,
    gravity: 60,
    size: 12 + Math.random() * 10,
    spin: (Math.random() - 0.5) * 360,
    scale: 0.8 + Math.random() * 0.6,
  });
}

function vfxImpactBurst(side, moveType, power = 40, effectiveness = 1) {
  vfxInit();
  const { def } = getSpriteEls(side);
  if (!def) return;
  const d = vfxRect(def);
  const n = 14 + Math.floor(power / 10) + (effectiveness > 1 ? 12 : 0);
  for (let i = 0; i < n; i++) {
    spawnTypeSpark(moveType, d.cx, d.cy, 0.45 + Math.random() * 0.45);
  }
  // Radial debris
  for (let i = 0; i < 8; i++) {
    const ang = (Math.PI * 2 * i) / 8;
    const spd = 80 + Math.random() * 60;
    spawnParticle({
      className: 'vfx-spark',
      char: '◆',
      color: TYPE_COLORS[moveType] || '#fff',
      x: d.cx,
      y: d.cy,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 0.4,
      gravity: 30,
      size: 10,
      spin: 200,
    });
  }

  // Flash ring
  if (VFX.layer) {
    const ring = document.createElement('div');
    ring.className = 'vfx-ring';
    const color = TYPE_COLORS[moveType] || '#fff';
    ring.style.borderColor = color;
    ring.style.boxShadow = `0 0 20px ${color}`;
    ring.style.left = d.cx + 'px';
    ring.style.top = d.cy + 'px';
    VFX.layer.appendChild(ring);
    setTimeout(() => ring.remove(), 500);
  }
}

function vfxHitFlash(side, effectiveness = 1, critical = false) {
  const { def } = getSpriteEls(side);
  if (!def) return;
  def.classList.remove('hit', 'hit-super', 'hit-crit');
  void def.offsetWidth;
  if (critical) def.classList.add('hit-crit');
  else if (effectiveness > 1) def.classList.add('hit-super');
  else def.classList.add('hit');

  const arena = document.getElementById('battle-arena');
  if (arena) {
    arena.classList.remove('shake', 'shake-hard', 'flash-white', 'flash-red', 'flash-super');
    void arena.offsetWidth;
    if (critical || effectiveness > 1) {
      arena.classList.add('shake-hard');
      arena.classList.add(effectiveness > 1 ? 'flash-super' : 'flash-white');
    } else {
      arena.classList.add('shake');
      arena.classList.add('flash-white');
    }
    setTimeout(() => {
      arena.classList.remove('shake', 'shake-hard', 'flash-white', 'flash-red', 'flash-super');
    }, 400);
  }

  setTimeout(() => def.classList.remove('hit', 'hit-super', 'hit-crit'), 450);
}

function vfxDamageNumber(side, amount, opts = {}) {
  vfxInit();
  const { def } = getSpriteEls(side);
  if (!def || !VFX.layer) return;
  const d = vfxRect(def);
  const el = document.createElement('div');
  el.className = 'vfx-dmg' + (opts.critical ? ' crit' : '') + (opts.superEff ? ' super' : '') + (opts.weak ? ' weak' : '');
  el.textContent = opts.missed ? 'Miss!' : opts.immune ? 'Immune!' : `-${amount}`;
  el.style.left = d.cx + (Math.random() - 0.5) * 20 + 'px';
  el.style.top = d.y + 'px';
  VFX.layer.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function vfxBanner(text, kind = '') {
  vfxInit();
  if (!VFX.layer) return;
  const el = document.createElement('div');
  el.className = 'vfx-banner ' + kind;
  el.textContent = text;
  VFX.layer.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function vfxStatusSparkle(side, kind) {
  vfxInit();
  const el = document.getElementById(side === 'player' ? 'player-sprite' : 'enemy-sprite');
  if (!el) return;
  const r = vfxRect(el);
  const color = kind === 'heal' ? '#7CFC00' : kind === 'paralyze' ? '#f8d030' : '#a040a0';
  for (let i = 0; i < 12; i++) {
    spawnParticle({
      className: 'vfx-spark',
      char: kind === 'heal' ? '♥' : '✦',
      color,
      x: r.cx + (Math.random() - 0.5) * r.w,
      y: r.cy + (Math.random() - 0.5) * r.h,
      vx: (Math.random() - 0.5) * 40,
      vy: -40 - Math.random() * 60,
      life: 0.7,
      gravity: -20,
      size: 14,
    });
  }
}

function vfxFaint(side) {
  const el = document.getElementById(side === 'player' ? 'player-sprite' : 'enemy-sprite');
  if (!el) return;
  el.classList.remove('faint');
  void el.offsetWidth;
  el.classList.add('faint');
  // Rising spirit sparkles
  vfxInit();
  const r = vfxRect(el);
  for (let i = 0; i < 14; i++) {
    spawnParticle({
      className: 'vfx-spark',
      char: '✦',
      color: i % 2 ? '#fff' : '#9bb4c8',
      x: r.cx + (Math.random() - 0.5) * r.w,
      y: r.cy + (Math.random() - 0.5) * r.h * 0.5,
      vx: (Math.random() - 0.5) * 30,
      vy: -40 - Math.random() * 50,
      life: 0.7 + Math.random() * 0.3,
      gravity: -15,
      size: 10 + Math.random() * 8,
    });
  }
}

function vfxEntrance(side) {
  const el = document.getElementById(side === 'player' ? 'player-sprite' : 'enemy-sprite');
  if (!el) return;
  el.classList.remove('enter-player', 'enter-enemy');
  void el.offsetWidth;
  el.classList.add(side === 'player' ? 'enter-player' : 'enter-enemy');
  // Entrance dust trail
  vfxInit();
  const r = vfxRect(el);
  const dir = side === 'player' ? 1 : -1;
  for (let i = 0; i < 10; i++) {
    spawnParticle({
      className: 'vfx-spark',
      char: '●',
      color: '#c4a35a',
      x: r.cx - dir * (20 + i * 6),
      y: r.y + r.h - 10 + (Math.random() - 0.5) * 12,
      vx: -dir * (20 + Math.random() * 30),
      vy: -5 - Math.random() * 20,
      life: 0.4,
      gravity: 40,
      size: 8,
      scale: 0.5,
    });
  }
}

/** Full attack sequence for a damaging move */
async function vfxPlayAttack(side, move, result) {
  vfxInit();
  const type = move.type || 'normal';
  const power = move.power || 0;

  vfxAttackLunge(side);
  // Kick-up dust at attacker feet on lunge
  vfxAttackerDust(side);

  if (power > 0) {
    await vfxMoveProjectile(side, type, power);
  } else {
    // Status: glow on target
    await sleepVfx(200);
    vfxStatusSparkle(side === 'player' ? 'enemy' : 'player', move.effect === 'heal_full' ? 'heal' : 'status');
    await sleepVfx(300);
    return;
  }

  if (result?.missed) {
    vfxDamageNumber(side, 0, { missed: true });
    vfxMissPuff(side);
    return;
  }
  if (result?.effectiveness === 0) {
    vfxDamageNumber(side, 0, { immune: true });
    vfxBanner("It doesn't affect...", 'weak');
    return;
  }

  vfxImpactBurst(side, type, power, result.effectiveness);
  vfxShockwave(side, type, result.effectiveness > 1 || result.critical);
  vfxHitFlash(side, result.effectiveness, result.critical);
  vfxDamageNumber(side, result.damage, {
    critical: result.critical,
    superEff: result.effectiveness > 1,
    weak: result.effectiveness < 1 && result.effectiveness > 0,
  });

  if (result.critical) vfxBanner('Critical hit!', 'crit');
  else if (result.effectiveness > 1) vfxBanner("It's super effective!", 'super');
  else if (result.effectiveness < 1) vfxBanner("It's not very effective...", 'weak');

  await sleepVfx(350);
}

function vfxAttackerDust(side) {
  vfxInit();
  const { atk } = getSpriteEls(side);
  if (!atk) return;
  const a = vfxRect(atk);
  for (let i = 0; i < 6; i++) {
    spawnParticle({
      className: 'vfx-spark',
      char: '·',
      color: '#c4a35a',
      x: a.cx + (Math.random() - 0.5) * 30,
      y: a.y + a.h - 8,
      vx: (Math.random() - 0.5) * 60,
      vy: -10 - Math.random() * 30,
      life: 0.35,
      gravity: 50,
      size: 8 + Math.random() * 6,
      scale: 0.6,
    });
  }
}

function vfxShockwave(side, moveType, big = false) {
  vfxInit();
  const { def } = getSpriteEls(side);
  if (!def || !VFX.layer) return;
  const d = vfxRect(def);
  const color = TYPE_COLORS[moveType] || '#fff';
  const ring = document.createElement('div');
  ring.className = 'vfx-shockwave' + (big ? ' big' : '');
  ring.style.left = d.cx + 'px';
  ring.style.top = d.cy + 'px';
  ring.style.borderColor = color;
  ring.style.boxShadow = `0 0 24px ${color}, inset 0 0 12px ${color}`;
  VFX.layer.appendChild(ring);
  setTimeout(() => ring.remove(), 500);
}

function vfxMissPuff(side) {
  vfxInit();
  const { def } = getSpriteEls(side);
  if (!def) return;
  const d = vfxRect(def);
  for (let i = 0; i < 5; i++) {
    spawnParticle({
      className: 'vfx-spark',
      char: '💨',
      color: '#9bb4c8',
      x: d.cx + (Math.random() - 0.5) * 20,
      y: d.cy + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 40,
      vy: -20 - Math.random() * 20,
      life: 0.45,
      size: 14,
    });
  }
}

function sleepVfx(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Catch ball animation */
async function vfxCatchBall(success) {
  vfxInit();
  const overlay = document.getElementById('catch-overlay');
  const ball = document.getElementById('catch-ball-img');
  const enemy = document.getElementById('enemy-sprite');
  if (!overlay) return;

  overlay.classList.add('visible');
  if (ball) {
    ball.classList.remove('throw', 'wiggle', 'catch-success', 'catch-fail');
    void ball.offsetWidth;
    ball.classList.add('throw');
  }

  // Hide enemy briefly when "sucked in"
  await sleepVfx(500);
  if (enemy) enemy.style.opacity = '0.15';
  if (ball) {
    ball.classList.remove('throw');
    ball.classList.add('wiggle');
  }

  await sleepVfx(1400);

  if (success) {
    if (ball) {
      ball.classList.remove('wiggle');
      ball.classList.add('catch-success');
    }
    if (enemy) enemy.style.opacity = '0';
    // Stars
    if (VFX.layer) {
      const r = enemy ? vfxRect(enemy) : { cx: 200, cy: 100 };
      for (let i = 0; i < 16; i++) {
        spawnParticle({
          className: 'vfx-spark',
          char: '★',
          color: '#ffcb05',
          x: r.cx,
          y: r.cy,
          vx: (Math.random() - 0.5) * 160,
          vy: (Math.random() - 0.5) * 160 - 40,
          life: 0.9,
          gravity: 80,
          size: 16,
        });
      }
    }
    await sleepVfx(700);
  } else {
    if (ball) {
      ball.classList.remove('wiggle');
      ball.classList.add('catch-fail');
    }
    if (enemy) enemy.style.opacity = '1';
    await sleepVfx(500);
  }

  overlay.classList.remove('visible');
  if (ball) ball.classList.remove('throw', 'wiggle', 'catch-success', 'catch-fail');
  if (enemy && !success) enemy.style.opacity = '1';
}
