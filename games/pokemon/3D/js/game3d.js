/**
 * Pokémon Adventure 3D — main engine (Three.js overworld + shared battle logic)
 */
import * as THREE from 'three';
import { World3D, TILE_SIZE, tileToWorld, createPlayerMesh, tileSurfaceY } from './world3d.js';
import { Battle3D } from './battle3d.js';

// ---- Bind global data helpers (from plain scripts on window) ----
function G(name) {
  const v = window[name];
  if (v === undefined) console.warn('Missing global:', name);
  return v;
}

const SPECIES = () => G('SPECIES');
const NPCS = () => G('NPCS');
const WORLD_MAP = () => G('WORLD_MAP');
const MAP_W = () => G('MAP_W');
const MAP_H = () => G('MAP_H');
const TILE = () => G('TILE');
const createPokemon = (...a) => G('createPokemon')(...a);
const calcDamage = (...a) => G('calcDamage')(...a);
const applyStatusEffect = (...a) => G('applyStatusEffect')(...a);
const gainExp = (...a) => G('gainExp')(...a);
const healParty = (...a) => G('healParty')(...a);
const firstAlive = (...a) => G('firstAlive')(...a);
const pickWildEncounter = (...a) => G('pickWildEncounter')(...a);
const tryCatch = (...a) => G('tryCatch')(...a);
const getEffectiveStat = (...a) => G('getEffectiveStat')(...a);
const getSwitchableIndices = (...a) => G('getSwitchableIndices')(...a);
const applyBattleSwitch = (...a) => G('applyBattleSwitch')(...a);
const buildTrainerParty = (...a) => G('buildTrainerParty')(...a);
const nextTrainerMonIndex = (...a) => G('nextTrainerMonIndex')(...a);
const applyTrainerReward = (...a) => G('applyTrainerReward')(...a);
const formatRewardText = (...a) => G('formatRewardText')(...a);
const serializeGameState = (...a) => G('serializeGameState')(...a);
const deserializeGameState = (...a) => G('deserializeGameState')(...a);
const hasValidSaveData = (...a) => G('hasValidSaveData')(...a);
const getZone = (...a) => G('getZone')(...a);
const isWalkable = (...a) => G('isWalkable')(...a);
const isEncounterTile = (...a) => G('isEncounterTile')(...a);
const clamp = (...a) => G('clamp')(...a);
const randInt = (...a) => G('randInt')(...a);

const SAVE_KEY = 'pokemon-adventure-save-v1-3d';

const Game = {
  state: 'title', // title | starter | overworld | dialogue | battle | menu | healing | end
  party: [],
  bag: { pokeball: 5, potion: 3, superball: 1 },
  flags: {
    shopGift: false,
    mewtwoDefeated: false,
    caughtSpecies: new Set(),
    trainersDefeated: new Set(),
  },
  steps: 0,
  battlesWon: 0,
  player: {
    x: 12, y: 12,
    dir: 'down',
    moving: false,
    moveT: 0,
    from: null,
    to: null,
    yaw: 0,
  },
  battle: null,
  dialogueQueue: [],
  dialogueIndex: 0,
  dialogueCallback: null,
  encounterCooldown: 0,
  healPadCooldown: 0,
  keys: {},
  camAngle: 0.65, // radians around player
  camPitch: 0.55,
  camDist: 9,
  dragging: false,
  lastMX: 0,
  lastMY: 0,
};

// ---- Three.js overworld ----
let renderer, scene, camera, world, playerMesh;
let clock = new THREE.Clock();
let battle3d = null;
let hemiLight, sunLight, fillLight;

// ---- Day/night cycle ----
const DAY_LENGTH = 150; // seconds per full day
// timeOfDay: 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
Game.timeOfDay = 0.35; // start mid-morning

const DAY_PHASES = [
  // t, sky, fog matches sky, sun color, sun intensity, hemi intensity
  { t: 0.0,  sky: 0x0a1230, sun: 0x8090c0, sunI: 0.12, hemiI: 0.25 }, // midnight
  { t: 0.22, sky: 0x2a3050, sun: 0xc0a080, sunI: 0.3,  hemiI: 0.4 },  // pre-dawn
  { t: 0.3,  sky: 0xf5b06b, sun: 0xffc080, sunI: 0.85, hemiI: 0.6 },  // sunrise
  { t: 0.42, sky: 0x87b8e0, sun: 0xfff2cc, sunI: 1.15, hemiI: 0.85 }, // day
  { t: 0.62, sky: 0x87b8e0, sun: 0xfff2cc, sunI: 1.15, hemiI: 0.85 }, // day
  { t: 0.75, sky: 0xf08a5a, sun: 0xffa060, sunI: 0.7,  hemiI: 0.55 }, // sunset
  { t: 0.85, sky: 0x1a2245, sun: 0x9098c8, sunI: 0.2,  hemiI: 0.3 },  // dusk
  { t: 1.0,  sky: 0x0a1230, sun: 0x8090c0, sunI: 0.12, hemiI: 0.25 }, // midnight
];

const _skyA = new THREE.Color();
const _skyB = new THREE.Color();
const _sunA = new THREE.Color();
const _sunB = new THREE.Color();

function updateDayNight(dt) {
  if (!scene || !sunLight) return;
  Game.timeOfDay = (Game.timeOfDay + dt / DAY_LENGTH) % 1;
  const tod = Game.timeOfDay;
  let a = DAY_PHASES[0];
  let b = DAY_PHASES[DAY_PHASES.length - 1];
  for (let i = 0; i < DAY_PHASES.length - 1; i++) {
    if (tod >= DAY_PHASES[i].t && tod <= DAY_PHASES[i + 1].t) {
      a = DAY_PHASES[i];
      b = DAY_PHASES[i + 1];
      break;
    }
  }
  const span = Math.max(0.0001, b.t - a.t);
  const k = (tod - a.t) / span;
  _skyA.setHex(a.sky);
  _skyB.setHex(b.sky);
  _skyA.lerp(_skyB, k);
  scene.background.copy(_skyA);
  scene.fog.color.copy(_skyA);
  _sunA.setHex(a.sun);
  _sunB.setHex(b.sun);
  _sunA.lerp(_sunB, k);
  sunLight.color.copy(_sunA);
  sunLight.intensity = a.sunI + (b.sunI - a.sunI) * k;
  hemiLight.intensity = a.hemiI + (b.hemiI - a.hemiI) * k;
  const night = 1 - Math.min(1, sunLight.intensity / 0.85);
  if (fillLight) fillLight.intensity = 0.25 + night * 0.15; // moonlight fill
  world?.setNight(night);
}

function setLoad(p) {
  const el = document.getElementById('load-fill');
  if (el) el.style.width = Math.round(p * 100) + '%';
}

async function init3D() {
  const canvas = document.getElementById('game-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth || 960, canvas.clientHeight || 600, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b8e0);
  scene.fog = new THREE.Fog(0x87b8e0, 28, 70);

  camera = new THREE.PerspectiveCamera(50, 16 / 10, 0.1, 200);

  // Lights (kept in module scope so the day/night cycle can drive them)
  hemiLight = new THREE.HemisphereLight(0xfff4e0, 0x3a5a28, 0.85);
  scene.add(hemiLight);
  sunLight = new THREE.DirectionalLight(0xfff2cc, 1.15);
  sunLight.position.set(30, 50, 20);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 120;
  sunLight.shadow.camera.left = -40;
  sunLight.shadow.camera.right = 40;
  sunLight.shadow.camera.top = 40;
  sunLight.shadow.camera.bottom = -40;
  scene.add(sunLight);

  // Soft fill
  fillLight = new THREE.DirectionalLight(0x88aaff, 0.25);
  fillLight.position.set(-20, 10, -10);
  scene.add(fillLight);

  world = new World3D(scene);
  setLoad(0.1);
  await world.loadModels((p) => setLoad(0.1 + p * 0.7));
  world.build();
  setLoad(0.9);

  playerMesh = createPlayerMesh(world);
  scene.add(playerMesh);
  snapPlayerToTile(12, 12);
  updateCamera(true);

  // Battle canvas setup (lazy start)
  const bcanvas = document.getElementById('battle-canvas');
  battle3d = new Battle3D(bcanvas);

  setLoad(1);
  document.getElementById('loading')?.classList.add('done');

  window.addEventListener('resize', onResize);
  requestAnimationFrame(loop);
}

function onResize() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas || !renderer) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w < 1 || h < 1) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  battle3d?.resize();
}

function playerGroundY(tx = Game.player.x, ty = Game.player.y) {
  return tileSurfaceY(tx, ty);
}

// ---- Footstep dust ----
const dustPuffs = [];
let dustGeo = null;
let dustMat = null;

function spawnDust(x, y, z) {
  if (!scene) return;
  if (!dustGeo) {
    dustGeo = new THREE.SphereGeometry(0.07, 6, 6);
    dustMat = new THREE.MeshBasicMaterial({ color: 0xd8cbaa, transparent: true, opacity: 0.55 });
  }
  for (let i = 0; i < 3; i++) {
    const puff = new THREE.Mesh(dustGeo, dustMat.clone());
    puff.position.set(x + (Math.random() - 0.5) * 0.35, y + 0.06, z + (Math.random() - 0.5) * 0.35);
    puff.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.6 + Math.random() * 0.4, (Math.random() - 0.5) * 0.5);
    puff.userData.life = 0.45;
    scene.add(puff);
    dustPuffs.push(puff);
  }
}

function updateDust(dt) {
  for (let i = dustPuffs.length - 1; i >= 0; i--) {
    const puff = dustPuffs[i];
    puff.userData.life -= dt;
    puff.position.addScaledVector(puff.userData.vel, dt);
    puff.userData.vel.y *= 0.92;
    const k = Math.max(0, puff.userData.life / 0.45);
    puff.material.opacity = 0.55 * k;
    puff.scale.setScalar(1 + (1 - k) * 1.6);
    if (puff.userData.life <= 0) {
      scene.remove(puff);
      puff.material.dispose();
      dustPuffs.splice(i, 1);
    }
  }
}

function snapPlayerToTile(tx, ty) {
  Game.player.x = tx;
  Game.player.y = ty;
  const p = tileToWorld(tx, ty);
  if (playerMesh) {
    playerMesh.position.set(p.x, playerGroundY(tx, ty), p.z);
    playerMesh.scale.set(1, 1, 1);
    playerMesh.rotation.z = 0;
  }
  Game.player.moving = false;
  Game.player.from = null;
  Game.player.to = null;
}

function dirToYaw(dir) {
  switch (dir) {
    case 'up': return Math.PI;
    case 'down': return 0;
    case 'left': return -Math.PI / 2;
    case 'right': return Math.PI / 2;
    default: return 0;
  }
}

function updateCamera(instant = false) {
  if (!playerMesh || !camera) return;
  const px = playerMesh.position.x;
  const pz = playerMesh.position.z;
  const dist = Game.camDist;
  const ang = Game.camAngle;
  const pitch = Game.camPitch;
  const cx = px + Math.sin(ang) * dist * Math.cos(pitch);
  const cy = 1.2 + Math.sin(pitch) * dist;
  const cz = pz + Math.cos(ang) * dist * Math.cos(pitch);
  if (instant) {
    camera.position.set(cx, cy, cz);
  } else {
    camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.12);
  }
  camera.lookAt(px, 1.1, pz);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  if (id === 'game-screen') {
    requestAnimationFrame(() => onResize());
  }
  if (id === 'battle-screen') {
    requestAnimationFrame(() => {
      battle3d?.resize();
      battle3d?.start();
    });
  } else {
    battle3d?.stop();
  }
}

function showToast(msg, ms = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('visible'), ms);
}

function updateHUD() {
  const alive = Game.party.filter((m) => m.hp > 0).length;
  document.getElementById('hud-party').textContent = `${alive}/${Game.party.length}`;
  document.getElementById('hud-balls').textContent = (Game.bag.pokeball || 0) + (Game.bag.superball || 0);
  document.getElementById('hud-potions').textContent = Game.bag.potion || 0;
  document.getElementById('hud-caught').textContent = `${Game.flags.caughtSpecies.size}/6`;
  document.getElementById('hud-battles').textContent = Game.battlesWon;
  const lead = Game.party[firstAlive(Game.party)] || Game.party[0];
  if (lead) {
    document.getElementById('hud-lead').textContent = lead.name;
    document.getElementById('hud-hp').textContent = `${lead.hp}/${lead.maxHp}`;
    const pct = clamp(Math.round((lead.hp / lead.maxHp) * 100), 0, 100);
    const bar = document.getElementById('hud-hp-bar');
    bar.style.width = pct + '%';
    bar.className = 'hp-bar' + (pct <= 20 ? ' low' : pct <= 50 ? ' mid' : '');
  }
  world?.updateMinimap(Game.player.x, Game.player.y);
}

// ---- Movement ----
function canWalk(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W() || ty >= MAP_H()) return false;
  const tile = WORLD_MAP()[ty][tx];
  if (!isWalkable(tile)) return false;
  if (NPCS().some((n) => n.x === tx && n.y === ty)) return false;
  return true;
}

function tryMove(dir) {
  if (Game.state !== 'overworld' || Game.player.moving) return;
  Game.player.dir = dir;
  if (playerMesh) playerMesh.rotation.y = dirToYaw(dir);

  let nx = Game.player.x;
  let ny = Game.player.y;
  if (dir === 'up') ny--;
  if (dir === 'down') ny++;
  if (dir === 'left') nx--;
  if (dir === 'right') nx++;
  if (!canWalk(nx, ny)) return;

  Game.player.moving = true;
  Game.player.moveT = 0;
  Game.player.from = { x: Game.player.x, y: Game.player.y };
  Game.player.to = { x: nx, y: ny };
  Game.player.x = nx;
  Game.player.y = ny;
}

function updateMove(dt) {
  if (!playerMesh) return;

  // Idle breathing when standing still — feet stay on tile surface
  if (!Game.player.moving) {
    const t = performance.now() / 1000;
    const baseY = playerGroundY();
    const breath = 1 + Math.sin(t * 2.4) * 0.025;
    playerMesh.scale.set(breath, 1 + Math.sin(t * 2.4 + 0.4) * 0.03, breath);
    playerMesh.position.y = baseY + Math.sin(t * 2.4) * 0.015;
    // Settle yaw lean
    const baseYaw = dirToYaw(Game.player.dir);
    playerMesh.rotation.y += (baseYaw - playerMesh.rotation.y) * 0.15;
    playerMesh.rotation.z *= 0.85;
    return;
  }

  Game.player.moveT += dt * 4.2; // tiles/sec
  const t = Math.min(1, Game.player.moveT);
  const a = tileToWorld(Game.player.from.x, Game.player.from.y);
  const b = tileToWorld(Game.player.to.x, Game.player.to.y);
  const y0 = playerGroundY(Game.player.from.x, Game.player.from.y);
  const y1 = playerGroundY(Game.player.to.x, Game.player.to.y);
  playerMesh.position.x = a.x + (b.x - a.x) * t;
  playerMesh.position.z = a.z + (b.z - a.z) * t;
  // Walk bob + step squash + slight lean — relative to ground surface
  const bob = Math.abs(Math.sin(t * Math.PI * 2)) * 0.08;
  playerMesh.position.y = y0 + (y1 - y0) * t + bob;
  const squash = 1 + Math.sin(t * Math.PI * 2) * 0.06;
  playerMesh.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
  const baseYaw = dirToYaw(Game.player.dir);
  playerMesh.rotation.y = baseYaw;
  playerMesh.rotation.z = Math.sin(t * Math.PI * 2) * 0.08;

  if (t >= 1) {
    Game.player.moving = false;
    playerMesh.position.y = y1;
    playerMesh.scale.set(1, 1, 1);
    playerMesh.rotation.z = 0;
    spawnDust(playerMesh.position.x, y1, playerMesh.position.z);
    onStepComplete();
  }
}

function onStepComplete() {
  Game.steps++;
  updateHUD();
  const tile = WORLD_MAP()[Game.player.y][Game.player.x];
  const T = TILE();

  // Heal pad
  if (tile === T.HEAL && Game.healPadCooldown <= 0) {
    if (partyNeedsHealing(Game.party)) {
      healParty(Game.party);
      Game.healPadCooldown = 3;
      showToast('Your party was healed!');
      updateHUD();
    }
  }

  if (Game.encounterCooldown > 0) return;
  if (isEncounterTile(tile)) {
    // Slightly higher rates so grass walks reliably find wilds in playtests
    const chance = tile === T.FOREST ? 0.24 : tile === T.CAVE ? 0.18 : tile === T.FLOWER ? 0.16 : 0.18;
    if (Math.random() < chance) {
      const zone = getZone(Game.player.x, Game.player.y);
      const wild = pickWildEncounter(zone);
      startBattle(wild);
    }
  }
}

function partyNeedsHealing(party) {
  return party.some((m) => m.hp < m.maxHp || m.status || m.moves.some((mv) => mv.pp < mv.maxPp));
}

// ---- Interact / Dialogue ----
function interact() {
  if (Game.state !== 'overworld') return;
  let tx = Game.player.x;
  let ty = Game.player.y;
  const d = Game.player.dir;
  if (d === 'up') ty--;
  if (d === 'down') ty++;
  if (d === 'left') tx--;
  if (d === 'right') tx++;

  const npc = NPCS().find((n) => n.x === tx && n.y === ty);
  if (!npc) {
    if (tx >= 0 && ty >= 0 && ty < MAP_H() && tx < MAP_W()) {
      const tile = WORLD_MAP()[ty][tx];
      const T = TILE();
      if (tile === T.WATER) startDialogue(['The water sparkles in 3D. Magikarp might be swimming…']);
      else if (tile === T.TREE) startDialogue(['A sturdy tree blocks the way.']);
    }
    return;
  }

  // Face NPC
  const mesh = world.npcMeshes.find((m) => m.userData.npc === npc);
  if (mesh && playerMesh) {
    world.faceNpcToward(mesh, playerMesh.position.x, playerMesh.position.z);
  }

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
  if (npc.trainer && npc.trainerId) {
    const beaten = Game.flags.trainersDefeated?.has(npc.trainerId);
    if (beaten) {
      startDialogue((npc.dialogueRematch || npc.dialogueAfterWin || npc.dialogue)
        .map((l) => `${npc.name}: ${l}`));
      return;
    }
    startDialogue((npc.dialogue || []).map((l) => `${npc.name}: ${l}`), () => startTrainerBattle(npc));
    return;
  }
  startDialogue(npc.dialogue.map((l) => `${npc.name}: ${l}`));
}

function startDialogue(lines, cb = null) {
  Game.dialogueQueue = lines;
  Game.dialogueIndex = 0;
  Game.dialogueCallback = cb;
  Game.state = 'dialogue';
  const box = document.getElementById('dialogue');
  box.classList.add('visible');
  document.getElementById('dialogue-text').textContent = lines[0] || '';
}

function advanceDialogue() {
  Game.dialogueIndex++;
  if (Game.dialogueIndex >= Game.dialogueQueue.length) {
    document.getElementById('dialogue').classList.remove('visible');
    const cb = Game.dialogueCallback;
    Game.dialogueCallback = null;
    Game.state = 'overworld';
    if (cb) cb();
    return;
  }
  document.getElementById('dialogue-text').textContent = Game.dialogueQueue[Game.dialogueIndex];
}

function startNurseHeal(npc) {
  if (!partyNeedsHealing(Game.party)) {
    startDialogue([`${npc.name}: Your Pokémon are already in peak condition!`]);
    return;
  }
  Game.state = 'healing';
  startDialogue([
    `${npc.name}: Welcome to the Pokémon Center!`,
    `${npc.name}: I'll take your Pokémon for a few seconds.`,
  ], () => {
    healParty(Game.party);
    updateHUD();
    showToast('Your Pokémon were fully healed!');
    startDialogue([`${npc.name}: All better! We hope to see you again!`], () => {
      Game.state = 'overworld';
    });
  });
}

// ---- Battle (logic shared with 2D; presentation via Battle3D + HTML) ----
function startBattle(wild, opts = {}) {
  Game.state = 'battle';
  Game.encounterCooldown = 1.5;
  const playerIdx = firstAlive(Game.party);
  if (playerIdx < 0) {
    blackOut();
    return;
  }
  Game.party.forEach((m) => {
    m.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    m._leech = false;
  });
  wild.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

  Game.battle = {
    wild,
    playerIdx,
    busy: false,
    isTrainer: !!opts.isTrainer,
    trainerName: opts.trainerName || null,
    trainerId: opts.trainerId || null,
    enemyParty: opts.enemyParty || null,
    enemyIdx: opts.enemyIdx || 0,
    reward: opts.reward || null,
  };

  document.getElementById('encounter-flash')?.classList.add('active');
  setTimeout(() => document.getElementById('encounter-flash')?.classList.remove('active'), 450);

  showScreen('battle-screen');
  const player = Game.party[playerIdx];
  battle3d?.setFighters(player, wild).then(() => battle3d?.start());
  resetHpBar('enemy', wild.hp, wild.maxHp);
  resetHpBar('player', player.hp, player.maxHp);
  renderBattle();
  if (opts.isTrainer) {
    setBattleLog(`${opts.trainerName} wants to battle!`);
    setTimeout(() => setBattleLog(`${opts.trainerName} sent out ${wild.name}!`), 700);
  } else {
    setBattleLog(`A wild ${wild.name} appeared!`);
  }
  showMainBattleMenu();
}

function startTrainerBattle(npc) {
  if (!npc?.trainer?.roster?.length) return;
  const enemyParty = buildTrainerParty(npc.trainer.roster);
  startBattle(enemyParty[0], {
    isTrainer: true,
    trainerName: npc.name,
    trainerId: npc.trainerId,
    enemyParty,
    enemyIdx: 0,
    reward: npc.trainer.reward || { pokeball: 2, potion: 1 },
  });
}

function setBattleLog(msg) {
  document.getElementById('battle-log').textContent = msg;
}

// Smoothly drain/refill battle HP bars instead of snapping
const hpTweens = {};

function setHpBar(who, hp, maxHp) {
  const bar = document.getElementById(`${who}-hp-bar`);
  const text = document.getElementById(`${who}-hp-text`);
  const target = clamp(hp, 0, maxHp);
  const tween = hpTweens[who] || (hpTweens[who] = { shown: target, raf: null });
  if (tween.raf) cancelAnimationFrame(tween.raf);

  const paint = (value) => {
    const pct = clamp(Math.round((value / maxHp) * 100), 0, 100);
    if (bar) {
      bar.style.width = pct + '%';
      bar.className = 'hp-bar' + (pct <= 20 ? ' low' : pct <= 50 ? ' mid' : '');
    }
    if (text) text.textContent = `${Math.max(0, Math.round(value))}/${maxHp}`;
  };

  const from = clamp(tween.shown, 0, maxHp);
  if (from === target) {
    paint(target);
    return;
  }
  const start = performance.now();
  const dur = 550;
  const step = (now) => {
    const k = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - k, 2);
    tween.shown = from + (target - from) * eased;
    paint(tween.shown);
    if (k < 1) tween.raf = requestAnimationFrame(step);
    else tween.raf = null;
  };
  tween.raf = requestAnimationFrame(step);
}

/** Snap HP bars instantly (battle start / fighter swap). */
function resetHpBar(who, hp, maxHp) {
  const tween = hpTweens[who];
  if (tween?.raf) cancelAnimationFrame(tween.raf);
  hpTweens[who] = { shown: clamp(hp, 0, maxHp), raf: null };
  setHpBar(who, hp, maxHp);
}

function renderBattle() {
  const b = Game.battle;
  if (!b) return;
  const player = Game.party[b.playerIdx];
  const wild = b.wild;
  document.getElementById('enemy-name').textContent = wild.name;
  document.getElementById('enemy-level').textContent = `Lv${wild.level}`;
  setHpBar('enemy', wild.hp, wild.maxHp);
  document.getElementById('player-name').textContent = player.name;
  document.getElementById('player-level').textContent = `Lv${player.level}`;
  setHpBar('player', player.hp, player.maxHp);

  const hasBall = !b.isTrainer && (Game.bag.pokeball > 0 || Game.bag.superball > 0);
  document.getElementById('btn-catch').disabled = !hasBall;
  document.getElementById('btn-bag-battle').disabled = Game.bag.potion <= 0;
  document.getElementById('btn-run').disabled = !!b.isTrainer;
  const switchBtn = document.getElementById('btn-switch');
  if (switchBtn) switchBtn.disabled = getSwitchableIndices(Game.party, b.playerIdx).length === 0;
}

function showMainBattleMenu() {
  document.getElementById('battle-menu-main').classList.remove('hidden');
  document.getElementById('battle-menu-moves').classList.add('hidden');
  document.getElementById('battle-menu-switch')?.classList.add('hidden');
  renderBattle();
}

function showMovesMenu() {
  if (Game.battle?.busy) return;
  const player = Game.party[Game.battle.playerIdx];
  const menu = document.getElementById('moves-list');
  menu.innerHTML = '';
  player.moves.forEach((move, i) => {
    const btn = document.createElement('button');
    btn.className = 'move-btn';
    btn.innerHTML = `<span class="move-name">${move.name}</span>
      <span class="move-meta"><span class="type-badge type-${move.type}">${move.type}</span>
      PWR ${move.power || '—'} · PP ${move.pp}/${move.maxPp}</span>`;
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
  const indices = getSwitchableIndices(Game.party, Game.battle.playerIdx);
  if (!indices.length) {
    setBattleLog('No other Pokémon can battle!');
    return;
  }
  const list = document.getElementById('switch-list');
  list.innerHTML = '';
  indices.forEach((idx) => {
    const mon = Game.party[idx];
    const btn = document.createElement('button');
    btn.className = 'switch-pick';
    btn.innerHTML = `<span class="move-name">${mon.name}</span>
      <span class="move-meta">Lv${mon.level} · HP ${mon.hp}/${mon.maxHp}</span>`;
    btn.addEventListener('click', () => playerSwitchTo(idx));
    list.appendChild(btn);
  });
  document.getElementById('battle-menu-main').classList.add('hidden');
  document.getElementById('battle-menu-moves').classList.add('hidden');
  document.getElementById('battle-menu-switch').classList.remove('hidden');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickEnemyMove(wild) {
  const usable = wild.moves.filter((m) => m.pp > 0);
  if (!usable.length) {
    return { name: 'Struggle', type: 'normal', power: 50, accuracy: 100, pp: 1, maxPp: 1, cat: 'physical' };
  }
  const dmg = usable.filter((m) => m.power > 0);
  const pool = dmg.length ? dmg : usable;
  return pool[randInt(0, pool.length - 1)];
}

async function executeMove(user, target, move, side) {
  if (user.status === 'paralyze' && Math.random() < 0.25) {
    setBattleLog(`${user.name} is paralyzed! It can't move!`);
    await sleep(900);
    return;
  }
  if (move.pp != null && move.pp > 0) move.pp--;
  setBattleLog(`${user.name} used ${move.name}!`);
  if (move.power > 0) battle3d?.attackLunge(side);
  await sleep(400);
  const result = calcDamage(user, target, move);
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
    const targetSide = side === 'player' ? 'enemy' : 'player';
    battle3d?.flashHit(targetSide);
    battle3d?.shakeCamera(result.critical ? 1 : result.effectiveness > 1 ? 0.7 : 0.45);
    battle3d?.showDamage(
      targetSide,
      `-${result.damage}`,
      result.critical ? 'crit' : result.effectiveness < 1 ? 'weak' : 'normal'
    );
    renderBattle();
    let msg = `It dealt ${result.damage} damage!`;
    if (result.critical) msg = 'A critical hit! ' + msg;
    if (result.effectiveness > 1) msg += " It's super effective!";
    if (result.effectiveness < 1 && result.effectiveness > 0) msg += " It's not very effective...";
    setBattleLog(msg);
    await sleep(550);
    if (move.effect === 'drain') {
      const heal = Math.max(1, Math.floor(result.damage / 2));
      user.hp = Math.min(user.maxHp, user.hp + heal);
      battle3d?.showDamage(side, `+${heal}`, 'heal');
      setBattleLog(`${user.name} restored ${heal} HP!`);
      renderBattle();
      await sleep(500);
    }
  } else {
    const logs = [];
    applyStatusEffect(move, user, target, (m) => logs.push(m));
    setBattleLog(logs.join(' ') || (move.name === 'Splash' ? 'But nothing happened!' : `${user.name} used ${move.name}!`));
    renderBattle();
    await sleep(700);
  }
}

async function playerUseMove(moveIndex) {
  const b = Game.battle;
  if (!b || b.busy) return;
  b.busy = true;
  showMainBattleMenu();
  const player = Game.party[b.playerIdx];
  const wild = b.wild;
  const move = player.moves[moveIndex];
  const enemyMove = pickEnemyMove(wild);
  const pPri = move.priority || 0;
  const ePri = enemyMove.priority || 0;
  const playerFirst =
    pPri > ePri || (pPri === ePri && getEffectiveStat(player, 'spe') >= getEffectiveStat(wild, 'spe'));

  if (playerFirst) {
    await executeMove(player, wild, move, 'player');
    if (wild.hp <= 0) { await onEnemyFainted(); return; }
    await executeMove(wild, player, enemyMove, 'enemy');
    if (player.hp <= 0) { await onPlayerFainted(); return; }
  } else {
    await executeMove(wild, player, enemyMove, 'enemy');
    if (player.hp <= 0) { await onPlayerFainted(); return; }
    await executeMove(player, wild, move, 'player');
    if (wild.hp <= 0) { await onEnemyFainted(); return; }
  }
  b.busy = false;
  renderBattle();
  setBattleLog('What will you do?');
}

async function playerSwitchTo(targetIdx) {
  const b = Game.battle;
  if (!b || b.busy) return;
  const result = applyBattleSwitch(Game.party, b.playerIdx, targetIdx);
  if (!result.ok) return;
  b.busy = true;
  showMainBattleMenu();
  setBattleLog(`${Game.party[b.playerIdx].name}, come back!`);
  await sleep(500);
  b.playerIdx = result.playerIdx;
  setBattleLog(`Go! ${result.mon.name}!`);
  await battle3d?.setFighters(result.mon, b.wild);
  resetHpBar('player', result.mon.hp, result.mon.maxHp);
  renderBattle();
  await sleep(700);
  if (b.wild.hp > 0) {
    const enemyMove = pickEnemyMove(b.wild);
    await executeMove(b.wild, result.mon, enemyMove, 'enemy');
    if (result.mon.hp <= 0) { await onPlayerFainted(); return; }
  }
  b.busy = false;
  setBattleLog('What will you do?');
}

async function onEnemyFainted() {
  const b = Game.battle;
  const wild = b.wild;
  const player = Game.party[b.playerIdx];
  battle3d?.faint('enemy');
  setBattleLog(b.isTrainer ? `${b.trainerName}'s ${wild.name} fainted!` : `Wild ${wild.name} fainted!`);
  await sleep(900);
  const expGain = Math.floor((wild.expYield * wild.level) / 5) + 5;
  const result = gainExp(player, expGain);
  let msg = `${player.name} gained ${expGain} EXP!`;
  if (result.leveled) {
    msg += ` ${player.name} grew to Lv${player.level}!`;
    showToast(`${player.name} reached Lv${player.level}!`);
  }
  setBattleLog(msg);
  await sleep(1000);

  if (b.isTrainer && b.enemyParty) {
    const nextIdx = nextTrainerMonIndex(b.enemyParty, b.enemyIdx);
    if (nextIdx >= 0) {
      b.enemyIdx = nextIdx;
      const nextMon = b.enemyParty[nextIdx];
      nextMon.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
      b.wild = nextMon;
      setBattleLog(`${b.trainerName} sent out ${nextMon.name}!`);
      await battle3d?.setFighters(player, nextMon);
      resetHpBar('enemy', nextMon.hp, nextMon.maxHp);
      renderBattle();
      await sleep(800);
      b.busy = false;
      setBattleLog('What will you do?');
      return;
    }
    Game.battlesWon++;
    if (b.trainerId) Game.flags.trainersDefeated.add(b.trainerId);
    if (b.reward) {
      Game.bag = applyTrainerReward(Game.bag, b.reward);
      setBattleLog(`${b.trainerName}: You win! Here's ${formatRewardText(b.reward)}!`);
      showToast(`Reward: ${formatRewardText(b.reward)}`);
      await sleep(1100);
    }
    endBattle(false);
    return;
  }

  Game.battlesWon++;
  if (wild.speciesId === 'mewtwo') {
    Game.flags.mewtwoDefeated = true;
    showToast('You defeated Mewtwo!');
  }
  if (Math.random() < 0.25) {
    Game.bag.pokeball++;
    setBattleLog('You found a Poké Ball!');
    await sleep(600);
  }
  endBattle(false);
}

async function onPlayerFainted() {
  const b = Game.battle;
  const player = Game.party[b.playerIdx];
  battle3d?.faint('player');
  setBattleLog(`${player.name} fainted!`);
  await sleep(900);
  const next = firstAlive(Game.party);
  if (next >= 0) {
    b.playerIdx = next;
    const mon = Game.party[next];
    mon.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    setBattleLog(`Go! ${mon.name}!`);
    await battle3d?.setFighters(mon, b.wild);
    resetHpBar('player', mon.hp, mon.maxHp);
    renderBattle();
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
  snapPlayerToTile(7, 10);
  Game.player.dir = 'down';
  if (playerMesh) playerMesh.rotation.y = dirToYaw('down');
  Game.battle = null;
  battle3d?.stop();
  showScreen('game-screen');
  Game.state = 'overworld';
  updateHUD();
  updateCamera(true);
  showToast('Returned to the Pokémon Center');
  startDialogue([
    'You blacked out...',
    'You woke up at the Pokémon Center.',
    "Your party was healed. Don't give up!",
  ]);
}

async function battleCatch() {
  const b = Game.battle;
  if (!b || b.busy || b.isTrainer) {
    if (b?.isTrainer) setBattleLog("You can't catch a trainer's Pokémon!");
    return;
  }
  if (Game.bag.pokeball <= 0 && Game.bag.superball <= 0) {
    setBattleLog('No balls left!');
    return;
  }
  b.busy = true;
  const useSuper = Game.bag.superball > 0;
  if (useSuper) Game.bag.superball--;
  else Game.bag.pokeball--;
  updateHUD();
  const wild = b.wild;
  setBattleLog(`You threw a ${useSuper ? 'Super Ball' : 'Poké Ball'}!`);
  const overlay = document.getElementById('catch-overlay');
  overlay?.classList.add('visible');
  await sleep(900);
  let bonus = useSuper ? 1.6 : 1;
  if (wild.hp / wild.maxHp < 0.25) bonus *= 1.5;
  if (SPECIES()[wild.speciesId]?.legendary) bonus *= 0.3;
  const success = tryCatch(wild, bonus);
  overlay?.classList.remove('visible');
  if (success) {
    setBattleLog(`Gotcha! ${wild.name} was caught!`);
    await sleep(800);
    Game.flags.caughtSpecies.add(wild.speciesId);
    if (Game.party.length < 6) {
      const caught = createPokemon(wild.speciesId, wild.level);
      caught.hp = Math.max(1, wild.hp);
      Game.party.push(caught);
      setBattleLog(`${wild.name} joined your party!`);
    } else {
      setBattleLog(`${wild.name} was sent to the PC!`);
    }
    await sleep(900);
    Game.battlesWon++;
    endBattle(true);
  } else {
    setBattleLog(`Oh no! ${wild.name} broke free!`);
    await sleep(700);
    const player = Game.party[b.playerIdx];
    await executeMove(wild, player, pickEnemyMove(wild), 'enemy');
    if (player.hp <= 0) { await onPlayerFainted(); return; }
    b.busy = false;
    setBattleLog('What will you do?');
  }
}

async function battleUsePotion() {
  const b = Game.battle;
  if (!b || b.busy) return;
  if (Game.bag.potion <= 0) { setBattleLog('No Potions left!'); return; }
  const player = Game.party[b.playerIdx];
  if (player.hp >= player.maxHp) { setBattleLog(`${player.name}'s HP is already full!`); return; }
  b.busy = true;
  Game.bag.potion--;
  const before = player.hp;
  player.hp = Math.min(player.maxHp, player.hp + 20);
  battle3d?.showDamage('player', `+${player.hp - before}`, 'heal');
  setBattleLog(`Potion! ${player.name} recovered ${player.hp - before} HP!`);
  renderBattle();
  updateHUD();
  await sleep(800);
  await executeMove(b.wild, player, pickEnemyMove(b.wild), 'enemy');
  if (player.hp <= 0) { await onPlayerFainted(); return; }
  b.busy = false;
  setBattleLog('What will you do?');
}

async function battleRun() {
  const b = Game.battle;
  if (!b || b.busy) return;
  if (b.isTrainer) { setBattleLog("No running from a trainer battle!"); return; }
  b.busy = true;
  const player = Game.party[b.playerIdx];
  const pSpe = getEffectiveStat(player, 'spe');
  const eSpe = getEffectiveStat(b.wild, 'spe');
  let chance = clamp(0.5 + (pSpe - eSpe) / 200, 0.15, 0.95);
  if (SPECIES()[b.wild.speciesId]?.legendary) chance *= 0.4;
  if (Math.random() < chance) {
    setBattleLog('Got away safely!');
    await sleep(700);
    endBattle(false);
  } else {
    setBattleLog("Can't escape!");
    await sleep(600);
    await executeMove(b.wild, player, pickEnemyMove(b.wild), 'enemy');
    if (player.hp <= 0) { await onPlayerFainted(); return; }
    b.busy = false;
    setBattleLog('What will you do?');
  }
}

function endBattle(caught) {
  Game.battle = null;
  battle3d?.stop();
  showScreen('game-screen');
  Game.state = 'overworld';
  Game.encounterCooldown = 1.2;
  updateHUD();
  updateCamera(true);
  if (Game.flags.mewtwoDefeated && Game.flags.caughtSpecies.size >= 6) {
    showEndScreen();
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

// ---- Menus / Save ----
function openPartyMenu() {
  if (Game.state !== 'overworld' && Game.state !== 'menu') return;
  Game.state = 'menu';
  const list = document.getElementById('party-list');
  list.innerHTML = '';
  Game.party.forEach((mon, idx) => {
    const isLead = idx === firstAlive(Game.party);
    const fainted = mon.hp <= 0;
    const div = document.createElement('div');
    div.className = 'party-card' + (isLead ? ' is-lead' : '') + (fainted ? ' is-fainted' : '');
    div.innerHTML = `<img src="${mon.spriteArt || mon.sprite}" alt="" />
      <div><div>${mon.name} · Lv${mon.level}</div>
      <div style="font-size:7px;color:var(--text-dim)">HP ${mon.hp}/${mon.maxHp}${fainted ? ' · FAINTED' : ''}</div></div>`;
    if (!isLead && !fainted) {
      div.addEventListener('click', () => {
        Game.party.splice(idx, 1);
        Game.party.unshift(mon);
        openPartyMenu();
        updateHUD();
      });
    }
    list.appendChild(div);
  });
  document.getElementById('party-panel').classList.add('visible');
}

function openBagMenu() {
  if (Game.state !== 'overworld' && Game.state !== 'menu') return;
  Game.state = 'menu';
  document.getElementById('bag-list').innerHTML = `
    <div class="bag-item"><img class="btn-icon" src="assets/ui/pokeball.png" alt="" /> Poké Ball × ${Game.bag.pokeball}</div>
    <div class="bag-item"><img class="btn-icon" src="assets/ui/greatball.png" alt="" /> Super Ball × ${Game.bag.superball}</div>
    <div class="bag-item" id="use-potion"><img class="btn-icon" src="assets/ui/potion.png" alt="" /> Potion × ${Game.bag.potion}</div>
    <p style="font-size:7px;color:var(--text-dim);margin-top:8px">Press P to save. Super Balls auto-prefer in battle.</p>`;
  document.getElementById('use-potion')?.addEventListener('click', () => {
    if (Game.bag.potion <= 0) return;
    const lead = Game.party[firstAlive(Game.party)];
    if (!lead || lead.hp <= 0) { showToast("Can't heal fainted — visit Center!"); return; }
    if (lead.hp >= lead.maxHp) { showToast('Already full HP!'); return; }
    Game.bag.potion--;
    lead.hp = Math.min(lead.maxHp, lead.hp + 20);
    showToast(`${lead.name} recovered HP!`);
    updateHUD();
    openBagMenu();
  });
  document.getElementById('bag-panel').classList.add('visible');
}

function closeMenus() {
  document.getElementById('party-panel').classList.remove('visible');
  document.getElementById('bag-panel').classList.remove('visible');
  if (Game.state === 'menu') Game.state = 'overworld';
}

function saveGame() {
  if (!Game.party.length || Game.state === 'title' || Game.state === 'starter') {
    showToast('Nothing to save yet.');
    return;
  }
  if (Game.state === 'battle') {
    showToast("Can't save during battle!");
    return;
  }
  const data = serializeGameState({
    party: Game.party,
    bag: Game.bag,
    player: Game.player,
    flags: Game.flags,
    steps: Game.steps,
    battlesWon: Game.battlesWon,
  });
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    showToast('Game saved!');
    refreshContinue();
  } catch (e) {
    showToast('Save failed.');
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const snap = deserializeGameState(raw ? JSON.parse(raw) : null);
    if (!snap) return false;
    Game.party = snap.party;
    Game.bag = snap.bag;
    Game.flags = snap.flags;
    if (!(Game.flags.trainersDefeated instanceof Set)) {
      Game.flags.trainersDefeated = new Set(Game.flags.trainersDefeated || []);
    }
    Game.steps = snap.steps;
    Game.battlesWon = snap.battlesWon;
    snapPlayerToTile(snap.player.x, snap.player.y);
    Game.player.dir = snap.player.dir || 'down';
    if (playerMesh) playerMesh.rotation.y = dirToYaw(Game.player.dir);
    showScreen('game-screen');
    Game.state = 'overworld';
    updateHUD();
    updateCamera(true);
    return true;
  } catch (e) {
    return false;
  }
}

function refreshContinue() {
  const btn = document.getElementById('btn-continue');
  if (!btn) return;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    btn.hidden = !hasValidSaveData(raw ? JSON.parse(raw) : null);
  } catch (e) {
    btn.hidden = true;
  }
}

function startGame(starterId) {
  Game.party = [createPokemon(starterId, 5)];
  Game.flags.caughtSpecies = new Set([starterId]);
  Game.flags.trainersDefeated = new Set();
  Game.flags.shopGift = false;
  Game.flags.mewtwoDefeated = false;
  Game.bag = { pokeball: 5, potion: 3, superball: 1 };
  Game.battlesWon = 0;
  Game.steps = 0;
  snapPlayerToTile(12, 12);
  Game.player.dir = 'up';
  if (playerMesh) playerMesh.rotation.y = dirToYaw('up');
  showScreen('game-screen');
  Game.state = 'overworld';
  updateHUD();
  updateCamera(true);
  startDialogue([
    `You chose ${SPECIES()[starterId].name}!`,
    'Explore the 3D world with WASD. Drag mouse to orbit camera.',
    'Press E to talk. M party · B bag · P save.',
    'Challenge Youngster Joey, catch 6 species, defeat Mewtwo!',
  ]);
}

// ---- Input ----
function bindInput() {
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    Game.keys[key] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key) || key === ' ') e.preventDefault();
    handleKey(key === ' ' ? ' ' : key);
  });
  window.addEventListener('keyup', (e) => {
    Game.keys[e.key.toLowerCase()] = false;
  });

  // Camera drag
  const canvas = document.getElementById('game-canvas');
  canvas.addEventListener('pointerdown', (e) => {
    if (Game.state !== 'overworld') return;
    Game.dragging = true;
    Game.lastMX = e.clientX;
    Game.lastMY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!Game.dragging) return;
    const dx = e.clientX - Game.lastMX;
    const dy = e.clientY - Game.lastMY;
    Game.lastMX = e.clientX;
    Game.lastMY = e.clientY;
    Game.camAngle -= dx * 0.008;
    Game.camPitch = clamp(Game.camPitch + dy * 0.005, 0.2, 1.2);
  });
  canvas.addEventListener('pointerup', () => { Game.dragging = false; });
  canvas.addEventListener('pointercancel', () => { Game.dragging = false; });
  canvas.addEventListener('wheel', (e) => {
    Game.camDist = clamp(Game.camDist + e.deltaY * 0.01, 5, 18);
    e.preventDefault();
  }, { passive: false });

  // Mobile
  document.querySelectorAll('.dpad button').forEach((btn) => {
    const dir = btn.dataset.dir;
    const go = (ev) => { ev.preventDefault(); tryMove(dir); };
    btn.addEventListener('pointerdown', go);
  });
  document.getElementById('btn-a')?.addEventListener('click', () => interact());
  document.getElementById('btn-menu')?.addEventListener('click', () => openPartyMenu());
  document.getElementById('btn-b')?.addEventListener('click', () => openBagMenu());
}

function handleKey(key) {
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
    if (key === 'w' || key === 'arrowup') tryMove('up');
    else if (key === 's' || key === 'arrowdown') tryMove('down');
    else if (key === 'a' || key === 'arrowleft') tryMove('left');
    else if (key === 'd' || key === 'arrowright') tryMove('right');
    if (key === 'e' || key === ' ') interact();
    if (key === 'm') openPartyMenu();
    if (key === 'b') openBagMenu();
    if (key === 'p') saveGame();
    if (key === 'q') Game.camAngle += 0.15;
    if (key === 'e' && Game.keys['shift']) { /* reserved */ }
    // Rotate camera with Q / period-comma style: use Q and R
    if (key === 'r') Game.camAngle -= 0.15;
  }
}

function bindUI() {
  document.getElementById('btn-start')?.addEventListener('click', () => {
    showScreen('starter-screen');
    Game.state = 'starter';
  });
  document.getElementById('btn-continue')?.addEventListener('click', () => {
    if (loadGame()) showToast('Game loaded!');
    else showToast('No valid save.');
  });
  document.querySelectorAll('.starter-card').forEach((card) => {
    card.addEventListener('click', () => startGame(card.dataset.species));
  });
  document.getElementById('dialogue')?.addEventListener('click', () => {
    if (Game.state === 'dialogue') advanceDialogue();
  });
  document.getElementById('btn-close-party')?.addEventListener('click', closeMenus);
  document.getElementById('btn-close-bag')?.addEventListener('click', closeMenus);
  document.getElementById('btn-fight')?.addEventListener('click', showMovesMenu);
  document.getElementById('btn-switch')?.addEventListener('click', showSwitchMenu);
  document.getElementById('btn-catch')?.addEventListener('click', () => battleCatch());
  document.getElementById('btn-bag-battle')?.addEventListener('click', () => battleUsePotion());
  document.getElementById('btn-run')?.addEventListener('click', () => battleRun());
  document.getElementById('btn-back-moves')?.addEventListener('click', showMainBattleMenu);
  document.getElementById('btn-back-switch')?.addEventListener('click', showMainBattleMenu);
  document.getElementById('btn-restart')?.addEventListener('click', () => location.reload());
  refreshContinue();
}

// ---- Main loop ----
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (Game.encounterCooldown > 0) Game.encounterCooldown -= dt;
  if (Game.healPadCooldown > 0) Game.healPadCooldown -= dt;

  // Held keys for continuous move
  if (Game.state === 'overworld' && !Game.player.moving) {
    if (Game.keys['w'] || Game.keys['arrowup']) tryMove('up');
    else if (Game.keys['s'] || Game.keys['arrowdown']) tryMove('down');
    else if (Game.keys['a'] || Game.keys['arrowleft']) tryMove('left');
    else if (Game.keys['d'] || Game.keys['arrowright']) tryMove('right');
  }

  if (Game.state === 'overworld' || Game.state === 'dialogue' || Game.state === 'menu' || Game.state === 'healing') {
    if (Game.state === 'overworld') updateMove(dt);
    else if (playerMesh && !Game.player.moving) {
      // Keep idle breathing during dialogue/menus
      const breath = 1 + Math.sin(t * 2.4) * 0.025;
      playerMesh.scale.set(breath, 1 + Math.sin(t * 2.4 + 0.4) * 0.03, breath);
      playerMesh.position.y = playerGroundY() + Math.sin(t * 2.4) * 0.015;
    }
    world?.animate(t, dt);
    updateDust(dt);
    updateDayNight(dt);
    updateCamera(false);
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  requestAnimationFrame(loop);
}

// ---- Boot ----
async function boot() {
  bindInput();
  bindUI();
  try {
    await init3D();
  } catch (e) {
    console.error(e);
    document.getElementById('loading').innerHTML =
      `<div class="loading-inner"><p>Failed to load 3D world.</p><p style="font-size:8px;color:#9bb4c8">${e.message}</p></div>`;
  }
}

boot();
