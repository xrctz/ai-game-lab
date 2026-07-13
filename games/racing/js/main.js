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
let camPos = new THREE.Vector3();
let camLook = new THREE.Vector3();
let camInitialized = false;
let hudPulse = { orb: 0, gate: 0, boost: 0 };
let msgTimer = null;
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
    accel: 40,
    turnRate: 3.05,
  });
  scene.add(player.mesh.root);
  racers.push(player);

  // Even grid start; rivals compete on lines and boosts — no hidden rubberband speed
  const rivalConfigs = [
    {
      // Nyx Arc — pink, cautious but punishes mistakes on straights
      lateral: -0.4,
      start: 0.008,
      maxSpeed: 36,
      accel: 22,
      ai: {
        skill: 0.4,
        baseMax: 36,
        throttle: 0.76,
        weave: 0.55,
        weaveAmp: 0.58,
        laneBias: -0.15,
        phase: 0.4,
        boostPower: 1.2,
        boostMinCharge: 72,
        boostCooldown: 4.2,
        boostRateBehind: 0.14,
        boostRateClose: 0.045,
        boostRateAhead: 0.006,
        orbGain: 10,
        gateSpec: 8,
        gateSpeed: 3.5,
      },
    },
    {
      // Sol Vire — gold, mid-pack duelist
      lateral: 0.4,
      start: 0.01,
      maxSpeed: 37,
      accel: 23,
      ai: {
        skill: 0.48,
        baseMax: 37,
        throttle: 0.78,
        weave: 0.7,
        weaveAmp: 0.48,
        laneBias: 0.2,
        phase: 1.8,
        boostPower: 1.24,
        boostMinCharge: 68,
        boostCooldown: 3.6,
        boostRateBehind: 0.16,
        boostRateClose: 0.05,
        boostRateAhead: 0.008,
        orbGain: 11,
        gateSpec: 9,
        gateSpeed: 4,
      },
    },
    {
      // Ember Quill — green, aggressive closer without overtuning raw speed
      lateral: -0.15,
      start: 0.006,
      maxSpeed: 37.5,
      accel: 24,
      ai: {
        skill: 0.52,
        baseMax: 37.5,
        throttle: 0.8,
        weave: 0.65,
        weaveAmp: 0.44,
        laneBias: 0.05,
        phase: 2.6,
        boostPower: 1.26,
        boostMinCharge: 65,
        boostCooldown: 3.2,
        boostRateBehind: 0.18,
        boostRateClose: 0.055,
        boostRateAhead: 0.01,
        orbGain: 12,
        gateSpec: 9,
        gateSpeed: 4.5,
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
  $('countdown').style.color = 'var(--cyan)';
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
    r._lapFlash = {};
  });
  orbsCollectedAtStart = 0;
  hudPulse = { orb: 0, gate: 0, boost: 0 };
  camInitialized = false;
  clock.start();
  if (!animId) loop();
}

function beginRacing() {
  state = 'racing';
  const now = performance.now() / 1000;
  racers.forEach((r) => {
    r.lapStart = now;
  });
  flashMsg('GO!', 1.2, 'go');
}

function flashMsg(text, sec = 1.2, kind = 'default') {
  const el = $('race-msg');
  el.textContent = text;
  el.dataset.kind = kind;
  el.classList.add('show');
  if (msgTimer) clearTimeout(msgTimer);
  msgTimer = setTimeout(() => {
    el.classList.remove('show');
    delete el.dataset.kind;
  }, sec * 1000);
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
  const winner = ordered[0];

  showScreen('result');
  hud.classList.remove('active');
  const panel = $('result-screen');
  panel.classList.toggle('lose', !won);
  $('result-title').textContent = won ? 'Dawn Spark Claimed' : 'Veil Dims';
  $('result-sub').textContent = won
    ? 'You crossed the Meridian as first light broke. The crystal desert remembers your wake.'
    : `${winner?.name || 'A rival'} took the Dawn Spark. You finished ${placeStr(place)} — the Meridian awaits another run.`;
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
const COUNTDOWN_BEATS = [0.85, 0.85, 0.75, 0.55];

function updateCountdown(dt) {
  countdownTimer += dt;
  const beat = COUNTDOWN_BEATS[3 - countdownVal] ?? 0.85;
  if (countdownTimer < beat) return;
  countdownTimer = 0;

  const el = $('countdown');
  if (countdownVal > 0) {
    countdownVal -= 1;
    if (countdownVal > 0) {
      el.textContent = String(countdownVal);
      el.style.color = countdownVal === 1 ? 'var(--gold)' : 'var(--cyan)';
      el.classList.remove('show');
      void el.offsetWidth;
      el.classList.add('show');
    } else {
      el.textContent = 'RUSH';
      el.style.color = 'var(--magenta)';
      el.classList.remove('show');
      void el.offsetWidth;
      el.classList.add('show');
      beginRacing();
      setTimeout(() => el.classList.remove('show'), 750);
    }
  }
}

function updateHUD(dt = 0.016) {
  $('hud-speed').textContent = String(Math.round(player.speed * 4.2));
  $('hud-lap').textContent = String(Math.min(player.lap, TOTAL_LAPS));
  $('hud-laps').textContent = String(TOTAL_LAPS);
  $('hud-time').textContent = formatTime(raceTime);
  $('spectrum-fill').style.width = `${player.spectrum}%`;
  const lab = $('spectrum-label');
  if (player.spectrum >= 30) {
    lab.textContent = player.spectrum >= 85 ? 'SPECTRUM FULL' : 'SPECTRUM READY';
    lab.classList.add('spectrum-ready');
  } else {
    lab.textContent = 'Spectrum';
    lab.classList.remove('spectrum-ready');
  }

  if (hudPulse.orb > 0) hudPulse.orb = Math.max(0, hudPulse.orb - dt);
  if (hudPulse.gate > 0) hudPulse.gate = Math.max(0, hudPulse.gate - dt);
  if (hudPulse.boost > 0) hudPulse.boost = Math.max(0, hudPulse.boost - dt);

  const spectrumWrap = document.querySelector('.spectrum-wrap');
  const spectrumFill = $('spectrum-fill');
  if (hudPulse.orb > 0) {
    spectrumFill.style.boxShadow = `0 0 ${14 + hudPulse.orb * 30}px rgba(103, 232, 249, 0.9)`;
  } else if (hudPulse.gate > 0) {
    spectrumFill.style.boxShadow = `0 0 ${16 + hudPulse.gate * 28}px rgba(255, 61, 154, 0.85)`;
  } else {
    spectrumFill.style.boxShadow = '';
  }
  spectrumWrap?.style.setProperty('transform', hudPulse.gate > 0 ? 'scale(1.04)' : 'scale(1)');

  $('boost-flash').classList.toggle('on', player.boostTimer > 0 || hudPulse.boost > 0);

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

  const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 8, w * 0.5, h * 0.5, w * 0.72);
  bgGrad.addColorStop(0, 'rgba(18, 14, 42, 0.95)');
  bgGrad.addColorStop(1, 'rgba(8, 6, 20, 0.92)');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(0, 0, w, h, 12);
  else ctx.rect(0, 0, w, h);
  ctx.fill();

  const pts = track.centerLine;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  const pad = 16;
  const sx = (w - pad * 2) / (maxX - minX || 1);
  const sz = (h - pad * 2) / (maxZ - minZ || 1);
  const s = Math.min(sx, sz);
  const ox = (w - (maxX - minX) * s) / 2;
  const oz = (h - (maxZ - minZ) * s) / 2;
  const map = (p) => ({
    x: ox + (p.x - minX) * s,
    y: oz + (p.z - minZ) * s,
  });

  ctx.strokeStyle = 'rgba(61, 232, 255, 0.12)';
  ctx.lineWidth = 9;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => {
    const m = map(p);
    if (i === 0) ctx.moveTo(m.x, m.y);
    else ctx.lineTo(m.x, m.y);
  });
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(61, 232, 255, 0.55)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const m = map(p);
    if (i === 0) ctx.moveTo(m.x, m.y);
    else ctx.lineTo(m.x, m.y);
  });
  ctx.closePath();
  ctx.stroke();

  const startF = track.getFrame(0);
  const startM = map(startF.position);
  const startN = map(startF.position.clone().add(startF.tangent.clone().multiplyScalar(8)));
  ctx.strokeStyle = 'rgba(255, 200, 87, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startM.x, startM.y);
  ctx.lineTo(startN.x, startN.y);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 200, 87, 0.85)';
  ctx.beginPath();
  ctx.arc(startM.x, startM.y, 3, 0, Math.PI * 2);
  ctx.fill();

  for (const gate of track.gates) {
    const gf = track.getFrame(gate.t);
    const gm = map(gf.position);
    ctx.fillStyle = 'rgba(255, 61, 154, 0.55)';
    ctx.fillRect(gm.x - 1.5, gm.y - 1.5, 3, 3);
  }

  const colors = ['#3de8ff', '#ff3d9a', '#ffc857', '#34d399'];
  const drawOrder = [...racers].sort((a, b) => (a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0));
  drawOrder.forEach((r) => {
    const idx = racers.indexOf(r);
    const frame = track.getFrame(r.progress);
    const m = map(frame.position);
    const tip = map(frame.position.clone().add(frame.tangent.clone().multiplyScalar(r.isPlayer ? 5 : 3.5)));

    ctx.strokeStyle = r.isPlayer ? '#fff' : colors[idx % colors.length];
    ctx.lineWidth = r.isPlayer ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();

    ctx.fillStyle = r.isPlayer ? '#3de8ff' : colors[idx % colors.length];
    ctx.beginPath();
    ctx.arc(m.x, m.y, r.isPlayer ? 4.5 : 3.2, 0, Math.PI * 2);
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
  const lookAheadT = (player.progress + 0.028 + player.speed * 0.00035) % 1;
  const lookAhead = track.getFrame(lookAheadT);

  const distBack = 11.5 + player.speed * 0.07;
  const height = 5.2 + player.speed * 0.018;
  const behind = frame.tangent.clone().multiplyScalar(-distBack);
  const up = frame.up.clone().multiplyScalar(height);
  const lateralCam = frame.side.clone().multiplyScalar(player.lateral * 1.8);
  const target = player.mesh.root.position.clone().add(behind).add(up).add(lateralCam);

  if (!camInitialized) {
    camPos.copy(target);
    camLook.copy(lookAhead.position).add(frame.up.clone().multiplyScalar(1.2));
    camInitialized = true;
  }

  const smooth = 1 - Math.exp(-7.5 * dt);
  camPos.lerp(target, smooth);
  camera.position.copy(camPos);

  const lookTarget = lookAhead.position.clone().add(frame.up.clone().multiplyScalar(1.2));
  camLook.lerp(lookTarget, 1 - Math.exp(-9 * dt));
  camera.lookAt(camLook);
}

function handlePlayerPickups(pickup, prevBoost) {
  if (pickup.orb) {
    hudPulse.orb = 0.45;
    if (player.orbs % 3 === 0) flashMsg('ORB CHARGE', 0.7, 'pickup');
  }
  if (pickup.gate) {
    hudPulse.gate = 0.55;
    flashMsg('PRISM GATE', 0.85, 'pickup');
  }
  if (player.boostTimer > 0 && prevBoost <= 0) {
    hudPulse.boost = 0.35;
    flashMsg('BOOST!', 0.65, 'boost');
  }
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
        flashMsg(alreadyDone === 0 ? 'FINISH!' : 'FINISHED', 1.5, 'go');
      }
    } else if (r.isPlayer && r.lap > 1 && r.prevProgress > 0.85 && r.progress < 0.12) {
      const lapNum = Math.min(r.lap - 1, TOTAL_LAPS);
      if (lapNum < TOTAL_LAPS && !r._lapFlash?.[lapNum]) {
        if (!r._lapFlash) r._lapFlash = {};
        r._lapFlash[lapNum] = true;
        flashMsg(`LAP ${lapNum}`, 0.9, 'default');
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
    updateHUD(dt);
    renderer.render(scene, camera);
    return;
  }

  if (state === 'racing') {
    raceTime += dt;
    racers.forEach((r) => {
      if (!r.isPlayer) r.updateAI(dt, track, racers);
      const prevBoost = r.isPlayer ? r.boostTimer : 0;
      r.updatePhysics(dt, track, r.isPlayer ? input : null);
      const pickup = r.checkPickups(track);
      if (r.isPlayer) handlePlayerPickups(pickup, prevBoost);
    });
    // reset boost edge
    if (input.boostConsumed) {
      input.boost = false;
      input.boostConsumed = false;
    }
    updateCamera(dt);
    updatePickups(dt);
    updateHUD(dt);
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
        if (down && state === 'racing') input.boost = true;
        e.preventDefault();
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        input.drift = down;
        e.preventDefault();
        break;
      case 'KeyP':
      case 'Escape':
        if (down) togglePause();
        e.preventDefault();
        break;
      default:
        break;
    }
  };
  window.addEventListener('keydown', (e) => setKey(e, true));
  window.addEventListener('keyup', (e) => setKey(e, false));

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
    state = 'paused';
    showScreen('pause');
    hud.classList.add('active');
    const ordered = [...racers].sort((a, b) => b.raceMetric - a.raceMetric);
    const place = ordered.indexOf(player) + 1;
    const pauseSub = document.querySelector('#pause-screen .result-sub');
    if (pauseSub) {
      pauseSub.textContent = `Lap ${Math.min(player.lap, TOTAL_LAPS)}/${TOTAL_LAPS} · ${placeStr(place)} · ${formatTime(raceTime)}`;
    }
  } else if (state === 'paused') {
    state = 'racing';
    showScreen(null);
    hud.classList.add('active');
    clock.getDelta();
    flashMsg('RESUME', 0.55, 'default');
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
