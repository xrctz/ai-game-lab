/**
 * Pokemon Adventure — Main Game Engine
 */

// Canvas viewport: VW x VH tiles at TS px each -> 15 * 48 = 720w, 10 * 48 = 480h.
const TS = 48;
const VW = 15;
const VH = 10;

/**
 * Blender-exported trainer sprites (animated)
 * - 4 dirs × 6 walk frames (walk_0..walk_5) — full biped cycle
 * - 4 dirs × 2 idle frames (idle_0, idle_1) — breath (may be identical)
 * walkDist drives walkPhase continuously so animation doesn't hitch per tile.
 */
const PLAYER_SPRITE_BASE = 'assets/sprites/player';
const PLAYER_SPRITE_DIRS = ['down', 'up', 'left', 'right'];
const PLAYER_WALK_FRAMES = 6;
const PLAYER_IDLE_FRAMES = 2;
const PlayerSprites = {
  ready: false,
  images: {}, // key → HTMLImageElement
  // Per-direction UNION content box so feet don't pop between frames
  dirBounds: {}, // dir → {sx,sy,sw,sh}
  portrait: null,
};

function measureSpriteContent(img) {
  try {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, w, h).data;
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let found = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 12) {
          found = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) return { sx: 0, sy: 0, sw: w, sh: h };
    const pad = 2;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad);
    maxY = Math.min(h - 1, maxY + pad);
    return { sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 };
  } catch (e) {
    return { sx: 0, sy: 0, sw: img.naturalWidth || 1, sh: img.naturalHeight || 1 };
  }
}

function rebuildDirBounds() {
  for (const dir of PLAYER_SPRITE_DIRS) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let any = false;
    const keys = [];
    for (let i = 0; i < PLAYER_WALK_FRAMES; i++) keys.push(`${dir}_walk_${i}`);
    for (let i = 0; i < PLAYER_IDLE_FRAMES; i++) keys.push(`${dir}_idle_${i}`);
    keys.push(`${dir}_idle`, `${dir}_walk1`, `${dir}_walk2`);
    for (const key of keys) {
      const img = PlayerSprites.images[key];
      if (!img || !img.naturalWidth) continue;
      const b = measureSpriteContent(img);
      any = true;
      minX = Math.min(minX, b.sx);
      minY = Math.min(minY, b.sy);
      maxX = Math.max(maxX, b.sx + b.sw);
      maxY = Math.max(maxY, b.sy + b.sh);
    }
    if (any) {
      PlayerSprites.dirBounds[dir] = {
        sx: minX,
        sy: minY,
        sw: maxX - minX,
        sh: maxY - minY,
      };
    }
  }
}

function loadPlayerSprites() {
  let pending = 0;
  let loaded = 0;
  const finishOne = () => {
    loaded++;
    if (loaded >= pending) {
      rebuildDirBounds();
      PlayerSprites.ready = true;
    }
  };
  // Cache-bust so re-exported Blender frames aren't stuck in browser cache
  const SPRITE_VER = 'v5';
  const load = (key, src) => {
    pending++;
    const img = new Image();
    img.onload = finishOne;
    img.onerror = finishOne;
    img.src = src.includes('?') ? src : `${src}?${SPRITE_VER}`;
    PlayerSprites.images[key] = img;
  };

  for (const dir of PLAYER_SPRITE_DIRS) {
    for (let i = 0; i < PLAYER_WALK_FRAMES; i++) {
      load(`${dir}_walk_${i}`, `${PLAYER_SPRITE_BASE}/${dir}_walk_${i}.png`);
    }
    for (let i = 0; i < PLAYER_IDLE_FRAMES; i++) {
      load(`${dir}_idle_${i}`, `${PLAYER_SPRITE_BASE}/${dir}_idle_${i}.png`);
    }
    // Legacy aliases → point at new cycle frames (avoid stale extreme side kicks)
    load(`${dir}_idle`, `${PLAYER_SPRITE_BASE}/${dir}_idle_0.png`);
    load(`${dir}_walk1`, `${PLAYER_SPRITE_BASE}/${dir}_walk_1.png`);
    load(`${dir}_walk2`, `${PLAYER_SPRITE_BASE}/${dir}_walk_4.png`);
  }
  pending++;
  const portrait = new Image();
  portrait.onload = finishOne;
  portrait.onerror = finishOne;
  portrait.src = `${PLAYER_SPRITE_BASE}/portrait.png?${SPRITE_VER}`;
  PlayerSprites.portrait = portrait;
}

/** Returns { img, key } for the current pose */
function getPlayerSpriteFrame(dir, walkPhase, moving) {
  const d = PLAYER_SPRITE_DIRS.includes(dir) ? dir : 'down';

  if (moving) {
    // Continuous walkPhase: one full biped cycle (frames 0..5) per tile of travel.
    // walkPhase increases by ~2 per tile (see updateOverworld), so % 2 → 0..2 → map to 0..1.
    const cycle = ((walkPhase % 2) + 2) % 2; // 0..2
    const t = cycle / 2; // 0..1
    let idx = Math.floor(t * PLAYER_WALK_FRAMES);
    if (idx >= PLAYER_WALK_FRAMES) idx = PLAYER_WALK_FRAMES - 1;
    const key = `${d}_walk_${idx}`;
    const img =
      PlayerSprites.images[key] ||
      PlayerSprites.images[`${d}_walk_0`] ||
      PlayerSprites.images[`${d}_idle_0`] ||
      PlayerSprites.images[`${d}_idle`];
    return { img, key, dir: d };
  }

  // Idle: prefer idle_0 (idle_1 is often a duplicate export)
  // Subtle breath is faked with a scale pulse in drawPlayerSprite when frames match.
  const tick = (typeof Game !== 'undefined' && Game.animTick) || 0;
  const idleIdx = Math.floor(tick * 1.6) % PLAYER_IDLE_FRAMES;
  const key = `${d}_idle_${idleIdx}`;
  const img =
    PlayerSprites.images[key] ||
    PlayerSprites.images[`${d}_idle_0`] ||
    PlayerSprites.images[`${d}_idle`];
  return { img, key, dir: d };
}

/**
 * Draw the exported 3D trainer sprite into a tile cell.
 * Returns true if drawn; false if sprites not ready (caller falls back).
 */
function drawPlayerSprite(ctx, sx, sy, dir, walkPhase, moving, opts = {}) {
  if (!PlayerSprites.ready) return false;
  const frame = getPlayerSpriteFrame(dir, walkPhase || 0, moving);
  const img = frame.img;
  if (!img || !img.complete || !img.naturalWidth) return false;

  // Shared union bbox for this facing — prevents foot/head pop between frames
  const b =
    PlayerSprites.dirBounds[frame.dir] || {
      sx: 0,
      sy: 0,
      sw: img.naturalWidth,
      sh: img.naturalHeight,
    };

  // ~1.2 tiles tall so the trainer reads as clearly as NPCs
  const targetH = TS * 1.2;
  const scale = targetH / b.sh;
  const w = Math.max(8, Math.round(b.sw * scale));
  const h = Math.max(12, Math.round(b.sh * scale));

  // Idle “breath” when both idle frames are the same asset
  let breath = 1;
  if (!moving && !opts.ghost) {
    const tick = (typeof Game !== 'undefined' && Game.animTick) || 0;
    breath = 1 + Math.sin(tick * 2.4) * 0.025;
  }

  const dw = Math.round(w * breath);
  const dh = Math.round(h * breath);
  const dx = Math.round(sx + (TS - dw) / 2);
  // Lock feet to tile bottom (shared bbox → stable contact)
  const dy = Math.round(sy + TS - dh + 1 + (opts.squash || 0) * 0.2);

  ctx.save();
  if (opts.ghost) ctx.globalAlpha *= 0.4;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, b.sx, b.sy, b.sw, b.sh, dx, dy, dw, dh);
  ctx.restore();
  return true;
}

/**
 * Blender-exported NPC sprites (4 dirs × idle_0/1)
 * roles match data.js NPCS: nurse, oak, shop, kid
 */
const NPC_SPRITE_BASE = 'assets/sprites/npc';
const NPC_SPRITE_ROLES = ['nurse', 'oak', 'shop', 'kid'];
const PROP_SPRITE_BASE = 'assets/sprites/props';
const WorldSprites = {
  ready: false,
  images: {},
  bounds: {},
};

function loadWorldSprites() {
  let pending = 0;
  let loaded = 0;
  const done = (key, img) => {
    if (key && img && img.naturalWidth) {
      WorldSprites.bounds[key] = measureSpriteContent(img);
    }
    loaded++;
    if (loaded >= pending) WorldSprites.ready = true;
  };
  const WORLD_VER = 'v5';
  const load = (key, src) => {
    pending++;
    const img = new Image();
    img.onload = () => done(key, img);
    img.onerror = () => done(null, null);
    img.src = src.includes('?') ? src : `${src}?${WORLD_VER}`;
    WorldSprites.images[key] = img;
  };

  for (const role of NPC_SPRITE_ROLES) {
    for (const dir of PLAYER_SPRITE_DIRS) {
      for (let i = 0; i < 2; i++) {
        load(`${role}_${dir}_idle_${i}`, `${NPC_SPRITE_BASE}/${role}_${dir}_idle_${i}.png`);
      }
    }
  }

  // Props (stills / 2-frame idle)
  const props = [
    'heal_machine', 'heal_pad', 'pc', 'cave', 'sign',
    'tree_idle_0', 'tree_idle_1',
    'tallgrass_idle_0', 'tallgrass_idle_1',
    'flowers_idle_0', 'flowers_idle_1',
  ];
  for (const p of props) {
    load(`prop_${p}`, `${PROP_SPRITE_BASE}/${p}.png`);
  }
  if (pending === 0) WorldSprites.ready = true;
}

function drawNpcSprite(ctx, sx, sy, role, dir, opts = {}) {
  if (!WorldSprites.ready) return false;
  if (!NPC_SPRITE_ROLES.includes(role)) return false;
  const d = PLAYER_SPRITE_DIRS.includes(dir) ? dir : 'down';
  const tick = (typeof Game !== 'undefined' && Game.animTick) || 0;
  const idleIdx = Math.floor(tick * 1.5) % 2;
  const key = `${role}_${d}_idle_${idleIdx}`;
  const img =
    WorldSprites.images[key] ||
    WorldSprites.images[`${role}_${d}_idle_0`] ||
    WorldSprites.images[`${role}_down_idle_0`];
  if (!img || !img.complete || !img.naturalWidth) return false;

  const b = WorldSprites.bounds[key] || WorldSprites.bounds[`${role}_${d}_idle_0`] || {
    sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight,
  };

  const targetH = TS * 1.15;
  const scale = targetH / b.sh;
  const w = Math.max(8, Math.round(b.sw * scale));
  const h = Math.max(12, Math.round(b.sh * scale));
  const dx = Math.round(sx + (TS - w) / 2);
  const dy = Math.round(sy + TS - h + 1);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, b.sx, b.sy, b.sw, b.sh, dx, dy, w, h);
  ctx.restore();
  return true;
}

function drawPropSprite(ctx, sx, sy, propKey, targetHMult = 1.1) {
  if (!WorldSprites.ready) return false;
  const key = `prop_${propKey}`;
  const img = WorldSprites.images[key];
  if (!img || !img.complete || !img.naturalWidth) return false;
  const b = WorldSprites.bounds[key] || {
    sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight,
  };
  const targetH = TS * targetHMult;
  const scale = targetH / b.sh;
  const w = Math.max(8, Math.round(b.sw * scale));
  const h = Math.max(8, Math.round(b.sh * scale));
  const dx = Math.round(sx + (TS - w) / 2);
  const dy = Math.round(sy + TS - h);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, b.sx, b.sy, b.sw, b.sh, dx, dy, w, h);
  ctx.restore();
  return true;
}

const Game = {
  state: 'title', // title | starter | overworld | battle | dialogue | menu
  canvas: null,
  ctx: null,
  keys: {},
  player: {
    x: 12,
    y: 12,
    px: 12 * TS,
    py: 12 * TS,
    dir: 'down',
    moving: false,
    moveProgress: 0,
    moveTarget: null,
    walkPhase: 0, // continuous walk-cycle phase
    walkDist: 0, // accumulated px traveled (drives walkPhase)
    stepPulse: 0, // squash on foot plant
    sprite: 'trainer',
    name: 'Trainer',
  },
  party: [],
  bag: {
    pokeball: 5,
    potion: 3,
    superball: 0,
  },
  flags: {
    shopGift: false,
    mewtwoDefeated: false,
    caughtSpecies: new Set(),
    trainersDefeated: new Set(),
    shinyCatches: 0,
  },
  steps: 0,
  battlesWon: 0,
  // dialogue
  dialogueQueue: [],
  dialogueIndex: 0,
  dialogueCallback: null,
  // battle
  battle: null,
  // timing
  lastTime: 0,
  moveSpeed: 4.5, // tiles per second
  encounterCooldown: 0,
  healPadCooldown: 0,
  animTick: 0,
  waterPhase: 0,
  toastTimer: null,
  // overworld particles / trail
  fx: {
    trails: [],   // afterimage + dust while walking
    ambient: [],  // floating pollen / motes
    emitAcc: 0,   // emission accumulator
    ambientAcc: 0,
  },
  // smooth camera (world px of top-left of view)
  cam: { x: 12 * TS - (VW * TS) / 2 + TS / 2, y: 12 * TS - (VH * TS) / 2 + TS / 2 },
};

// ---------- Bootstrap ----------
function init() {
  Game.canvas = document.getElementById('game-canvas');
  Game.ctx = Game.canvas.getContext('2d');
  Game.canvas.width = VW * TS;
  Game.canvas.height = VH * TS;

  loadPlayerSprites();
  loadWorldSprites();
  bindInput();
  bindUI();
  initAudio();
  showScreen('title-screen');
  requestAnimationFrame(loop);
}

// ---------- Lightweight Web Audio SFX (optional polish) ----------
const SFX = {
  ctx: null,
  enabled: true,
};

function initAudio() {
  const unlock = () => {
    try {
      if (!SFX.ctx) SFX.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (SFX.ctx.state === 'suspended') SFX.ctx.resume();
    } catch (e) { /* ignore */ }
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

function playTone(freq, dur = 0.08, type = 'square', gain = 0.04) {
  if (!SFX.enabled) return;
  try {
    if (!SFX.ctx) SFX.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = SFX.ctx;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch (e) { /* audio optional */ }
}

function sfx(name) {
  switch (name) {
    case 'select': playTone(520, 0.06, 'square', 0.03); break;
    case 'hit': playTone(180, 0.1, 'sawtooth', 0.05); break;
    case 'super': playTone(320, 0.08); setTimeout(() => playTone(480, 0.1), 60); break;
    case 'catch': playTone(400, 0.08); setTimeout(() => playTone(600, 0.12), 80); break;
    case 'heal': playTone(440, 0.08, 'sine', 0.04); setTimeout(() => playTone(660, 0.12, 'sine', 0.04), 70); break;
    case 'save': playTone(300, 0.06); setTimeout(() => playTone(500, 0.1), 70); break;
    case 'faint': playTone(200, 0.15, 'triangle', 0.04); setTimeout(() => playTone(120, 0.2, 'triangle', 0.03), 100); break;
    default: break;
  }
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function showToast(msg, ms = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(Game.toastTimer);
  Game.toastTimer = setTimeout(() => t.classList.remove('visible'), ms);
}

// ---------- Input ----------
function bindInput() {
  window.addEventListener('keydown', (e) => {
    Game.keys[e.key.toLowerCase()] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
    handleKeyPress(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => {
    Game.keys[e.key.toLowerCase()] = false;
  });

  // Mobile dpad
  document.querySelectorAll('.dpad button').forEach((btn) => {
    const dir = btn.dataset.dir;
    const press = (e) => {
      e.preventDefault();
      Game.keys[`mobile_${dir}`] = true;
      if (Game.state === 'overworld') tryMove(dir);
    };
    const release = (e) => {
      e.preventDefault();
      Game.keys[`mobile_${dir}`] = false;
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
  });

  document.getElementById('btn-a')?.addEventListener('click', () => handleKeyPress('e'));
  // B opens bag (matches keyboard + controls hint); also closes open menus
  document.getElementById('btn-b')?.addEventListener('click', () => handleKeyPress('b'));
  document.getElementById('btn-menu')?.addEventListener('click', () => handleKeyPress('m'));
}

function handleKeyPress(key) {
  // Nurse Joy machine animation — ignore input
  if (Game.state === 'healing') return;

  if (Game.state === 'dialogue') {
    if (key === 'e' || key === ' ' || key === 'enter') advanceDialogue();
    return;
  }
  if (Game.state === 'menu') {
    if (key === 'escape' || key === 'm' || key === 'b' || key === 'e') closeMenus();
    return;
  }
  if (Game.state === 'overworld') {
    // One tile per keydown so taps/automation feel responsive
    // (held keys still drive continuous movement via updateOverworld).
    if (key === 'w' || key === 'arrowup') tryMove('up');
    else if (key === 's' || key === 'arrowdown') tryMove('down');
    else if (key === 'a' || key === 'arrowleft') tryMove('left');
    else if (key === 'd' || key === 'arrowright') tryMove('right');
    if (key === 'e' || key === ' ') interact();
    if (key === 'm') openPartyMenu();
    if (key === 'b') openBagMenu();
    if (key === 'p') saveGame();
    if (key === 'escape') openPartyMenu();
  }
}

function bindUI() {
  document.getElementById('btn-start').addEventListener('click', () => {
    showScreen('starter-screen');
    Game.state = 'starter';
  });

  document.getElementById('btn-continue')?.addEventListener('click', () => {
    if (loadGame()) {
      showToast('Game loaded!');
    } else {
      showToast('No valid save found.');
      refreshContinueButton();
    }
  });

  document.querySelectorAll('.starter-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.species;
      startGame(id);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startGame(card.dataset.species);
      }
    });
  });

  // Click dialogue box to advance (mouse / touch friendly)
  document.getElementById('dialogue')?.addEventListener('click', () => {
    if (Game.state === 'dialogue') advanceDialogue();
  });

  document.getElementById('btn-close-party').addEventListener('click', closeMenus);
  document.getElementById('btn-close-bag').addEventListener('click', closeMenus);

  // Battle buttons
  document.getElementById('btn-fight').addEventListener('click', () => showMovesMenu());
  document.getElementById('btn-switch')?.addEventListener('click', () => showSwitchMenu());
  document.getElementById('btn-catch').addEventListener('click', () => battleCatch());
  document.getElementById('btn-bag-battle').addEventListener('click', () => battleUsePotion());
  document.getElementById('btn-run').addEventListener('click', () => battleRun());
  document.getElementById('btn-back-moves').addEventListener('click', () => showMainBattleMenu());
  document.getElementById('btn-back-switch')?.addEventListener('click', () => showMainBattleMenu());

  document.getElementById('btn-restart')?.addEventListener('click', () => {
    location.reload();
  });

  refreshContinueButton();
}

function startGame(starterId) {
  Game.party = [createPokemon(starterId, 5)];
  Game.flags.caughtSpecies = new Set([starterId]);
  Game.flags.trainersDefeated = new Set();
  Game.flags.shinyCatches = 0;
  // Spawn on town path, facing north (away from the pond)
  Game.player.x = 12;
  Game.player.y = 12;
  Game.player.px = 12 * TS;
  Game.player.py = 12 * TS;
  Game.player.dir = 'up';
  Game.player.moving = false;
  Game.player.moveTarget = null;
  Game.player.walkPhase = 0;
  Game.player.walkDist = 0;
  Game.player.stepPulse = 0;
  Game.fx.trails = [];
  Game.fx.ambient = [];
  Game.fx.emitAcc = 0;
  Game.fx.ambientAcc = 0;
  Game.bag = { pokeball: 5, potion: 3, superball: 1 };
  // Snap camera onto player
  Game.cam.x = Game.player.px - (VW * TS) / 2 + TS / 2;
  Game.cam.y = Game.player.py - (VH * TS) / 2 + TS / 2;
  Game.flags.shopGift = false;
  Game.flags.mewtwoDefeated = false;
  Game.battlesWon = 0;
  Game.steps = 0;

  showScreen('game-screen');
  Game.state = 'overworld';
  updateHUD();
  startDialogue([
    `You chose ${SPECIES[starterId].name}!`,
    'Use WASD or Arrow keys to move.',
    'Press E to talk / interact. M for party. B for bag. P to save.',
    'Talk to Nurse Joy at the pink-roof Pokémon Center to heal!',
    'Challenge Youngster Joey north of town for a real battle!',
    'Catch 6 species and defeat Mewtwo in the northern cave to win!',
  ]);
}

// ---------- Save / Load ----------

function snapshotGameState() {
  return {
    party: Game.party,
    bag: Game.bag,
    player: Game.player,
    flags: Game.flags,
    steps: Game.steps,
    battlesWon: Game.battlesWon,
  };
}

function saveGame() {
  if (!Game.party.length || Game.state === 'title' || Game.state === 'starter') {
    showToast('Nothing to save yet.');
    return false;
  }
  if (Game.state === 'battle') {
    showToast("Can't save during battle!");
    return false;
  }
  const data = serializeGameState(snapshotGameState());
  if (!data) {
    showToast('Save failed.');
    return false;
  }
  try {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
    sfx('save');
    showToast('Game saved!');
    refreshContinueButton();
    return true;
  } catch (e) {
    console.warn('Save failed', e);
    showToast('Save failed (storage).');
    return false;
  }
}

function readSavedData() {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function loadGame() {
  const data = readSavedData();
  const snap = deserializeGameState(data);
  if (!snap) return false;

  Game.party = snap.party;
  Game.bag = snap.bag;
  Game.player.x = snap.player.x;
  Game.player.y = snap.player.y;
  Game.player.px = snap.player.x * TS;
  Game.player.py = snap.player.y * TS;
  Game.player.dir = snap.player.dir;
  Game.player.moving = false;
  Game.player.moveTarget = null;
  Game.player.moveProgress = 0;
  Game.player.walkPhase = 0;
  Game.player.walkDist = 0;
  Game.player.stepPulse = 0;
  Game.flags = snap.flags;
  if (!(Game.flags.trainersDefeated instanceof Set)) {
    Game.flags.trainersDefeated = new Set(Game.flags.trainersDefeated || []);
  }
  if (!(Game.flags.caughtSpecies instanceof Set)) {
    Game.flags.caughtSpecies = new Set(Game.flags.caughtSpecies || []);
  }
  Game.steps = snap.steps;
  Game.battlesWon = snap.battlesWon;
  Game.battle = null;
  Game.fx.trails = [];
  Game.fx.ambient = [];
  Game.cam.x = Game.player.px - (VW * TS) / 2 + TS / 2;
  Game.cam.y = Game.player.py - (VH * TS) / 2 + TS / 2;
  Game.encounterCooldown = 1;
  showScreen('game-screen');
  Game.state = 'overworld';
  updateHUD();
  return true;
}

function refreshContinueButton() {
  const btn = document.getElementById('btn-continue');
  if (!btn) return;
  const valid = hasValidSaveData(readSavedData());
  btn.hidden = !valid;
}

// ---------- Main Loop ----------
function loop(time) {
  const dt = Math.min((time - Game.lastTime) / 1000, 0.05);
  Game.lastTime = time;
  Game.animTick += dt;
  Game.waterPhase += dt;

  // Always paint the overworld while the game canvas is up (dialogue/menus
  // still need the map underneath — otherwise you get a blank green square).
  if (Game.state === 'overworld' || Game.state === 'dialogue' || Game.state === 'menu' || Game.state === 'healing') {
    if (Game.state === 'overworld') updateOverworld(dt);
    else {
      updateWalkFx(dt);
      updateAmbientFx(dt);
      updateCamera(dt, false);
    }
    drawOverworld();
  }

  requestAnimationFrame(loop);
}

// ---------- Overworld ----------
function updateOverworld(dt) {
  if (Game.encounterCooldown > 0) Game.encounterCooldown -= dt;
  if (Game.healPadCooldown > 0) Game.healPadCooldown -= dt;
  if (Game.player.stepPulse > 0) Game.player.stepPulse = Math.max(0, Game.player.stepPulse - dt * 6);

  const p = Game.player;
  if (p.moving && p.moveTarget) {
    const speed = Game.moveSpeed * TS; // px/s
    const tx = p.moveTarget.x * TS;
    const ty = p.moveTarget.y * TS;
    const dx = tx - p.px;
    const dy = ty - p.py;
    const dist = Math.hypot(dx, dy);
    const step = speed * dt;

    // Continuous walk cycle (don't reset per tile — that made the animation hitch)
    const totalDist = TS;
    p.moveProgress = 1 - dist / totalDist;

    // Emit trail / dust while moving
    emitWalkFx(dt);

    if (dist <= step) {
      p.walkDist += dist;
      p.walkPhase = p.walkDist / (TS * 0.5); // ~2 phase units per tile
      p.px = tx;
      p.py = ty;
      p.x = p.moveTarget.x;
      p.y = p.moveTarget.y;
      p.moving = false;
      p.moveTarget = null;
      p.moveProgress = 0;
      p.stepPulse = 1;
      onStepComplete();
    } else {
      p.px += (dx / dist) * step;
      p.py += (dy / dist) * step;
      p.walkDist += step;
      p.walkPhase = p.walkDist / (TS * 0.5);
    }
  } else {
    p.moveProgress = 0;
    // Soft idle breathing (tiny phase so idle frame stays selected)
    // Poll movement keys
    let dir = null;
    if (Game.keys['w'] || Game.keys['arrowup'] || Game.keys['mobile_up']) dir = 'up';
    else if (Game.keys['s'] || Game.keys['arrowdown'] || Game.keys['mobile_down']) dir = 'down';
    else if (Game.keys['a'] || Game.keys['arrowleft'] || Game.keys['mobile_left']) dir = 'left';
    else if (Game.keys['d'] || Game.keys['arrowright'] || Game.keys['mobile_right']) dir = 'right';
    if (dir) tryMove(dir);
  }

  updateWalkFx(dt);
  updateAmbientFx(dt);
  updateCamera(dt, true);
}

function updateCamera(dt, followPlayer) {
  const p = Game.player;
  let targetX = p.px - (VW * TS) / 2 + TS / 2;
  let targetY = p.py - (VH * TS) / 2 + TS / 2;
  // Look-ahead in move direction
  if (followPlayer && p.moving) {
    const look = 18;
    if (p.dir === 'up') targetY -= look;
    if (p.dir === 'down') targetY += look;
    if (p.dir === 'left') targetX -= look;
    if (p.dir === 'right') targetX += look;
  }
  const k = Math.min(1, 10 * dt); // smooth follow
  Game.cam.x += (targetX - Game.cam.x) * k;
  Game.cam.y += (targetY - Game.cam.y) * k;
}

function tryMove(dir) {
  if (Game.state !== 'overworld') return;
  const p = Game.player;
  if (p.moving) return;

  p.dir = dir;
  let nx = p.x;
  let ny = p.y;
  if (dir === 'up') ny--;
  if (dir === 'down') ny++;
  if (dir === 'left') nx--;
  if (dir === 'right') nx++;

  if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) return;

  // Block on NPC
  if (NPCS.some((n) => n.x === nx && n.y === ny)) return;

  const tile = WORLD_MAP[ny][nx];
  if (!isWalkable(tile)) return;

  p.moving = true;
  p.moveTarget = { x: nx, y: ny };
}

function onStepComplete() {
  Game.steps++;
  updateHUD();

  const tile = WORLD_MAP[Game.player.y][Game.player.x];
  // Foot plant burst
  spawnFootstepBurst(tile);

  // Heal pad (quick heal; Nurse Joy is the full classic sequence)
  if (tile === TILE.HEAL) {
    if (Game.healPadCooldown > 0) return;
    if (partyNeedsHealing(Game.party)) {
      healParty(Game.party);
      updateHUD();
      showToast('Your Pokémon were fully healed!');
      spawnHealSparkles();
      Game.healPadCooldown = 1.5;
    }
    return;
  }

  // Encounters
  if (isEncounterTile(tile) && Game.encounterCooldown <= 0) {
    const chance = tile === TILE.FOREST ? 0.22 : tile === TILE.CAVE ? 0.16 : tile === TILE.FLOWER ? 0.15 : 0.15;
    if (Math.random() < chance) {
      const zone = getZone(Game.player.x, Game.player.y);
      const wild = pickWildEncounter(zone);
      startBattle(wild);
    }
  }
}

function interact() {
  if (Game._interactLockUntil && performance.now() < Game._interactLockUntil) return;
  const p = Game.player;
  let tx = p.x;
  let ty = p.y;
  if (p.dir === 'up') ty--;
  if (p.dir === 'down') ty++;
  if (p.dir === 'left') tx--;
  if (p.dir === 'right') tx++;

  const npc = NPCS.find((n) => n.x === tx && n.y === ty);
  if (npc) {
    if (npc.healsParty || npc.role === 'nurse') {
      startNurseHeal(npc);
      return;
    }
    if (npc.giveItems && !Game.flags.shopGift) {
      Game.bag.pokeball += 5;
      Game.bag.potion += 3;
      Game.bag.superball += 1;
      Game.flags.shopGift = true;
      updateHUD();
    }
    // Trainer battle NPCs (multi-Pokémon)
    if (npc.trainer && npc.trainerId) {
      const beaten = Game.flags.trainersDefeated?.has(npc.trainerId);
      if (beaten) {
        const lines = (npc.dialogueRematch || npc.dialogueAfterWin || npc.dialogue)
          .map((line) => `${npc.name}: ${line}`);
        startDialogue(lines);
        return;
      }
      const intro = (npc.dialogue || []).map((line) => `${npc.name}: ${line}`);
      startDialogue(intro, () => startTrainerBattle(npc));
      return;
    }
    startDialogue(npc.dialogue.map((line) => `${npc.name}: ${line}`));
    return;
  }

  // Sign / tile messages
  if (tx >= 0 && ty >= 0 && ty < MAP_H && tx < MAP_W) {
    const tile = WORLD_MAP[ty][tx];
    if (tile === TILE.WATER) {
      startDialogue(['The water is crystal clear. Magikarp might be swimming...']);
    } else if (tile === TILE.TREE) {
      startDialogue(['A sturdy tree blocks the way.']);
    }
  }
}

// ---------- Drawing ----------
function drawOverworld() {
  const ctx = Game.ctx;
  const p = Game.player;
  ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);

  // Smooth camera
  const camX = Game.cam.x;
  const camY = Game.cam.y;

  // Draw tiles
  const startTX = Math.floor(camX / TS) - 1;
  const startTY = Math.floor(camY / TS) - 1;
  const endTX = startTX + VW + 3;
  const endTY = startTY + VH + 3;

  for (let ty = startTY; ty <= endTY; ty++) {
    for (let tx = startTX; tx <= endTX; tx++) {
      const sx = Math.floor(tx * TS - camX);
      const sy = Math.floor(ty * TS - camY);

      if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) {
        ctx.fillStyle = '#0a1520';
        ctx.fillRect(sx, sy, TS, TS);
        continue;
      }

      const tile = WORLD_MAP[ty][tx];
      drawTile(ctx, tile, sx, sy, tx, ty);
    }
  }

  // Walk trail / dust / grass (under characters)
  drawWalkFx(ctx, camX, camY);
  drawAmbientFx(ctx, camX, camY);

  // Fixed Blender props (Center machine / PC near mart area)
  {
    const props = [
      { x: 6, y: 10, key: 'heal_machine', h: 1.4 }, // inside Pokémon Center
      { x: 22, y: 10, key: 'pc', h: 1.25 },         // mart counter PC
    ];
    for (const pr of props) {
      const sx = Math.floor(pr.x * TS - camX);
      const sy = Math.floor(pr.y * TS - camY);
      if (sx < -TS * 2 || sy < -TS * 2 || sx > Game.canvas.width || sy > Game.canvas.height) continue;
      drawPropSprite(ctx, sx, sy - 10, pr.key, pr.h);
    }
  }

  // NPCs (face the player when using Blender sprites)
  for (const npc of NPCS) {
    const sx = Math.floor(npc.x * TS - camX);
    const sy = Math.floor(npc.y * TS - camY);
    if (sx < -TS || sy < -TS || sx > Game.canvas.width || sy > Game.canvas.height) continue;
    drawShadow(ctx, sx + TS / 2, sy + TS - 8, 13, 5);
    const npcBob = Math.sin(Game.animTick * 2.2 + npc.x * 0.7) * 1.2;
    let face = 'down';
    if (NPC_SPRITE_ROLES.includes(npc.role)) {
      const dx = p.x - npc.x;
      const dy = p.y - npc.y;
      if (Math.abs(dx) > Math.abs(dy)) face = dx > 0 ? 'right' : 'left';
      else if (dy !== 0) face = dy > 0 ? 'down' : 'up';
    }
    drawNpc(ctx, sx, sy + npcBob, npc.role || 'villager', face, Game.animTick * 0.3, false);
  }

  // Player
  const psx = Math.floor(p.px - camX);
  const psy = Math.floor(p.py - camY);
  const pulse = p.stepPulse || 0;
  // Larger shadow under the taller trainer sprite
  const shadowRx = 15 + pulse * 3;
  const shadowRy = 5.5 - pulse * 1.2;
  drawShadow(ctx, psx + TS / 2, psy + TS - 6, shadowRx, Math.max(3.5, shadowRy));

  // Walk bob + foot-plant squash (subtle — sprite already has leg motion)
  const bob = p.moving ? Math.sin(p.walkPhase * Math.PI) * 1.6 : Math.sin(Game.animTick * 2) * 0.4;
  const squash = pulse * 1.6;
  drawNpc(ctx, psx, psy + bob + squash * 0.2, 'player', p.dir, p.walkPhase, p.moving, {
    lean: p.moving ? 1 : 0,
    squash,
  });

  // Tall grass overlay in front of legs when standing in grass
  const standTile = WORLD_MAP[p.y] && WORLD_MAP[p.y][p.x];
  if (standTile === TILE.GRASS || standTile === TILE.FOREST || standTile === TILE.FLOWER) {
    drawGrassOverlay(ctx, psx, psy, p.x, p.y, standTile);
  }

  // Tiny facing pip at the feet (not over the face)
  ctx.fillStyle = 'rgba(255, 203, 5, 0.75)';
  let ix = psx + TS / 2;
  let iy = psy + TS - 3;
  if (p.dir === 'up') {
    ix = psx + TS / 2;
    iy = psy + TS - 10;
  } else if (p.dir === 'left') {
    ix = psx + 10;
    iy = psy + TS - 5;
  } else if (p.dir === 'right') {
    ix = psx + TS - 10;
    iy = psy + TS - 5;
  }
  ctx.beginPath();
  ctx.arc(ix, iy, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawGrassOverlay(ctx, sx, sy, tx, ty, tile) {
  ctx.fillStyle = tile === TILE.FOREST ? 'rgba(30,90,40,0.55)' : 'rgba(60,140,55,0.5)';
  for (let i = 0; i < 5; i++) {
    const gx = sx + 6 + i * 8;
    const gh = 10 + ((tx + ty + i) % 3) * 3;
    const sway = Math.sin(Game.animTick * 5 + i) * 1.5;
    ctx.fillRect(gx + sway, sy + TS - gh - 2, 3, gh);
  }
}

function updateAmbientFx(dt) {
  Game.fx.ambientAcc += dt;
  // Spawn soft floating motes over the map near the player
  if (Game.fx.ambientAcc > 0.12) {
    Game.fx.ambientAcc = 0;
    if (Game.fx.ambient.length < 36) {
      const p = Game.player;
      const ax = clamp(p.px + (Math.random() - 0.5) * VW * TS * 0.9, TS, (MAP_W - 1) * TS);
      const ay = clamp(p.py + (Math.random() - 0.5) * VH * TS * 0.9, TS, (MAP_H - 1) * TS);
      Game.fx.ambient.push({
        x: ax,
        y: ay,
        vx: (Math.random() - 0.5) * 12,
        vy: -8 - Math.random() * 14,
        life: 2.5 + Math.random() * 2,
        maxLife: 4,
        size: 1.5 + Math.random() * 2.5,
        color: Math.random() > 0.6 ? '#ffcb05' : Math.random() > 0.5 ? '#a8e6ff' : '#ffffff',
        wobble: Math.random() * Math.PI * 2,
      });
    }
  }
  for (let i = Game.fx.ambient.length - 1; i >= 0; i--) {
    const a = Game.fx.ambient[i];
    a.life -= dt;
    if (a.life <= 0) {
      Game.fx.ambient.splice(i, 1);
      continue;
    }
    a.wobble += dt * 2;
    a.x += a.vx * dt + Math.sin(a.wobble) * 8 * dt;
    a.y += a.vy * dt;
  }
}

function drawAmbientFx(ctx, camX, camY) {
  for (const a of Game.fx.ambient) {
    const t = a.life / a.maxLife;
    const sx = a.x - camX;
    const sy = a.y - camY;
    ctx.globalAlpha = Math.min(0.55, t * 0.7);
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.arc(sx, sy, a.size * (0.5 + t * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- Walk trail / dust FX ----------
function emitWalkFx(dt) {
  const p = Game.player;
  Game.fx.emitAcc += dt;

  // Dust puffs under feet (high rate while moving)
  if (Game.fx.emitAcc >= 0.03) {
    Game.fx.emitAcc = 0;
    const tile = WORLD_MAP[p.y] && WORLD_MAP[p.y][p.x];
    const onGrass = tile === TILE.GRASS || tile === TILE.FOREST || tile === TILE.FLOWER;
    const footX = p.px + TS / 2 + (Math.random() - 0.5) * 10;
    const footY = p.py + TS - 10 + (Math.random() - 0.5) * 4;

    // Direction opposite to movement for trail drift
    let ox = 0, oy = 0;
    if (p.dir === 'up') oy = 1;
    if (p.dir === 'down') oy = -1;
    if (p.dir === 'left') ox = 1;
    if (p.dir === 'right') ox = -1;

    // Dust / dirt
    Game.fx.trails.push({
      kind: 'dust',
      x: footX + ox * 4,
      y: footY + oy * 2,
      vx: ox * (12 + Math.random() * 18) + (Math.random() - 0.5) * 20,
      vy: oy * (8 + Math.random() * 12) - 8 - Math.random() * 12,
      life: 0.35 + Math.random() * 0.25,
      maxLife: 0.55,
      size: 3 + Math.random() * 4,
      color: onGrass ? 'rgba(90,160,70,' : 'rgba(196,163,90,',
      gravity: 25,
    });

    // Colored sparkle trail (trainer flair)
    if (Math.random() < 0.45) {
      const cols = ['#ffcb05', '#e3350d', '#3b4cca', '#fff'];
      Game.fx.trails.push({
        kind: 'spark',
        x: footX,
        y: footY - 6 - Math.random() * 10,
        vx: ox * 20 + (Math.random() - 0.5) * 40,
        vy: -20 - Math.random() * 30,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.65,
        size: 2 + Math.random() * 3,
        color: cols[Math.floor(Math.random() * cols.length)],
        gravity: -10,
      });
    }

    // Grass leaf bits
    if (onGrass && Math.random() < 0.55) {
      Game.fx.trails.push({
        kind: 'leaf',
        x: footX + (Math.random() - 0.5) * 16,
        y: footY - 4,
        vx: (Math.random() - 0.5) * 50,
        vy: -30 - Math.random() * 40,
        life: 0.45 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 3 + Math.random() * 2,
        color: Math.random() > 0.5 ? '#4caf50' : '#8bc34a',
        gravity: 80,
        rot: Math.random() * 360,
        spin: (Math.random() - 0.5) * 400,
      });
    }
  }

  // Ghost afterimage trail (layered silhouettes behind the trainer)
  if (p.moving && Math.random() < 0.22) {
    let bx = 0, by = 0;
    if (p.dir === 'up') by = 6;
    if (p.dir === 'down') by = -6;
    if (p.dir === 'left') bx = 6;
    if (p.dir === 'right') bx = -6;
    Game.fx.trails.push({
      kind: 'afterimage',
      x: p.px + bx,
      y: p.py + by,
      dir: p.dir,
      walkPhase: p.walkPhase,
      life: 0.32 + Math.random() * 0.1,
      maxLife: 0.4,
      alpha: 0.42,
    });
  }
}

function spawnFootstepBurst(tile) {
  const p = Game.player;
  const onGrass = tile === TILE.GRASS || tile === TILE.FOREST || tile === TILE.FLOWER;
  const cx = p.px + TS / 2;
  const cy = p.py + TS - 8;
  for (let i = 0; i < (onGrass ? 8 : 5); i++) {
    const ang = (Math.PI * 2 * i) / 6 + Math.random();
    Game.fx.trails.push({
      kind: onGrass ? 'leaf' : 'dust',
      x: cx,
      y: cy,
      vx: Math.cos(ang) * (30 + Math.random() * 40),
      vy: Math.sin(ang) * (15 + Math.random() * 20) - 20,
      life: 0.35 + Math.random() * 0.2,
      maxLife: 0.55,
      size: 3 + Math.random() * 3,
      color: onGrass ? '#66bb6a' : 'rgba(180,150,90,',
      gravity: onGrass ? 70 : 40,
      rot: Math.random() * 360,
      spin: (Math.random() - 0.5) * 300,
    });
  }
  // Soft ground ring
  Game.fx.trails.push({
    kind: 'ring',
    x: cx,
    y: cy,
    life: 0.28,
    maxLife: 0.28,
    size: 6,
    color: onGrass ? 'rgba(100,180,80,' : 'rgba(255,220,120,',
  });
}

function updateWalkFx(dt) {
  const list = Game.fx.trails;
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i];
    f.life -= dt;
    if (f.life <= 0) {
      list.splice(i, 1);
      continue;
    }
    if (f.kind === 'afterimage' || f.kind === 'ring') continue;
    f.x += (f.vx || 0) * dt;
    f.y += (f.vy || 0) * dt;
    f.vy = (f.vy || 0) + (f.gravity || 0) * dt;
    f.vx = (f.vx || 0) * 0.96;
    if (f.spin) f.rot = (f.rot || 0) + f.spin * dt;
  }
  // Cap particle count for perf
  if (list.length > 120) list.splice(0, list.length - 120);
}

function drawWalkFx(ctx, camX, camY) {
  for (const f of Game.fx.trails) {
    const t = f.life / f.maxLife;
    const sx = f.x - camX;
    const sy = f.y - camY;

    if (f.kind === 'afterimage') {
      ctx.save();
      ctx.globalAlpha = t * (f.alpha || 0.3);
      // Tint ghost blue/red
      ctx.filter = 'brightness(1.2) saturate(0.6)';
      drawNpc(ctx, Math.floor(sx), Math.floor(sy), 'player', f.dir, f.walkPhase || 0, true, { ghost: true });
      ctx.filter = 'none';
      ctx.restore();
      continue;
    }

    if (f.kind === 'ring') {
      const r = f.size + (1 - t) * 18;
      ctx.strokeStyle = (f.color || 'rgba(255,255,255,') + (t * 0.55) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r, r * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 'dust') {
      const a = t * 0.55;
      const col = typeof f.color === 'string' && f.color.endsWith(',')
        ? f.color + a + ')'
        : f.color;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(sx, sy, f.size * (0.6 + t * 0.6), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    if (f.kind === 'spark') {
      ctx.save();
      ctx.globalAlpha = t;
      ctx.fillStyle = f.color || '#ffcb05';
      ctx.shadowColor = f.color || '#ffcb05';
      ctx.shadowBlur = 6;
      const s = f.size * (0.5 + t);
      // diamond spark
      ctx.translate(sx, sy);
      ctx.rotate((1 - t) * 2);
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.6, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      continue;
    }

    if (f.kind === 'leaf') {
      ctx.save();
      ctx.globalAlpha = t * 0.9;
      ctx.translate(sx, sy);
      ctx.rotate(((f.rot || 0) * Math.PI) / 180);
      ctx.fillStyle = f.color || '#4caf50';
      ctx.beginPath();
      ctx.ellipse(0, 0, f.size, f.size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawShadow(ctx, cx, cy, rx, ry) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Pixel-style character with walk cycle, lean, and squash */
function drawNpc(ctx, sx, sy, role, dir, walkPhase, moving, opts = {}) {
  const cx = sx + TS / 2;
  const cy = sy + TS / 2;
  const phase = walkPhase || 0;
  const swing = moving ? Math.sin(phase * Math.PI) : Math.sin(phase * Math.PI) * 0.3;
  const legL = swing * 5;
  const legR = -swing * 5;
  const armL = -swing * 4;
  const armR = swing * 4;
  const leanX = moving
    ? dir === 'right' ? 2 : dir === 'left' ? -2 : 0
    : 0;
  const leanY = opts.squash || 0;

  // Blender-exported trainer for the player (4-dir walk cycle)
  if (role === 'player') {
    if (drawPlayerSprite(ctx, sx, sy + leanY, dir, phase, moving, opts)) {
      // Motion dash lines when moving (kept from original flair)
      if (moving && !opts.ghost) {
        ctx.strokeStyle = 'rgba(255,203,5,0.35)';
        ctx.lineWidth = 1.5;
        const bx = cx + leanX;
        const by = cy + leanY;
        const mx = dir === 'right' ? -14 : dir === 'left' ? 14 : 0;
        const my = dir === 'down' ? -12 : dir === 'up' ? 12 : 0;
        for (let i = 0; i < 3; i++) {
          const o = (i - 1) * 5 + swing * 2;
          ctx.beginPath();
          if (dir === 'left' || dir === 'right') {
            ctx.moveTo(bx + mx, by - 8 + o);
            ctx.lineTo(bx + mx + (dir === 'right' ? -8 : 8), by - 8 + o);
          } else {
            ctx.moveTo(bx - 8 + o, by + my);
            ctx.lineTo(bx - 8 + o, by + my + (dir === 'down' ? -8 : 8));
          }
          ctx.stroke();
        }
      }
      return;
    }
  }

  // Blender-exported NPCs (nurse / oak / shop / kid)
  if (NPC_SPRITE_ROLES.includes(role)) {
    if (drawNpcSprite(ctx, sx, sy + leanY, role, dir || 'down', opts)) {
      return;
    }
  }

  // Blender wooden sign prop for sign NPCs
  if (role === 'sign') {
    if (drawPropSprite(ctx, sx, sy + leanY, 'sign', 1.05)) {
      return;
    }
  }

  // palette by role (fallback / NPCs)
  // player palette aligned with exported Trainer Red look
  const palettes = {
    player:   { hat: '#e3350d', hatBand: '#fff', skin: '#f5c69a', shirt: '#e02018', pants: '#4066b8', shoe: '#f0f0f0' },
    oak:      { hat: '#c9a86c', hatBand: '#6b4f2a', skin: '#e8b88a', shirt: '#f0e6d0', pants: '#5a4a3a', shoe: '#333' },
    nurse:    { hat: '#fff', hatBand: '#e3350d', skin: '#f5c69a', shirt: '#fff', pants: '#f0a0b0', shoe: '#fff' },
    shop:     { hat: '#4a90d9', hatBand: '#ffcb05', skin: '#e0a878', shirt: '#3d7ea6', pants: '#2a3a4a', shoe: '#222' },
    kid:      { hat: '#ff6b35', hatBand: '#fff', skin: '#f5c69a', shirt: '#5cb85c', pants: '#3a5a8a', shoe: '#444' },
    sign:     null,
    villager: { hat: '#6b8f71', hatBand: '#ddd', skin: '#f5c69a', shirt: '#8b6914', pants: '#4a3a2a', shoe: '#222' },
  };

  if (role === 'sign') {
    ctx.fillStyle = '#6b4f2a';
    ctx.fillRect(cx - 3, cy - 4, 6, 22);
    ctx.fillStyle = '#e3350d';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 18);
    ctx.lineTo(cx + 14, cy);
    ctx.lineTo(cx - 14, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', cx, cy - 6);
    return;
  }

  const base = palettes[role] || palettes.villager;
  const ghost = opts.ghost;
  // Clone so afterimage tint never mutates the shared palette
  const c = ghost
    ? { hat: '#ff6b9d', hatBand: '#a0c4ff', skin: '#d0e0ff', shirt: '#6a8cff', pants: '#4a5a8a', shoe: '#334' }
    : base;

  const bx = cx + leanX;
  const by = cy + leanY;

  // Side-view tweak: when facing left/right, offset body slightly
  const side = dir === 'left' || dir === 'right';

  // legs (animated stride)
  ctx.fillStyle = c.pants;
  if (dir === 'left' || dir === 'right') {
    // depth order: far leg first
    const front = dir === 'right' ? 1 : -1;
    ctx.fillRect(bx - 3 + front * -4, by + 6 + legL * 0.3, 6, 11 + Math.abs(legL) * 0.3);
    ctx.fillRect(bx - 3 + front * 3, by + 6 + legR * 0.3, 6, 11 + Math.abs(legR) * 0.3);
    ctx.fillStyle = c.shoe;
    ctx.fillRect(bx - 4 + front * -4 + (dir === 'right' ? legL : -legL) * 0.4, by + 15, 8, 4);
    ctx.fillRect(bx - 4 + front * 3 + (dir === 'right' ? legR : -legR) * 0.4, by + 15, 8, 4);
  } else {
    ctx.fillRect(bx - 8, by + 6 + (legL > 0 ? 0 : -legL * 0.15), 6, 10 + Math.max(0, legL));
    ctx.fillRect(bx + 2, by + 6 + (legR > 0 ? 0 : -legR * 0.15), 6, 10 + Math.max(0, legR));
    ctx.fillStyle = c.shoe;
    ctx.fillRect(bx - 9, by + 14 + Math.max(0, legL) * 0.3, 8, 4);
    ctx.fillRect(bx + 1, by + 14 + Math.max(0, legR) * 0.3, 8, 4);
  }

  // body
  ctx.fillStyle = c.shirt;
  ctx.fillRect(bx - 10, by - 4, 20, 14);

  // arms (swing opposite legs)
  ctx.fillStyle = c.skin;
  if (side) {
    const front = dir === 'right' ? 1 : -1;
    // back arm
    ctx.fillRect(bx - 2 + front * -11, by - 2 + armL, 4, 10);
    // front arm
    ctx.fillRect(bx - 2 + front * 9, by - 2 + armR, 4, 10);
  } else {
    ctx.fillRect(bx - 13, by - 2 + armL, 4, 10);
    ctx.fillRect(bx + 9, by - 2 + armR, 4, 10);
  }

  // head
  ctx.fillStyle = c.skin;
  ctx.fillRect(bx - 8, by - 16, 16, 14);

  // hat / hair
  ctx.fillStyle = c.hat;
  ctx.fillRect(bx - 10, by - 20, 20, 8);
  ctx.fillRect(bx - 8, by - 24, 16, 6);
  if (c.hatBand) {
    ctx.fillStyle = c.hatBand;
    ctx.fillRect(bx - 10, by - 14, 20, 3);
  }

  // face / back
  if (dir !== 'up') {
    ctx.fillStyle = '#222';
    if (dir === 'left') {
      ctx.fillRect(bx - 6, by - 12, 3, 3);
    } else if (dir === 'right') {
      ctx.fillRect(bx + 3, by - 12, 3, 3);
    } else {
      ctx.fillRect(bx - 5, by - 12, 3, 3);
      ctx.fillRect(bx + 2, by - 12, 3, 3);
    }
    if (role === 'nurse') {
      ctx.fillStyle = '#e3350d';
      ctx.fillRect(bx - 1, by - 23, 2, 6);
      ctx.fillRect(bx - 3, by - 21, 6, 2);
    }
  } else {
    ctx.fillStyle = c.hat;
    ctx.fillRect(bx - 8, by - 16, 16, 6);
  }

  // player accent (belt / bag)
  if (role === 'player') {
    ctx.fillStyle = '#ffcb05';
    ctx.fillRect(bx - 10, by + 6, 20, 2);
    ctx.fillStyle = '#c9a000';
    if (dir === 'left') ctx.fillRect(bx - 14, by, 5, 8);
    else if (dir === 'right') ctx.fillRect(bx + 9, by, 5, 8);
    else ctx.fillRect(bx + 9, by, 5, 8);

    // Motion dash lines when moving
    if (moving && !ghost) {
      ctx.strokeStyle = 'rgba(255,203,5,0.35)';
      ctx.lineWidth = 1.5;
      const mx = dir === 'right' ? -14 : dir === 'left' ? 14 : 0;
      const my = dir === 'down' ? -12 : dir === 'up' ? 12 : 0;
      for (let i = 0; i < 3; i++) {
        const o = (i - 1) * 5 + swing * 2;
        ctx.beginPath();
        if (dir === 'left' || dir === 'right') {
          ctx.moveTo(bx + mx, by - 8 + o);
          ctx.lineTo(bx + mx + (dir === 'right' ? -8 : 8), by - 8 + o);
        } else {
          ctx.moveTo(bx - 8 + o, by + my);
          ctx.lineTo(bx - 8 + o, by + my + (dir === 'down' ? -8 : 8));
        }
        ctx.stroke();
      }
    }
  }
}

function drawTile(ctx, tile, sx, sy, tx, ty) {
  let color = TILE_COLORS[tile] ?? '#333';

  // Water — layered waves, no harsh grid
  if (tile === TILE.WATER) {
    const wave = Math.sin(Game.waterPhase * 2.2 + tx * 0.55 + ty * 0.35);
    const r = 42 + wave * 10;
    const g = 118 + wave * 8;
    const b = 198 + wave * 6;
    ctx.fillStyle = `rgb(${r|0},${g|0},${b|0})`;
    ctx.fillRect(sx, sy, TS, TS);
    // depth tint
    ctx.fillStyle = 'rgba(10,40,90,0.18)';
    ctx.fillRect(sx, sy + TS * 0.55, TS, TS * 0.45);
    // foam highlights
    ctx.fillStyle = 'rgba(200,230,255,0.35)';
    const hy = sy + 10 + ((Math.sin(Game.waterPhase * 3 + tx) + 1) * 6);
    ctx.fillRect(sx + 6, hy, 14, 3);
    ctx.fillRect(sx + 26, hy + 8, 12, 2);
    return;
  }

  // Tall grass / forest floor
  if (tile === TILE.GRASS || tile === TILE.FOREST) {
    const base = tile === TILE.FOREST ? '#2a6a2e' : '#5a9e4a';
    ctx.fillStyle = base;
    ctx.fillRect(sx, sy, TS, TS);
    ctx.fillStyle = tile === TILE.FOREST ? 'rgba(15,50,20,0.35)' : 'rgba(40,90,35,0.22)';
    if ((tx + ty) % 2 === 0) ctx.fillRect(sx, sy, TS, TS);
    // Blender tall-grass tuft (sparse overlay) + procedural blades
    const gFrame = Math.floor(Game.animTick * 2 + tx * 0.3) % 2;
    if (tile === TILE.GRASS && (tx + ty) % 3 === 0) {
      drawPropSprite(ctx, sx, sy + 4, `tallgrass_idle_${gFrame}`, 0.75);
    }
    ctx.fillStyle = tile === TILE.FOREST ? '#1a4a22' : '#3d7a38';
    for (let i = 0; i < 6; i++) {
      const gx = sx + 4 + i * 8;
      const gh = 12 + ((tx * 3 + ty * 5 + i * 7) % 4) * 3;
      const sway = Math.sin(Game.animTick * 3 + tx + i) * 1.2;
      ctx.fillRect(gx + sway, sy + TS - gh - 2, 3, gh);
      ctx.fillStyle = tile === TILE.FOREST ? '#2d7a38' : '#6bc45a';
      ctx.fillRect(gx + sway + 1, sy + TS - gh - 2, 1, gh * 0.6);
      ctx.fillStyle = tile === TILE.FOREST ? '#1a4a22' : '#3d7a38';
    }
    if (tile === TILE.FOREST) {
      ctx.fillStyle = '#1e5a28';
      ctx.beginPath();
      ctx.arc(sx + 12, sy + 14, 8, 0, Math.PI * 2);
      ctx.arc(sx + 28, sy + 18, 10, 0, Math.PI * 2);
      ctx.arc(sx + 20, sy + 10, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  ctx.fillStyle = color;
  ctx.fillRect(sx, sy, TS, TS);

  // Subtle tile edge (softer than full grid)
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.strokeRect(sx + 0.5, sy + 0.5, TS - 1, TS - 1);

  // Path texture
  if (tile === TILE.PATH) {
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    if ((tx + ty) % 2 === 0) {
      ctx.fillRect(sx + 8, sy + 8, 4, 4);
      ctx.fillRect(sx + TS - 14, sy + TS - 14, 4, 4);
    } else {
      ctx.fillRect(sx + 20, sy + 16, 3, 3);
    }
    // path highlight edge
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(sx, sy, TS, 2);
  }

  // Tree — Blender sprite when available (sparse: every other to reduce clutter)
  if (tile === TILE.TREE) {
    ctx.fillStyle = '#163820';
    ctx.fillRect(sx, sy, TS, TS);
    const treeFrame = Math.floor(Game.animTick * 0.8 + tx + ty) % 2;
    if ((tx + ty) % 2 === 0 && drawPropSprite(ctx, sx, sy - 8, `tree_idle_${treeFrame}`, 1.35)) {
      // sprite drawn
    } else {
      // fallback foliage
      ctx.fillStyle = '#5c3a1e';
      ctx.fillRect(sx + TS / 2 - 5, sy + 28, 10, 16);
      ctx.fillStyle = '#1a5c28';
      ctx.beginPath();
      ctx.arc(sx + TS / 2, sy + 18, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#247a34';
      ctx.beginPath();
      ctx.arc(sx + TS / 2 - 6, sy + 14, 10, 0, Math.PI * 2);
      ctx.arc(sx + TS / 2 + 7, sy + 16, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Rock wall
  if (tile === TILE.ROCK) {
    ctx.fillStyle = '#4a4a5c';
    ctx.fillRect(sx, sy, TS, TS);
    ctx.fillStyle = '#6a6a7e';
    ctx.fillRect(sx + 4, sy + 4, TS - 8, TS - 8);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(sx + 6, sy + 6, TS - 16, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(sx + 8, sy + 20, 12, 8);
    ctx.fillRect(sx + 28, sy + 10, 10, 10);
    ctx.fillRect(sx + 14, sy + 32, 16, 6);
  }

  // Cave
  if (tile === TILE.CAVE) {
    ctx.fillStyle = '#1e1e2a';
    ctx.fillRect(sx, sy, TS, TS);
    // Cave mouth sprite on cave entrance tiles near map edge / sparse
    if ((tx + ty) % 4 === 0) {
      drawPropSprite(ctx, sx, sy - 4, 'cave', 1.25);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      if ((tx * 3 + ty * 7) % 5 === 0) ctx.fillRect(sx + 10, sy + 14, 6, 4);
      ctx.fillStyle = 'rgba(80,40,120,0.08)';
      ctx.fillRect(sx, sy, TS, TS);
    }
  }

  // Flower meadow
  if (tile === TILE.FLOWER) {
    ctx.fillStyle = '#5aab52';
    ctx.fillRect(sx, sy, TS, TS);
    const fFrame = Math.floor(Game.animTick * 1.2 + tx) % 2;
    if (!drawPropSprite(ctx, sx, sy, `flowers_idle_${fFrame}`, 0.95)) {
      const petals = ['#ff8ec8', '#ffcb05', '#c48cff', '#ff6b6b'];
      for (let i = 0; i < 3; i++) {
        const fx = sx + 10 + i * 14 + ((tx + i) % 2) * 4;
        const fy = sy + 14 + ((ty + i) % 3) * 10;
        ctx.fillStyle = petals[(tx + ty + i) % petals.length];
        ctx.beginPath();
        ctx.arc(fx, fy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Heal pad — Blender red + pad
  if (tile === TILE.HEAL) {
    ctx.fillStyle = '#f8f0f0';
    ctx.fillRect(sx + 2, sy + 2, TS - 4, TS - 4);
    if (!drawPropSprite(ctx, sx, sy, 'heal_pad', 0.95)) {
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(sx + 6, sy + 6, TS - 12, TS - 12);
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx + TS / 2 - 3, sy + 14, 6, 20);
      ctx.fillRect(sx + 14, sy + TS / 2 - 3, 20, 6);
    }
  }

  // Door
  if (tile === TILE.DOOR) {
    ctx.fillStyle = '#3d2410';
    ctx.fillRect(sx + 8, sy + 4, TS - 16, TS - 4);
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(sx + 10, sy + 6, TS - 20, TS - 8);
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(sx + TS - 16, sy + TS / 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Building floor + simple roof/wall polish from neighbors
  if (tile === TILE.FLOOR) {
    const above = (ty > 0) ? WORLD_MAP[ty - 1][tx] : -1;
    const below = (ty < MAP_H - 1) ? WORLD_MAP[ty + 1][tx] : -1;
    const isRoofEdge = above !== TILE.FLOOR && above !== TILE.DOOR && above !== TILE.HEAL;
    const isPokemonCenter = (tx >= 5 && tx <= 8 && ty >= 9 && ty <= 11);
    const isMart = (tx >= 20 && tx <= 23 && ty >= 9 && ty <= 11);

    ctx.fillStyle = '#e8d5b0';
    ctx.fillRect(sx, sy, TS, TS);

    if (isRoofEdge) {
      // Colored roof band
      ctx.fillStyle = isPokemonCenter ? '#e85a7a' : isMart ? '#3b6fb0' : '#8b6914';
      ctx.fillRect(sx, sy, TS, 14);
      ctx.fillStyle = isPokemonCenter ? '#ff8aa0' : isMart ? '#5a9ad9' : '#a67c2a';
      ctx.fillRect(sx, sy, TS, 5);
      // eaves shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(sx, sy + 14, TS, 3);
    } else {
      // interior floor tiles
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.strokeRect(sx + 1, sy + 1, TS - 2, TS - 2);
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      ctx.fillRect(sx + 4, sy + 4, TS - 8, TS - 8);
    }

    // Outer wall tint when next to non-building
    if (below !== TILE.FLOOR && below !== TILE.DOOR && below !== TILE.HEAL) {
      ctx.fillStyle = 'rgba(90, 70, 40, 0.2)';
      ctx.fillRect(sx, sy + TS - 6, TS, 6);
    }
  }

  // Sand
  if (tile === TILE.SAND) {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(sx + 12, sy + 20, 3, 3);
    ctx.fillRect(sx + 28, sy + 10, 2, 2);
    ctx.fillRect(sx + 18, sy + 32, 2, 2);
  }
}

// ---------- Pokémon Center / Healing ----------
function partyNeedsHealing(party) {
  if (!party || !party.length) return false;
  return party.some((mon) => {
    if (mon.hp < mon.maxHp) return true;
    if (mon.status) return true;
    if (mon.moves && mon.moves.some((m) => m.pp < m.maxPp)) return true;
    return false;
  });
}

function spawnHealSparkles() {
  const cx = Game.player.px + TS / 2;
  const cy = Game.player.py + TS / 2;
  for (let i = 0; i < 16; i++) {
    Game.fx.trails.push({
      kind: 'spark',
      x: cx + (Math.random() - 0.5) * 28,
      y: cy + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 40,
      vy: -50 - Math.random() * 50,
      life: 0.6 + Math.random() * 0.35,
      maxLife: 0.9,
      size: 3 + Math.random() * 4,
      color: Math.random() > 0.5 ? '#ff8aa0' : Math.random() > 0.5 ? '#fff' : '#7CFC00',
      gravity: 35,
    });
  }
}

/** Classic Nurse Joy sequence: dialogue → heal → thank-you */
function startNurseHeal(npc) {
  const name = npc.name || 'Nurse Joy';

  if (!partyNeedsHealing(Game.party)) {
    startDialogue([
      `${name}: Welcome to the Pokémon Center!`,
      `${name}: Your Pokémon are already in perfect health.`,
      `${name}: We hope to see you again!`,
    ]);
    return;
  }

  startDialogue(
    [
      `${name}: Welcome to the Pokémon Center!`,
      `${name}: I'll take your Pokémon for a few seconds.`,
    ],
    () => {
      // Brief machine pause (input locked via state 'healing')
      Game.state = 'healing';
      const box = document.getElementById('dialogue');
      box.classList.add('visible');
      document.getElementById('dialogue-text').textContent =
        `${name}: *healing machine whirrs...*`;
      const cont = document.querySelector('.dialogue-continue');
      if (cont) cont.style.visibility = 'hidden';
      spawnHealSparkles();

      setTimeout(() => {
        healParty(Game.party);
        sfx('heal');
        updateHUD();
        spawnHealSparkles();
        showToast('Your Pokémon were fully healed!');
        if (cont) cont.style.visibility = '';
        startDialogue([
          `${name}: Thank you for waiting!`,
          `${name}: We've restored your Pokémon to full health.`,
          `${name}: We hope to see you again!`,
        ]);
      }, 1200);
    }
  );
}

// ---------- Dialogue ----------
function startDialogue(lines, cb) {
  Game.dialogueQueue = lines;
  Game.dialogueIndex = 0;
  Game.dialogueCallback = cb || null;
  Game.state = 'dialogue';
  const box = document.getElementById('dialogue');
  box.classList.add('visible');
  document.getElementById('dialogue-text').textContent = lines[0] || '';
}

function advanceDialogue() {
  Game.dialogueIndex++;
  if (Game.dialogueIndex >= Game.dialogueQueue.length) {
    document.getElementById('dialogue').classList.remove('visible');
    Game.state = 'overworld';
    // Brief lock so the same E/A press that closed dialogue doesn't re-trigger interact
    Game.encounterCooldown = Math.max(Game.encounterCooldown, 0.25);
    Game._interactLockUntil = performance.now() + 400;
    const cb = Game.dialogueCallback;
    Game.dialogueCallback = null;
    if (cb) cb();
    return;
  }
  document.getElementById('dialogue-text').textContent = Game.dialogueQueue[Game.dialogueIndex];
}

// ---------- HUD / Menus ----------
function updateHUD() {
  const alive = Game.party.filter((m) => m.hp > 0).length;
  document.getElementById('hud-party').textContent = `${alive}/${Game.party.length}`;
  document.getElementById('hud-balls').textContent = Game.bag.pokeball;
  document.getElementById('hud-potions').textContent = Game.bag.potion;
  document.getElementById('hud-caught').textContent = `${Game.flags.caughtSpecies.size}/6`;
  document.getElementById('hud-battles').textContent = Game.battlesWon;

  // Lead HP + mini sprite
  const lead = Game.party[firstAlive(Game.party)] || Game.party[0];
  if (lead) {
    const leadEl = document.getElementById('hud-lead');
    leadEl.innerHTML = `<img class="hud-mini${lead.shiny ? ' shiny-sprite' : ''}" src="${lead.sprite}" alt="" /> ${lead.name} Lv${lead.level}${lead.shiny ? ' ✨' : ''}`;
    const pct = Math.round((lead.hp / lead.maxHp) * 100);
    document.getElementById('hud-hp').textContent = `${lead.hp}/${lead.maxHp}`;
    const bar = document.getElementById('hud-hp-bar');
    if (bar) {
      bar.style.width = pct + '%';
      bar.className = 'hp-bar' + (pct <= 20 ? ' low' : pct <= 50 ? ' mid' : '');
    }
  }

  checkWinCondition();
}

function openPartyMenu() {
  if (Game.state !== 'overworld') return;
  const list = document.getElementById('party-list');
  list.innerHTML = '';
  Game.party.forEach((mon, idx) => {
    const pct = Math.round((mon.hp / mon.maxHp) * 100);
    const art = mon.spriteAni || mon.sprite;
    const isLead = idx === 0;
    const fainted = mon.hp <= 0;
    const div = document.createElement('div');
    div.className = 'party-card' + (isLead ? ' is-lead' : '') + (fainted ? ' is-fainted' : '');
    div.setAttribute('role', 'button');
    div.tabIndex = 0;
    div.innerHTML = `
      <div class="party-sprite-wrap">
        <img class="sprite-img${mon.shiny ? ' shiny-sprite' : ''}" src="${art}" alt="${mon.name}" width="72" height="72" />
      </div>
      <div class="info">
        <h4>${mon.name} <span style="color:var(--accent)">Lv${mon.level}</span>
          ${isLead ? '<span class="lead-badge">LEAD</span>' : ''}
          ${mon.shiny ? '<span class="shiny-badge">✨ SHINY</span>' : ''}</h4>
        <div class="meta">${mon.types.map((t) => `<span class="type-badge type-${t}">${t}</span>`).join(' ')}
          ${mon.status ? ` · ${mon.status}` : ''}${fainted ? ' · FAINTED' : ''}</div>
        <div class="hp-bar-bg"><div class="hp-bar ${pct <= 20 ? 'low' : pct <= 50 ? 'mid' : ''}" style="width:${pct}%"></div></div>
        <div class="meta" style="margin-top:4px">HP ${mon.hp}/${mon.maxHp} · EXP ${mon.exp}/${mon.expToNext}</div>
        ${!isLead && !fainted ? '<div class="meta party-hint">Click to set as lead</div>' : ''}
      </div>
    `;
    if (!isLead && !fainted) {
      div.addEventListener('click', () => setPartyLead(idx));
      div.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setPartyLead(idx);
        }
      });
    }
    list.appendChild(div);
  });
  document.getElementById('party-panel').classList.add('visible');
  Game.state = 'menu';
}

function setPartyLead(index) {
  if (index <= 0 || index >= Game.party.length) return;
  const mon = Game.party[index];
  if (mon.hp <= 0) {
    showToast("Can't lead with a fainted Pokémon!");
    return;
  }
  Game.party.splice(index, 1);
  Game.party.unshift(mon);
  updateHUD();
  showToast(`${mon.name} is now your lead!`);
  openPartyMenu(); // refresh list
}

function openBagMenu() {
  if (Game.state !== 'overworld') return;
  const list = document.getElementById('bag-list');
  list.innerHTML = `
    <div class="bag-item">
      <span class="bag-icon-row"><img src="assets/ui/pokeball.png" alt="" width="24" height="24" /> Poké Ball</span>
      <span class="count">×${Game.bag.pokeball}</span>
    </div>
    <button type="button" class="bag-item bag-action" id="bag-use-potion" ${Game.bag.potion <= 0 ? 'disabled' : ''}>
      <span class="bag-icon-row"><img src="assets/ui/potion.png" alt="" width="24" height="24" /> Potion (+20 HP)</span>
      <span class="count">×${Game.bag.potion}</span>
    </button>
    <div class="bag-item">
      <span class="bag-icon-row"><img src="assets/ui/greatball.png" alt="" width="24" height="24" /> Super Ball</span>
      <span class="count">×${Game.bag.superball}</span>
    </div>
    <p class="bag-hint">Click Potion to heal your lead. Super Balls auto-use in battle when available. Press P to save.</p>
    <p class="bag-hint shiny-stat">✨ Shiny Pokémon caught: ${Game.flags.shinyCatches || 0}</p>
  `;
  document.getElementById('bag-use-potion')?.addEventListener('click', () => {
    usePotionOnLead();
    openBagMenu();
  });
  document.getElementById('bag-panel').classList.add('visible');
  Game.state = 'menu';
}

function usePotionOnLead() {
  if (Game.bag.potion <= 0) {
    showToast('No Potions left!');
    return;
  }
  const lead = Game.party[0];
  if (!lead) return;
  if (lead.hp <= 0) {
    showToast("Can't heal a fainted Pokémon here — visit the Center!");
    return;
  }
  if (lead.hp >= lead.maxHp) {
    showToast(`${lead.name}'s HP is already full!`);
    return;
  }
  Game.bag.potion--;
  const before = lead.hp;
  lead.hp = Math.min(lead.maxHp, lead.hp + 20);
  updateHUD();
  showToast(`${lead.name} recovered ${lead.hp - before} HP!`);
}

function closeMenus() {
  document.getElementById('party-panel').classList.remove('visible');
  document.getElementById('bag-panel').classList.remove('visible');
  if (Game.state === 'menu') Game.state = 'overworld';
}

function checkWinCondition() {
  if (Game.flags.mewtwoDefeated && Game.flags.caughtSpecies.size >= 6) {
    // already handled in battle end
  }
}

// ---------- Battle System ----------
function startBattle(wild, opts = {}) {
  Game.state = 'battle';
  Game.encounterCooldown = 1.5;

  const playerIdx = firstAlive(Game.party);
  if (playerIdx < 0) {
    // Shouldn't happen — black out
    blackOut();
    return;
  }

  // Reset stages
  Game.party.forEach((m) => {
    m.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    m._leech = false;
  });
  wild.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

  const isTrainer = !!opts.isTrainer;
  Game.battle = {
    wild,
    playerIdx,
    turn: 'player',
    busy: false,
    escaped: false,
    caught: false,
    isTrainer,
    trainerName: opts.trainerName || null,
    trainerId: opts.trainerId || null,
    enemyParty: opts.enemyParty || null,
    enemyIdx: opts.enemyIdx || 0,
    reward: opts.reward || null,
  };

  // Encounter flash
  const flash = document.getElementById('encounter-flash');
  if (flash) {
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 500);
  }

  showScreen('battle-screen');
  vfxClear();
  vfxInit();
  renderBattle();
  vfxEntrance('enemy');
  vfxEntrance('player');
  if (isTrainer) {
    setBattleLog(`${opts.trainerName} wants to battle!`);
    setTimeout(() => setBattleLog(`${opts.trainerName} sent out ${wild.name}!`), 700);
  } else {
    setBattleLog(`A wild ${wild.name} appeared!`);
  }
  showMainBattleMenu();

  // Shiny wild encounter: no separate pre-battle "encounter" screen exists in
  // this game (wild encounters jump straight into the battle screen), so the
  // sparkle callout plays right as the enemy sprite enters battle — covering
  // both "on encounter" and "on battle start" in a single moment.
  if (!isTrainer && wild.shiny) {
    vfxShinySparkle('enemy');
    showToast(`✨ A shiny ${wild.name} appeared!`);
    setTimeout(() => setBattleLog(`✨ Whoa! That ${wild.name} is shiny!!`), 900);
  }

  // Legendary fanfare
  if (SPECIES[wild.speciesId]?.legendary) {
    setBattleLog(`A legendary ${wild.name} appeared!`);
    vfxBanner('LEGENDARY!', 'crit');
  }
}

function startTrainerBattle(npc) {
  if (!npc?.trainer?.roster?.length) return;
  const enemyParty = buildTrainerParty(npc.trainer.roster);
  if (!enemyParty.length) return;
  const lead = enemyParty[0];
  startBattle(lead, {
    isTrainer: true,
    trainerName: npc.name,
    trainerId: npc.trainerId,
    enemyParty,
    enemyIdx: 0,
    reward: npc.trainer.reward || { pokeball: 2, potion: 1 },
  });
}

function setBattleSprite(imgId, mon, facing) {
  const img = document.getElementById(imgId);
  if (!img) return;
  // Prefer animated battle sprites; fall back to static
  const src =
    facing === 'back'
      ? mon.spriteAniBack || mon.spriteBack || mon.sprite
      : mon.spriteAni || mon.sprite;
  if (img.dataset.src !== src) {
    img.dataset.src = src;
    img.src = src;
  }
  img.alt = mon.name;
  img.style.opacity = mon.hp <= 0 ? '0' : '1';
  img.classList.remove('faint', 'hit', 'hit-super', 'hit-crit', 'attack', 'attack-enemy');
  img.classList.toggle('shiny-sprite', !!mon.shiny);
}

function setHpBar(who, hp, maxHp) {
  const pct = clamp(Math.round((hp / maxHp) * 100), 0, 100);
  const bar = document.getElementById(`${who}-hp-bar`);
  const text = document.getElementById(`${who}-hp-text`);
  bar.style.width = pct + '%';
  bar.className = 'hp-bar' + (pct <= 20 ? ' low' : pct <= 50 ? ' mid' : '');
  if (text) text.textContent = `${Math.max(0, hp)}/${maxHp}`;
}

function setBattleLog(msg) {
  document.getElementById('battle-log').textContent = msg;
}

function showMainBattleMenu() {
  document.getElementById('battle-menu-main').classList.remove('hidden');
  document.getElementById('battle-menu-moves').classList.add('hidden');
  document.getElementById('battle-menu-switch')?.classList.add('hidden');
  updateBattleActionButtons();
}

function showMovesMenu() {
  if (Game.battle?.busy) return;
  const player = Game.party[Game.battle.playerIdx];
  const menu = document.getElementById('moves-list');
  menu.innerHTML = '';

  player.moves.forEach((move, i) => {
    const btn = document.createElement('button');
    btn.className = 'move-btn';
    btn.innerHTML = `
      <span class="move-name">${move.name}</span>
      <span class="move-meta">
        <span class="type-badge type-${move.type}">${move.type}</span>
        PWR ${move.power || '—'} · PP ${move.pp}/${move.maxPp}
      </span>
    `;
    btn.disabled = move.pp <= 0;
    btn.addEventListener('click', () => playerUseMove(i));
    menu.appendChild(btn);
  });

  document.getElementById('battle-menu-main').classList.add('hidden');
  document.getElementById('battle-menu-moves').classList.remove('hidden');
  document.getElementById('battle-menu-switch')?.classList.add('hidden');
}

function showSwitchMenu() {
  if (Game.battle?.busy) return;
  const b = Game.battle;
  const indices = getSwitchableIndices(Game.party, b.playerIdx);
  if (!indices.length) {
    setBattleLog('No other Pokémon can battle!');
    return;
  }

  const list = document.getElementById('switch-list');
  if (!list) return;
  list.innerHTML = '';

  indices.forEach((idx) => {
    const mon = Game.party[idx];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'switch-pick';
    btn.innerHTML = `
      <span class="move-name">${mon.name}</span>
      <span class="move-meta">Lv${mon.level} · HP ${mon.hp}/${mon.maxHp}</span>
    `;
    btn.addEventListener('click', () => playerSwitchTo(idx));
    list.appendChild(btn);
  });

  document.getElementById('battle-menu-main').classList.add('hidden');
  document.getElementById('battle-menu-moves').classList.add('hidden');
  document.getElementById('battle-menu-switch').classList.remove('hidden');
}

async function playerSwitchTo(targetIdx) {
  const b = Game.battle;
  if (!b || b.busy) return;
  const result = applyBattleSwitch(Game.party, b.playerIdx, targetIdx);
  if (!result.ok) {
    setBattleLog("Can't switch to that Pokémon!");
    return;
  }

  b.busy = true;
  showMainBattleMenu();
  setBattleLog(`${Game.party[b.playerIdx].name}, come back!`);
  await sleep(600);
  b.playerIdx = result.playerIdx;
  setBattleLog(`Go! ${result.mon.name}!`);
  renderBattle();
  vfxEntrance('player');
  await sleep(800);

  // Switching costs a turn — enemy attacks (unless trainer mon already down)
  const enemy = b.wild;
  if (enemy.hp > 0) {
    const enemyMove = pickEnemyMove(enemy);
    const player = Game.party[b.playerIdx];
    await executeMove(enemy, player, enemyMove, 'enemy');
    if (player.hp <= 0) {
      await onPlayerFainted();
      return;
    }
  }

  b.busy = false;
  renderBattle();
  setBattleLog('What will you do?');
}

function updateBattleActionButtons() {
  const b = Game.battle;
  if (!b) return;
  const switchBtn = document.getElementById('btn-switch');
  if (switchBtn) {
    const can = getSwitchableIndices(Game.party, b.playerIdx).length > 0;
    switchBtn.disabled = !can;
  }
  const catchBtn = document.getElementById('btn-catch');
  const runBtn = document.getElementById('btn-run');
  if (b.isTrainer) {
    if (catchBtn) {
      catchBtn.disabled = true;
      catchBtn.title = "Can't catch a trainer's Pokémon!";
    }
    if (runBtn) {
      runBtn.disabled = true;
      runBtn.title = "Can't run from a trainer battle!";
    }
  } else {
    if (catchBtn) catchBtn.title = '';
    if (runBtn) {
      runBtn.disabled = false;
      runBtn.title = '';
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function playerUseMove(moveIndex) {
  const b = Game.battle;
  if (!b || b.busy) return;
  b.busy = true;
  showMainBattleMenu();

  const player = Game.party[b.playerIdx];
  const wild = b.wild;
  const move = player.moves[moveIndex];

  // Speed order
  const pPri = move.priority || 0;
  // Enemy AI pick
  const enemyMove = pickEnemyMove(wild);

  const pSpe = getEffectiveStat(player, 'spe');
  const eSpe = getEffectiveStat(wild, 'spe');
  const playerFirst =
    pPri > (enemyMove.priority || 0) ||
    (pPri === (enemyMove.priority || 0) && pSpe >= eSpe);

  if (playerFirst) {
    await executeMove(player, wild, move, 'player');
    if (wild.hp <= 0) {
      await onWildFainted();
      return;
    }
    await executeMove(wild, player, enemyMove, 'enemy');
    if (player.hp <= 0) {
      await onPlayerFainted();
      return;
    }
  } else {
    await executeMove(wild, player, enemyMove, 'enemy');
    if (player.hp <= 0) {
      await onPlayerFainted();
      return;
    }
    await executeMove(player, wild, move, 'player');
    if (wild.hp <= 0) {
      await onWildFainted();
      return;
    }
  }

  // End-of-turn leech
  await applyEndTurnEffects();

  b.busy = false;
  renderBattle();
  setBattleLog('What will you do?');
}

function pickEnemyMove(wild) {
  const usable = wild.moves.filter((m) => m.pp > 0);
  if (usable.length === 0) {
    return { name: 'Struggle', type: 'normal', power: 50, accuracy: 100, pp: 1, maxPp: 1, cat: 'physical' };
  }
  // Prefer damaging moves
  const damageMoves = usable.filter((m) => m.power > 0);
  const pool = damageMoves.length ? damageMoves : usable;
  return pool[randInt(0, pool.length - 1)];
}

async function executeMove(user, target, move, side) {
  // Paralysis check
  if (user.status === 'paralyze' && Math.random() < 0.25) {
    setBattleLog(`${user.name} is paralyzed! It can't move!`);
    vfxStatusSparkle(side, 'paralyze');
    await sleep(900);
    return;
  }

  if (move.pp != null && move.pp > 0) move.pp--;

  setBattleLog(`${user.name} used ${move.name}!`);

  const result = calcDamage(user, target, move);

  // Play full VFX sequence (projectile + impact)
  await vfxPlayAttack(side, move, result);

  if (result.missed) {
    setBattleLog(`${user.name}'s attack missed!`);
    await sleep(500);
    return;
  }

  if (move.power > 0) {
    if (result.effectiveness === 0) {
      setBattleLog(`It doesn't affect ${target.name}...`);
      await sleep(500);
      return;
    }

    target.hp = Math.max(0, target.hp - result.damage);
    if (result.effectiveness > 1) sfx('super');
    else sfx('hit');
    // Update HP bars without resetting sprite animation classes mid-hit
    setHpBar(side === 'player' ? 'enemy' : 'player', target.hp, target.maxHp);
    if (side === 'enemy') {
      setHpBar('player', target.hp, target.maxHp);
    }
    // Also refresh player self HP text when player is target
    const b = Game.battle;
    if (b) {
      const player = Game.party[b.playerIdx];
      const wild = b.wild;
      setHpBar('player', player.hp, player.maxHp);
      setHpBar('enemy', wild.hp, wild.maxHp);
    }

    let msg = `It dealt ${result.damage} damage!`;
    if (result.critical) msg = 'A critical hit! ' + msg;
    if (result.effectiveness > 1) msg += " It's super effective!";
    if (result.effectiveness < 1 && result.effectiveness > 0) msg += " It's not very effective...";
    setBattleLog(msg);
    await sleep(550);

    if (move.effect === 'drain') {
      const heal = Math.max(1, Math.floor(result.damage / 2));
      user.hp = Math.min(user.maxHp, user.hp + heal);
      setBattleLog(`${user.name} restored ${heal} HP!`);
      vfxStatusSparkle(side, 'heal');
      renderBattle();
      await sleep(500);
    }
  } else {
    // Status move
    if (move.effect === 'heal_full') {
      vfxStatusSparkle(side, 'heal');
    } else {
      vfxStatusSparkle(side === 'player' ? 'enemy' : 'player', move.effect === 'paralyze' ? 'paralyze' : 'status');
    }
    const logs = [];
    applyStatusEffect(move, user, target, (m) => logs.push(m));
    if (logs.length) {
      setBattleLog(logs.join(' '));
      await sleep(700);
    } else if (move.name === 'Splash') {
      setBattleLog('But nothing happened!');
      await sleep(600);
    }
    renderBattle();
  }
}

async function applyEndTurnEffects() {
  const b = Game.battle;
  const player = Game.party[b.playerIdx];
  const wild = b.wild;

  for (const mon of [player, wild]) {
    if (mon._leech && mon.hp > 0) {
      const dmg = Math.max(1, Math.floor(mon.maxHp / 8));
      mon.hp = Math.max(0, mon.hp - dmg);
      const other = mon === player ? wild : player;
      other.hp = Math.min(other.maxHp, other.hp + dmg);
      setBattleLog(`${mon.name} is hurt by Leech Seed!`);
      renderBattle();
      await sleep(600);
    }
  }

  if (wild.hp <= 0) {
    await onWildFainted();
    return true;
  }
  if (player.hp <= 0) {
    await onPlayerFainted();
    return true;
  }
  return false;
}

async function onWildFainted() {
  const b = Game.battle;
  const wild = b.wild;
  const player = Game.party[b.playerIdx];

  sfx('faint');
  vfxFaint('enemy');
  if (b.isTrainer) {
    setBattleLog(`${b.trainerName}'s ${wild.name} fainted!`);
  } else {
    setBattleLog(`Wild ${wild.name} fainted!`);
  }
  await sleep(900);

  // EXP
  const expGain = Math.floor((wild.expYield * wild.level) / 5) + 5;
  const result = gainExp(player, expGain);
  let msg = `${player.name} gained ${expGain} EXP!`;
  if (result.leveled) {
    msg += ` ${player.name} grew to Lv${player.level}!`;
    showToast(`${player.name} reached Lv${player.level}!`);
  }
  setBattleLog(msg);
  await sleep(1200);

  // Trainer multi-mon: send next living Pokémon
  if (b.isTrainer && b.enemyParty) {
    const nextIdx = nextTrainerMonIndex(b.enemyParty, b.enemyIdx);
    if (nextIdx >= 0) {
      b.enemyIdx = nextIdx;
      const nextMon = b.enemyParty[nextIdx];
      nextMon.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
      nextMon._leech = false;
      b.wild = nextMon;
      setBattleLog(`${b.trainerName} sent out ${nextMon.name}!`);
      renderBattle();
      vfxEntrance('enemy');
      await sleep(900);
      b.busy = false;
      setBattleLog('What will you do?');
      return;
    }

    // All trainer mons defeated — reward + mark beaten
    Game.battlesWon++;
    if (b.trainerId) {
      if (!(Game.flags.trainersDefeated instanceof Set)) {
        Game.flags.trainersDefeated = new Set();
      }
      Game.flags.trainersDefeated.add(b.trainerId);
    }
    if (b.reward) {
      Game.bag = applyTrainerReward(Game.bag, b.reward);
      updateHUD();
      setBattleLog(`${b.trainerName}: You win! Here's ${formatRewardText(b.reward)}!`);
      showToast(`Reward: ${formatRewardText(b.reward)}`);
      await sleep(1200);
    } else {
      setBattleLog(`${b.trainerName} was defeated!`);
      await sleep(800);
    }
    endBattle(false);
    return;
  }

  Game.battlesWon++;

  // Check Mewtwo
  if (wild.speciesId === 'mewtwo') {
    Game.flags.mewtwoDefeated = true;
    showToast('You defeated Mewtwo!');
  }

  // Occasional item drop (wild only)
  const drop = Math.random();
  if (drop < 0.22) {
    Game.bag.pokeball += 1;
    setBattleLog('You found a Poké Ball!');
    await sleep(700);
  } else if (drop < 0.36) {
    Game.bag.potion += 1;
    setBattleLog('You found a Potion!');
    await sleep(700);
  } else if (drop < 0.44) {
    Game.bag.superball += 1;
    setBattleLog('You found a Super Ball!');
    showToast('Got a Super Ball!');
    await sleep(700);
  }

  endBattle(false);
}

async function onPlayerFainted() {
  const b = Game.battle;
  const player = Game.party[b.playerIdx];

  vfxFaint('player');
  setBattleLog(`${player.name} fainted!`);
  await sleep(900);

  const next = firstAlive(Game.party);
  if (next >= 0) {
    b.playerIdx = next;
    const mon = Game.party[next];
    mon.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    setBattleLog(`Go! ${mon.name}!`);
    renderBattle();
    vfxEntrance('player');
    await sleep(800);
    b.busy = false;
    setBattleLog('What will you do?');
  } else {
    setBattleLog('You blacked out...');
    await sleep(1200);
    blackOut();
  }
}

function blackOut() {
  healParty(Game.party);
  // Respawn at Pokémon Center heal pad
  Game.player.x = 7;
  Game.player.y = 10;
  Game.player.px = 7 * TS;
  Game.player.py = 10 * TS;
  Game.player.dir = 'down';
  Game.player.moving = false;
  Game.player.moveTarget = null;
  Game.battle = null;
  vfxClear();
  document.getElementById('catch-overlay')?.classList.remove('visible');
  showScreen('game-screen');
  Game.state = 'overworld';
  updateHUD();
  showToast('Returned to the Pokémon Center');
  startDialogue([
    'You blacked out...',
    'You woke up at the Pokémon Center.',
    'Your party was healed. Don\'t give up!',
  ]);
}

async function battleCatch() {
  const b = Game.battle;
  if (!b || b.busy) return;
  if (b.isTrainer) {
    setBattleLog("You can't catch another trainer's Pokémon!");
    return;
  }
  if (Game.bag.pokeball <= 0 && Game.bag.superball <= 0) {
    setBattleLog('No balls left!');
    return;
  }

  b.busy = true;

  // Prefer Super Ball when available (better catch rate)
  const useSuper = Game.bag.superball > 0;
  if (useSuper) Game.bag.superball--;
  else Game.bag.pokeball--;
  updateHUD();

  const wild = b.wild;
  const ballName = useSuper ? 'Super Ball' : 'Poké Ball';
  setBattleLog(`You threw a ${ballName} at ${wild.name}!`);

  // Harder for high HP / legendary; Super Ball multiplies catch rate
  let bonus = useSuper ? 1.6 : 1;
  if (wild.hp / wild.maxHp < 0.25) bonus *= 1.5;
  if (wild.hp / wild.maxHp < 0.1) bonus *= 1.35;
  if (SPECIES[wild.speciesId]?.legendary) bonus *= 0.3;

  const success = tryCatch(wild, bonus);
  await vfxCatchBall(success);

  if (success) {
    sfx('catch');
    setBattleLog(`Gotcha! ${wild.name} was caught!`);
    vfxBanner('Gotcha!', 'super');
    await sleep(800);

    Game.flags.caughtSpecies.add(wild.speciesId);
    if (wild.shiny) {
      Game.flags.shinyCatches = (Game.flags.shinyCatches || 0) + 1;
    }

    if (Game.party.length < 6) {
      const caught = createPokemon(wild.speciesId, wild.level, { shiny: wild.shiny });
      caught.hp = Math.max(1, wild.hp);
      Game.party.push(caught);
      setBattleLog(`${wild.name} joined your party!`);
    } else {
      setBattleLog(`${wild.name} was sent to the PC! (party full — species counted)`);
    }
    await sleep(1000);
    Game.battlesWon++;
    endBattle(true);
  } else {
    setBattleLog(`Oh no! ${wild.name} broke free!`);
    await sleep(800);

    // Enemy attacks after failed catch
    const player = Game.party[b.playerIdx];
    const enemyMove = pickEnemyMove(wild);
    await executeMove(wild, player, enemyMove, 'enemy');
    if (player.hp <= 0) {
      await onPlayerFainted();
      return;
    }
    b.busy = false;
    renderBattle();
    setBattleLog('What will you do?');
  }
}

async function battleUsePotion() {
  const b = Game.battle;
  if (!b || b.busy) return;
  if (Game.bag.potion <= 0) {
    setBattleLog('No Potions left!');
    return;
  }

  const player = Game.party[b.playerIdx];
  if (player.hp >= player.maxHp) {
    setBattleLog(`${player.name}'s HP is already full!`);
    return;
  }

  b.busy = true;
  Game.bag.potion--;
  const heal = 20;
  const before = player.hp;
  player.hp = Math.min(player.maxHp, player.hp + heal);
  setBattleLog(`You used a Potion! ${player.name} recovered ${player.hp - before} HP!`);
  vfxStatusSparkle('player', 'heal');
  renderBattle();
  updateHUD();
  await sleep(900);

  // Enemy turn
  const wild = b.wild;
  const enemyMove = pickEnemyMove(wild);
  await executeMove(wild, player, enemyMove, 'enemy');
  if (player.hp <= 0) {
    await onPlayerFainted();
    return;
  }

  b.busy = false;
  renderBattle();
  setBattleLog('What will you do?');
}

async function battleRun() {
  const b = Game.battle;
  if (!b || b.busy) return;
  if (b.isTrainer) {
    setBattleLog("There's no running from a trainer battle!");
    return;
  }
  b.busy = true;

  const player = Game.party[b.playerIdx];
  const wild = b.wild;

  // Can't always run from legendary
  const pSpe = getEffectiveStat(player, 'spe');
  const eSpe = getEffectiveStat(wild, 'spe');
  let chance = 0.5 + (pSpe - eSpe) / 200;
  if (SPECIES[wild.speciesId]?.legendary) chance *= 0.4;
  chance = clamp(chance, 0.15, 0.95);

  if (Math.random() < chance) {
    setBattleLog('Got away safely!');
    await sleep(800);
    endBattle(false);
  } else {
    setBattleLog("Can't escape!");
    await sleep(700);
    const enemyMove = pickEnemyMove(wild);
    await executeMove(wild, player, enemyMove, 'enemy');
    if (player.hp <= 0) {
      await onPlayerFainted();
      return;
    }
    b.busy = false;
    renderBattle();
    setBattleLog('What will you do?');
  }
}

function renderBattle() {
  const b = Game.battle;
  if (!b) return;
  const player = Game.party[b.playerIdx];
  const wild = b.wild;

  setBattleSprite('enemy-sprite', wild, 'front');
  const enemyLabel = b.isTrainer ? wild.name : wild.name;
  document.getElementById('enemy-name').textContent = enemyLabel;
  document.getElementById('enemy-level').textContent = `Lv${wild.level}`;
  setHpBar('enemy', wild.hp, wild.maxHp);

  setBattleSprite('player-sprite', player, 'back');
  document.getElementById('player-name').textContent = player.name;
  document.getElementById('player-level').textContent = `Lv${player.level}`;
  setHpBar('player', player.hp, player.maxHp);

  // Catch button: enabled if any ball remains (wild only)
  const hasBall = !b.isTrainer && (Game.bag.pokeball > 0 || Game.bag.superball > 0);
  document.getElementById('btn-catch').disabled = !hasBall;
  document.getElementById('btn-bag-battle').disabled = Game.bag.potion <= 0;

  // Label catch button with ball type preference
  const catchBtn = document.getElementById('btn-catch');
  if (catchBtn) {
    const label = b.isTrainer ? 'CATCH' : (Game.bag.superball > 0 ? 'SUPER' : 'CATCH');
    const icon = Game.bag.superball > 0 ? 'assets/ui/greatball.png' : 'assets/ui/pokeball.png';
    catchBtn.innerHTML = `<img class="btn-icon" src="${icon}" alt="" /> ${label}`;
  }

  updateBattleActionButtons();
}

function endBattle(caught) {
  Game.battle = null;
  vfxClear();
  const overlay = document.getElementById('catch-overlay');
  if (overlay) overlay.classList.remove('visible');
  const ball = document.getElementById('catch-ball-img');
  if (ball) ball.classList.remove('throw', 'wiggle', 'catch-success', 'catch-fail');
  const enemy = document.getElementById('enemy-sprite');
  if (enemy) enemy.style.opacity = '1';
  const player = document.getElementById('player-sprite');
  if (player) {
    player.style.opacity = '1';
    player.classList.remove('faint', 'hit', 'hit-super', 'hit-crit', 'attack', 'attack-enemy');
  }
  showScreen('game-screen');
  Game.state = 'overworld';
  Game.encounterCooldown = Math.max(Game.encounterCooldown, 1.2);
  updateCamera(0.05, false);
  updateHUD();

  if (Game.flags.mewtwoDefeated && Game.flags.caughtSpecies.size >= 6) {
    showEndScreen();
  } else if (Game.flags.mewtwoDefeated) {
    showToast(`Mewtwo defeated! Catch ${6 - Game.flags.caughtSpecies.size} more species to win!`);
  } else if (Game.flags.caughtSpecies.size >= 6 && !Game.flags.mewtwoDefeated) {
    showToast('6 species caught! Now find Mewtwo in the northern cave!');
  } else if (caught) {
    showToast('Pokémon caught!');
  }
}

function showEndScreen() {
  showScreen('end-screen');
  Game.state = 'end';
  document.getElementById('end-stats').textContent =
    `Species caught: ${Game.flags.caughtSpecies.size} · Battles won: ${Game.battlesWon} · Steps: ${Game.steps}`;
}

// Boot
document.addEventListener('DOMContentLoaded', init);
