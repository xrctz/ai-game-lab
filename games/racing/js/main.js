import * as THREE from 'three';
import { createTrackPath, buildTrack, buildWorld } from './track.js';
import { Racer, RIVAL_NAMES, setSkimmerTextures } from './skimmer.js';
import { loadTexturePack } from './textures.js';

const TOTAL_LAPS = 3;
const ASSETS = {
  titleVideo: 'assets/videos/title_cinematic.mp4',
  introVideo: 'assets/videos/intro_skimmer.mp4',
  victoryVideo: 'assets/videos/victory_cinematic.mp4',
  racingVideo: 'assets/videos/racing_cinematic.mp4',
};

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const screens = {
  menu: $('menu-screen'),
  cinematic: $('cinematic-screen'),
  loading: $('loading-screen'),
  pause: $('pause-screen'),
  result: $('result-screen'),
};
const hud = $('hud');
const canvas = $('game-canvas');
const cinematicVideo = $('cinematic-video');

// ---------- State ----------
let renderer, scene, camera;
let track, worldFx;
let racers = [];
let player = null;
let clock = new THREE.Clock();
let state = 'menu'; // menu | cinematic | loading | countdown | racing | paused | result
let raceTime = 0;
let countdownVal = 3;
let countdownTimer = 0;
let animId = null;
let camVel = new THREE.Vector3();
let input = {
  forward: false,
  back: false,
  left: false,
  right: false,
  boost: false,
  drift: false,
  boostConsumed: false,
};
let minimapCtx = null;
let orbsCollectedAtStart = 0;
let texturePack = null;
let texturesReady = false;

// ---------- Screens ----------
function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove('active'));
  if (name && screens[name]) screens[name].classList.add('active');
  hud.classList.toggle('active', name === null || name === 'pause');
}

function formatTime(t) {
  if (t == null || Number.isNaN(t)) return '—';
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

function placeStr(n) {
  const s = ['', '1st', '2nd', '3rd', '4th'];
  return s[n] || `${n}th`;
}

// ---------- Cinematics ----------
function playCinematic({ src, title, sub, onDone, muted = true }) {
  return new Promise((resolve) => {
    state = 'cinematic';
    showScreen('cinematic');
    $('cinematic-title').textContent = title || '';
    $('cinematic-sub').textContent = sub || '';
    cinematicVideo.src = src;
    cinematicVideo.muted = muted;
    cinematicVideo.currentTime = 0;
    const finish = () => {
      cinematicVideo.pause();
      cinematicVideo.removeAttribute('src');
      cinematicVideo.load();
      $('btn-skip-cinematic').onclick = null;
      cinematicVideo.onended = null;
      resolve();
      if (onDone) onDone();
    };
    $('btn-skip-cinematic').onclick = finish;
    cinematicVideo.onended = finish;
    cinematicVideo.play().catch(() => {
      // Autoplay blocked — skip after brief beat
      setTimeout(finish, 800);
    });
  });
}

// ---------- Three.js setup ----------
function initRenderer() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 600);
  camera.position.set(0, 20, 40);

  minimapCtx = $('minimap').getContext('2d');

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function clearScene() {
  if (!scene) return;
  while (scene.children.length) {
    const o = scene.children[0];
    scene.remove(o);
    o.traverse?.((c) => {
      if (c.geometry) c.geometry.dispose?.();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
        else c.material.dispose?.();
      }
    });
  }
}

function setLoading(p) {
  $('loading-fill').style.width = `${Math.floor(p * 100)}%`;
}

async function buildRace() {
  state = 'loading';
  showScreen('loading');
  setLoading(0.1);
  await wait(50);
  clearScene();
  setLoading(0.25);

  await ensureTextures();
  setLoading(0.35);
  worldFx = buildWorld(scene, texturePack);
  setLoading(0.5);
  await wait(30);

  const curve = createTrackPath();
  track = buildTrack(scene, curve, texturePack);
  setLoading(0.7);
  await wait(30);

  racers = [];
  // Player is the fastest skimmer — arcade-friendly top end
  player = new Racer({
    name: 'You',
    isPlayer: true,
    palette: 'player',
    startProgress: 0.0,
    lateral: 0,
    maxSpeed: 48,
    accel: 38,
    turnRate: 2.8,
  });
  scene.add(player.mesh.root);
  racers.push(player);

  // Even grid start; AI is deliberately slower than the player
  // Ember Quill (green) used to be overtuned — now the mild mid-pack rival
  const rivalConfigs = [
    {
      // Nyx Arc — pink, cautious
      lateral: -0.4,
      start: 0.008,
      maxSpeed: 36,
      accel: 22,
      ai: {
        skill: 0.35,
        baseMax: 35.5,
        throttle: 0.74,
        weave: 0.55,
        weaveAmp: 0.62,
        laneBias: -0.15,
        phase: 0.4,
        boostPower: 1.18,
        boostMinCharge: 75,
        boostCooldown: 4.5,
        boostRateBehind: 0.1,
        boostRateClose: 0.03,
        boostRateAhead: 0.005,
        orbGain: 9,
        gateSpec: 7,
        gateSpeed: 3,
      },
    },
    {
      // Sol Vire — gold, mid pack
      lateral: 0.4,
      start: 0.01,
      maxSpeed: 37,
      accel: 23,
      ai: {
        skill: 0.42,
        baseMax: 36.5,
        throttle: 0.76,
        weave: 0.7,
        weaveAmp: 0.5,
        laneBias: 0.2,
        phase: 1.8,
        boostPower: 1.2,
        boostMinCharge: 72,
        boostCooldown: 4.0,
        boostRateBehind: 0.12,
        boostRateClose: 0.035,
        boostRateAhead: 0.006,
        orbGain: 10,
        gateSpec: 8,
        gateSpeed: 3.5,
      },
    },
    {
      // Ember Quill — green, was overpowered; now solid but beatable
      lateral: -0.15,
      start: 0.006,
      maxSpeed: 37.5,
      accel: 24,
      ai: {
        skill: 0.48,
        baseMax: 37,
        throttle: 0.78,
        weave: 0.65,
        weaveAmp: 0.48,
        laneBias: 0.05,
        phase: 2.6,
        boostPower: 1.22,
        boostMinCharge: 70,
        boostCooldown: 3.8,
        boostRateBehind: 0.14,
        boostRateClose: 0.04,
        boostRateAhead: 0.007,
        orbGain: 11,
        gateSpec: 8,
        gateSpeed: 4,
      },
    },
  ];

  RIVAL_NAMES.forEach((name, i) => {
    const cfg = rivalConfigs[i];
    const r = new Racer({
      name,
      palette: `rival${i}`,
      startProgress: cfg.start,
      lateral: cfg.lateral,
      maxSpeed: cfg.maxSpeed,
      accel: cfg.accel,
      ai: cfg.ai,
    });
    scene.add(r.mesh.root);
    racers.push(r);
  });

  // Snap initial poses
  racers.forEach((r) => r.updatePhysics(0.016, track, null));
  setLoading(0.95);
  await wait(40);
  setLoading(1);
  await wait(200);
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- Race flow ----------
async function startRaceFlow() {
  await playCinematic({
    src: ASSETS.titleVideo,
    title: 'VEIL RUSH',
    sub: 'The Glass Meridian awakens under twin moons…',
  });
  await playCinematic({
    src: ASSETS.introVideo,
    title: 'Dawnshard Online',
    sub: 'Spectrum Drive charged. Prism Gates aligned. Three laps to dawn.',
  });

  await buildRace();

  raceTime = 0;
  countdownVal = 3;
  countdownTimer = 0;
  state = 'countdown';
  showScreen(null);
  hud.classList.add('active');
  $('countdown').textContent = '3';
  $('countdown').classList.add('show');
  $('race-msg').classList.remove('show');
  racers.forEach((r) => {
    r.lapStart = 0;
    r.lapTimes = [];
    r.finished = false;
    r.finishTime = null;
    r.orbs = 0;
    // Player starts with usable charge; AI starts nearly empty
    r.spectrum = r.isPlayer ? 35 : 8;
    r.boostTimer = 0;
    r.boostCooldown = 0;
    r.gateHits = new Map();
    r._endScheduled = false;
  });
  orbsCollectedAtStart = 0;
  clock.start();
  if (!animId) loop();
}

function beginRacing() {
  state = 'racing';
  const now = performance.now() / 1000;
  racers.forEach((r) => {
    r.lapStart = now;
  });
  flashMsg('GO!', 1.1);
}

function flashMsg(text, sec = 1.2) {
  const el = $('race-msg');
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), sec * 1000);
}

function endRace() {
  state = 'result';
  const ordered = [...racers].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.raceMetric - a.raceMetric;
  });
  ordered.forEach((r, i) => {
    r.finishedPlace = i + 1;
  });
  const place = player.finishedPlace;
  const won = place === 1;

  showScreen('result');
  hud.classList.remove('active');
  const panel = $('result-screen');
  panel.classList.toggle('lose', !won);
  $('result-title').textContent = won ? 'Dawn Spark Claimed' : 'Veil Dims';
  $('result-sub').textContent = won
    ? 'You crossed the Meridian as first light broke. The crystal desert remembers your wake.'
    : `Finished ${placeStr(place)}. The Dawn Spark slips to another Veilrunner — challenge the Meridian again.`;
  $('result-place').textContent = placeStr(place);
  $('result-time').textContent = formatTime(player.finishTime ?? raceTime);
  $('result-orbs').textContent = String(player.orbs);
  const best = player.lapTimes.length ? Math.min(...player.lapTimes) : null;
  $('result-best').textContent = formatTime(best);

  if (won) {
    // Victory cinematic after a short beat
    setTimeout(() => {
      playCinematic({
        src: ASSETS.victoryVideo,
        title: 'First Light',
        sub: 'The Dawn Spark is yours.',
      }).then(() => {
        showScreen('result');
      });
    }, 600);
  }
}

// ---------- Update / render ----------
function updateCountdown(dt) {
  countdownTimer += dt;
  if (countdownTimer >= 1) {
    countdownTimer = 0;
    countdownVal -= 1;
    const el = $('countdown');
    if (countdownVal > 0) {
      el.textContent = String(countdownVal);
      el.classList.remove('show');
      void el.offsetWidth;
      el.classList.add('show');
    } else if (countdownVal === 0) {
      el.textContent = 'RUSH';
      el.classList.remove('show');
      void el.offsetWidth;
      el.classList.add('show');
      beginRacing();
      setTimeout(() => el.classList.remove('show'), 700);
    }
  }
}

function updateHUD() {
  $('hud-speed').textContent = String(Math.round(player.speed * 4.2));
  $('hud-lap').textContent = String(Math.min(player.lap, TOTAL_LAPS));
  $('hud-laps').textContent = String(TOTAL_LAPS);
  $('hud-time').textContent = formatTime(raceTime);
  $('spectrum-fill').style.width = `${player.spectrum}%`;
  const lab = $('spectrum-label');
  if (player.spectrum >= 30) {
    lab.textContent = 'SPECTRUM READY';
    lab.classList.add('spectrum-ready');
  } else {
    lab.textContent = 'Spectrum';
    lab.classList.remove('spectrum-ready');
  }
  $('boost-flash').classList.toggle('on', player.boostTimer > 0);

  const ordered = [...racers].sort((a, b) => b.raceMetric - a.raceMetric);
  const place = ordered.indexOf(player) + 1;
  $('hud-place').textContent = String(place);

  const stand = $('standings');
  stand.innerHTML = ordered
    .map((r, i) => {
      const cls = r.isPlayer ? 'place-row you' : i === 0 ? 'place-row p1' : 'place-row';
      return `<div class="${cls}"><span>${i + 1}. ${r.name}</span><span>L${Math.min(r.lap, TOTAL_LAPS)}</span></div>`;
    })
    .join('');

  drawMinimap(ordered);
}

function drawMinimap(ordered) {
  const ctx = minimapCtx;
  const w = 150;
  const h = 150;
  ctx.clearRect(0, 0, w, h);

  // Background glow
  ctx.fillStyle = 'rgba(10, 8, 28, 0.9)';
  ctx.beginPath();
  ctx.roundRect?.(0, 0, w, h, 12);
  if (!ctx.roundRect) ctx.fillRect(0, 0, w, h);
  else ctx.fill();

  // Track path
  const pts = track.centerLine;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  const pad = 14;
  const sx = (w - pad * 2) / (maxX - minX || 1);
  const sz = (h - pad * 2) / (maxZ - minZ || 1);
  const s = Math.min(sx, sz);
  const ox = (w - (maxX - minX) * s) / 2;
  const oz = (h - (maxZ - minZ) * s) / 2;
  const map = (p) => ({
    x: ox + (p.x - minX) * s,
    y: oz + (p.z - minZ) * s,
  });

  ctx.strokeStyle = 'rgba(61, 232, 255, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const m = map(p);
    if (i === 0) ctx.moveTo(m.x, m.y);
    else ctx.lineTo(m.x, m.y);
  });
  ctx.closePath();
  ctx.stroke();

  // Racers
  const colors = ['#3de8ff', '#ff3d9a', '#ffc857', '#34d399'];
  racers.forEach((r, i) => {
    const frame = track.getFrame(r.progress);
    const m = map(frame.position);
    ctx.fillStyle = r.isPlayer ? '#3de8ff' : colors[(i % colors.length)];
    ctx.beginPath();
    ctx.arc(m.x, m.y, r.isPlayer ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (r.isPlayer) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });
}

function updateCamera(dt) {
  if (!player) return;
  const frame = track.getFrame(player.progress);
  const lookAhead = track.getFrame((player.progress + 0.03) % 1);
  const behind = frame.tangent.clone().multiplyScalar(-12 - player.speed * 0.08);
  const up = frame.up.clone().multiplyScalar(5.5);
  const target = player.mesh.root.position.clone().add(behind).add(up);
  camera.position.lerp(target, 1 - Math.exp(-4 * dt));
  const look = lookAhead.position.clone().add(frame.up.clone().multiplyScalar(1.5));
  // Smooth look
  if (!camera.userData.look) camera.userData.look = look.clone();
  camera.userData.look.lerp(look, 1 - Math.exp(-5 * dt));
  camera.lookAt(camera.userData.look);
}

function updatePickups(dt) {
  // Animate orbs
  for (const orb of track.orbs) {
    if (orb.taken) continue;
    const bob = Math.sin(performance.now() * 0.004 + orb.t * 20) * 0.35;
    orb.mesh.position.y = orb.baseY + bob;
    orb.mesh.rotation.y += dt * 2;
    if (orb.glow) {
      orb.glow.position.copy(orb.mesh.position);
      orb.glow.material.opacity = 0.4 + Math.sin(performance.now() * 0.006 + orb.t * 10) * 0.15;
    }
  }
  for (const gate of track.gates) {
    gate.mesh.rotation.z += dt * 0.8;
    if (gate._flash > 0) {
      gate._flash -= dt;
      gate.mesh.material.emissiveIntensity = THREE.MathUtils.lerp(
        gate.mesh.material.emissiveIntensity,
        1.2,
        dt * 3
      );
    } else {
      gate.mesh.material.emissiveIntensity = 1.2 + Math.sin(performance.now() * 0.003) * 0.15;
    }
  }
  // Aurora light sway
  if (worldFx) {
    const t = performance.now() * 0.001;
    worldFx.aurora.intensity = 1.8 + Math.sin(t * 0.7) * 0.5;
    worldFx.pink.intensity = 1.3 + Math.cos(t * 0.5) * 0.4;
    worldFx.stars.rotation.y = t * 0.01;
  }
}

function checkFinish() {
  for (const r of racers) {
    if (!r.finished && r.lap > TOTAL_LAPS) {
      r.finished = true;
      r.finishTime = raceTime;
      r.lap = TOTAL_LAPS;
      if (r.isPlayer) {
        const alreadyDone = racers.filter((x) => x.finished && x !== r).length;
        flashMsg(alreadyDone === 0 ? 'FINISH!' : 'FINISHED', 1.5);
      }
    }
  }
  // End when player finished, or all finished
  if (player.finished) {
    // small delay then results
    if (!player._endScheduled) {
      player._endScheduled = true;
      setTimeout(() => {
        if (state === 'racing') endRace();
      }, 1800);
    }
  }
}

function loop() {
  animId = requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (state === 'countdown') {
    updateCountdown(dt);
    racers.forEach((r) => {
      // idle hover only
      r.speed = 0;
      r.updatePhysics(dt, track, null);
    });
    updateCamera(dt);
    updatePickups(dt);
    updateHUD();
    renderer.render(scene, camera);
    return;
  }

  if (state === 'racing') {
    raceTime += dt;
    racers.forEach((r) => {
      if (!r.isPlayer) r.updateAI(dt, track, racers);
      r.updatePhysics(dt, track, r.isPlayer ? input : null);
      r.checkPickups(track);
    });
    // reset boost edge
    if (input.boostConsumed) {
      input.boost = false;
      input.boostConsumed = false;
    }
    updateCamera(dt);
    updatePickups(dt);
    updateHUD();
    checkFinish();
    renderer.render(scene, camera);
    return;
  }

  if (state === 'paused') {
    renderer.render(scene, camera);
    return;
  }

  // menu / cinematic / result — keep rendering ambient if scene exists
  if (scene && renderer && track) {
    if (state === 'menu' && player && !player.isPlayer) {
      // idle ghost cruise on title screen
      player.speed = 18;
      player.progress = (player.progress + dt * 0.04) % 1;
      player.updatePhysics(dt, track, null);
      const f = track.getFrame((player.progress + 0.08) % 1);
      camera.position.lerp(
        player.mesh.root.position.clone().add(new THREE.Vector3(18, 12, 18)),
        1 - Math.exp(-1.2 * dt)
      );
      camera.lookAt(f.position);
    }
    updatePickups(dt);
    renderer.render(scene, camera);
  }
}

// ---------- Input ----------
function clearInput() {
  input.forward = false;
  input.back = false;
  input.left = false;
  input.right = false;
  input.boost = false;
  input.drift = false;
  input.boostConsumed = false;
}

function bindInput() {
  const setKey = (e, down) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        input.forward = down;
        e.preventDefault();
        break;
      case 'KeyS':
      case 'ArrowDown':
        input.back = down;
        e.preventDefault();
        break;
      case 'KeyA':
      case 'ArrowLeft':
        input.left = down;
        e.preventDefault();
        break;
      case 'KeyD':
      case 'ArrowRight':
        input.right = down;
        e.preventDefault();
        break;
      case 'Space':
        if (down && !e.repeat && state === 'racing') input.boost = true;
        e.preventDefault();
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        input.drift = down;
        e.preventDefault();
        break;
      case 'KeyP':
      case 'Escape':
        if (down && !e.repeat) togglePause();
        e.preventDefault();
        break;
      default:
        break;
    }
  };
  window.addEventListener('keydown', (e) => setKey(e, true));
  window.addEventListener('keyup', (e) => setKey(e, false));
  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInput();
  });

  if (window.AIGLMobile) {
    window.AIGLMobile.mountRacingControls({
      setInput(name, on) {
        if (name === 'left') input.left = on;
        else if (name === 'right') input.right = on;
        else if (name === 'boost') input.boost = on;
        else if (name === 'drift') input.drift = on;
      },
    });
  } else {
    window.addEventListener('load', function () {
      if (window.AIGLMobile) {
        window.AIGLMobile.mountRacingControls({
          setInput(name, on) {
            if (name === 'left') input.left = on;
            else if (name === 'right') input.right = on;
            else if (name === 'boost') input.boost = on;
            else if (name === 'drift') input.drift = on;
          },
        });
      }
    }, { once: true });
  }
}

function togglePause() {
  if (state === 'racing') {
    clearInput();
    state = 'paused';
    showScreen('pause');
    hud.classList.add('active');
  } else if (state === 'paused') {
    clearInput();
    state = 'racing';
    showScreen(null);
    hud.classList.add('active');
    clock.getDelta();
  }
}

async function returnToMenu() {
  state = 'menu';
  showScreen('menu');
  hud.classList.remove('active');
  await buildMenuBackdrop();
}

// ---------- Buttons ----------
function bindUI() {
  $('btn-start').onclick = () => startRaceFlow();
  $('btn-watch-intro').onclick = async () => {
    await playCinematic({
      src: ASSETS.racingVideo,
      title: 'Prism Tunnel',
      sub: 'Veilrunners duel through amethyst light.',
    });
    await playCinematic({
      src: ASSETS.introVideo,
      title: 'Dawnshard',
      sub: 'Your photon skimmer. Wings of living spectrum.',
    });
    showScreen('menu');
    state = 'menu';
  };
  $('btn-resume').onclick = () => togglePause();
  $('btn-quit').onclick = () => returnToMenu();
  $('btn-replay').onclick = () => startRaceFlow();
  $('btn-menu').onclick = () => returnToMenu();
}

// ---------- Boot ----------
async function ensureTextures() {
  if (texturesReady && texturePack) return texturePack;
  texturePack = await loadTexturePack(renderer);
  setSkimmerTextures(texturePack);
  texturesReady = true;
  return texturePack;
}

async function boot() {
  initRenderer();
  bindInput();
  bindUI();
  showScreen('loading');
  $('loading-fill').style.width = '15%';
  try {
    await ensureTextures();
    $('loading-fill').style.width = '70%';
  } catch (e) {
    console.warn('Texture pack load issue, continuing with fallbacks', e);
    texturePack = texturePack || {};
  }
  await buildMenuBackdrop();
  $('loading-fill').style.width = '100%';
  await wait(200);
  showScreen('menu');
  state = 'menu';
  clock.start();
  if (!animId) loop();
}

async function buildMenuBackdrop() {
  clearScene();
  await ensureTextures();
  worldFx = buildWorld(scene, texturePack);
  const curve = createTrackPath();
  track = buildTrack(scene, curve, texturePack);
  const ghost = new Racer({ name: 'ghost', palette: 'player', startProgress: 0.2, lateral: 0 });
  scene.add(ghost.mesh.root);
  racers = [ghost];
  player = ghost;
  const frame = track.getFrame(0.15);
  camera.position.copy(frame.position).add(new THREE.Vector3(25, 18, 30));
  camera.lookAt(frame.position);
}

boot();
