import * as THREE from 'three';
import { makeHullMaterial } from './textures.js';

const PALETTES = {
  player: { body: 0xc4b5fd, accent: 0x3de8ff, glow: 0x3de8ff, trail: 0x67e8f9 },
  rival0: { body: 0xf9a8d4, accent: 0xff3d9a, glow: 0xff3d9a, trail: 0xf472b6 },
  rival1: { body: 0xfde68a, accent: 0xffc857, glow: 0xfbbf24, trail: 0xfcd34d },
  rival2: { body: 0x6ee7b7, accent: 0x34d399, glow: 0x10b981, trail: 0x34d399 },
};

/** Shared texture pack set by main after load. */
let texturePack = null;
export function setSkimmerTextures(pack) {
  texturePack = pack;
}

export function createSkimmer(paletteKey = 'player') {
  const pal = PALETTES[paletteKey] || PALETTES.player;
  const pack = texturePack || {};
  const root = new THREE.Group();

  const hull = new THREE.Mesh(
    new THREE.ConeGeometry(1.15, 3.7, 6),
    makeHullMaterial(pack, pal.body, pal.glow)
  );
  hull.rotation.x = -Math.PI / 2;
  hull.position.y = 0.4;
  root.add(hull);

  const belly = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.18, 2.4),
    makeHullMaterial(pack, 0x1e1b4b, pal.glow)
  );
  belly.position.set(0, 0.15, 0.3);
  root.add(belly);

  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshPhysicalMaterial({
      color: 0xfff7ed,
      emissive: 0xffc857,
      emissiveIntensity: 0.55,
      metalness: 0.15,
      roughness: 0.08,
      transparent: true,
      opacity: 0.78,
      transmission: 0.55,
      thickness: 0.4,
      envMap: pack.envMap || null,
      envMapIntensity: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    })
  );
  canopy.position.set(0, 0.95, -0.2);
  root.add(canopy);

  const wingGeo = new THREE.BoxGeometry(3.2, 0.1, 1.25);
  const wingMat = new THREE.MeshPhysicalMaterial({
    color: pal.accent,
    emissive: pal.glow,
    emissiveIntensity: 1.35,
    metalness: 0.25,
    roughness: 0.2,
    transparent: true,
    opacity: 0.82,
    transmission: 0.35,
    thickness: 0.2,
    envMap: pack.envMap || null,
    envMapIntensity: 1.1,
  });
  if (pack.railEmissive) {
    wingMat.map = pack.railEmissive;
    wingMat.emissiveMap = pack.railEmissive;
  }
  const wingL = new THREE.Mesh(wingGeo, wingMat);
  wingL.position.set(-1.4, 0.35, 0.15);
  wingL.rotation.z = 0.25;
  wingL.rotation.y = 0.15;
  root.add(wingL);
  const wingR = wingL.clone();
  wingR.position.x = 1.4;
  wingR.rotation.z = -0.25;
  wingR.rotation.y = -0.15;
  root.add(wingR);

  const glowMap =
    paletteKey === 'rival0'
      ? pack.glowPink
      : paletteKey === 'rival1'
        ? pack.glowGold
        : pack.glowCyan;
  if (glowMap) {
    for (const side of [-1.6, 1.6]) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowMap,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          color: pal.accent,
        })
      );
      sp.scale.set(2.8, 1.4, 1);
      sp.position.set(side, 0.35, 0.2);
      root.add(sp);
    }
  }

  const thrusterMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: pal.glow,
    emissiveIntensity: 2.4,
    metalness: 0.5,
    roughness: 0.2,
  });
  for (const x of [-0.55, 0.55]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.5, 10), thrusterMat);
    t.position.set(x, -0.05, 1.15);
    t.rotation.x = Math.PI / 2;
    root.add(t);
  }

  const light = new THREE.PointLight(pal.glow, 1.6, 20);
  light.position.set(0, 0.8, 0.4);
  root.add(light);

  const trailCount = 40;
  const trailPos = new Float32Array(trailCount * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  const trail = new THREE.Points(
    trailGeo,
    new THREE.PointsMaterial({
      color: pal.trail,
      size: 0.42,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      sizeAttenuation: true,
      map: glowMap || pack.glowCyan || null,
      blending: THREE.AdditiveBlending,
    })
  );
  root.add(trail);

  // Precomputed wake colors: brighter/hotter variants used while drifting or boosting,
  // so the trail material can be lerped toward them without recomputing color math per-frame.
  const trailBaseColor = new THREE.Color(pal.trail);
  const trailDriftColor = trailBaseColor.clone().offsetHSL(0, 0.12, 0.22);
  const trailBoostColor = new THREE.Color(0xffffff).lerp(new THREE.Color(pal.accent), 0.4);

  return {
    root,
    wings: [wingL, wingR],
    light,
    trail,
    trailPos,
    trailIdx: 0,
    trailCount,
    trailBaseColor,
    trailDriftColor,
    trailBoostColor,
    palette: pal,
  };
}

export class Racer {
  constructor(opts) {
    this.name = opts.name;
    this.isPlayer = !!opts.isPlayer;
    this.mesh = createSkimmer(opts.palette || 'player');
    this.progress = opts.startProgress || 0;
    this.lateral = opts.lateral || 0;
    this.speed = 0;
    this.maxSpeed = opts.maxSpeed || 42;
    this.accel = opts.accel || 28;
    this.brake = opts.brake || 36;
    this.turnRate = opts.turnRate || 2.4;
    this.spectrum = 0;
    this.boostTimer = 0;
    this.boostCooldown = 0;
    this.drift = false;
    this.lap = 1;
    this.finished = false;
    this.finishTime = null;
    this.orbs = 0;
    this.lapTimes = [];
    this.lapStart = 0;
    this.prevProgress = this.progress;
    this.steer = 0;
    this.throttle = 0;
    this.hoverPhase = Math.random() * Math.PI * 2;
    this.ai = opts.ai || null;
    this.finishedPlace = null;
    this.totalDistance = 0;
    this.gateHits = new Map();
    // Dynamic rubber-banding state (AI only) — see updateAI().
    this.aiRaceClock = 0;
    this.rubberband = 1;
  }

  get raceMetric() {
    return this.lap - 1 + this.progress + (this.finished ? 100 : 0);
  }

  get boostMul() {
    if (this.boostTimer <= 0) return 1;
    if (this.isPlayer) return 1.65;
    return this.ai?.boostPower ?? 1.22;
  }

  updateAI(dt, track, racers) {
    if (!this.ai || this.finished) return;
    const skill = this.ai.skill;
    this.aiRaceClock += dt;

    const weaveAmp = this.ai.weaveAmp ?? 0.55;
    const weave = Math.sin(performance.now() * 0.001 * this.ai.weave + this.ai.phase) * weaveAmp;
    const targetLat = THREE.MathUtils.clamp(weave + (this.ai.laneBias || 0), -0.88, 0.88);
    this.lateral += (targetLat - this.lateral) * dt * (0.9 + skill * 0.5);

    if (this.boostCooldown > 0) this.boostCooldown -= dt;

    const player = racers.find((r) => r.isPlayer);
    let gap = 0;
    if (player) gap = this.raceMetric - player.raceMetric;

    // Dynamic rubber-banding: nudge (not override) this rival's aggressiveness based on
    // how far ahead/behind the player it is. Bounded to a subtle range so personality
    // (skill/weave/etc.) still dominates and nobody can trivially teleport past.
    // - Ramps in smoothly over RUBBERBAND_WARMUP seconds of actual racing so the first
    //   few seconds (and countdown, where updateAI isn't called at all) never feel odd.
    // - Heavily damped so already-close races stay smooth instead of jittering.
    const RUBBERBAND_WARMUP = 3; // seconds of racing before rubber-banding fully kicks in
    const RUBBERBAND_RANGE = 0.35; // gap (lap-fractions) at which the effect saturates
    const RUBBERBAND_MIN = 0.85;
    const RUBBERBAND_MAX = 1.15;
    const warmup = THREE.MathUtils.clamp(this.aiRaceClock / RUBBERBAND_WARMUP, 0, 1);
    // gap > 0 means this rival is ahead of the player -> ease down; gap < 0 -> behind -> assist.
    const norm = THREE.MathUtils.clamp(-gap / RUBBERBAND_RANGE, -1, 1);
    const bandSpread = norm >= 0 ? RUBBERBAND_MAX - 1 : 1 - RUBBERBAND_MIN;
    const targetBand = 1 + norm * bandSpread * warmup;
    this.rubberband = THREE.MathUtils.damp(this.rubberband, targetBand, 0.5, dt);

    // Throttle gets only a soft echo of the band so per-rival personality still reads clearly.
    const throttleBand = THREE.MathUtils.clamp(this.rubberband, 0.94, 1.06);
    this.throttle = (this.ai.throttle ?? 0.78) * throttleBand;

    const minCharge = this.ai.boostMinCharge ?? 70;
    const canBoost = this.spectrum >= minCharge && this.boostCooldown <= 0 && this.boostTimer <= 0;
    if (canBoost) {
      const behind = gap < -0.02;
      let chance = 0;
      if (behind) chance = this.ai.boostRateBehind ?? 0.12;
      else if (gap < 0.08) chance = this.ai.boostRateClose ?? 0.04;
      else chance = this.ai.boostRateAhead ?? 0.008;
      chance *= this.rubberband;

      if (Math.random() < dt * chance) this.tryBoost();
    }

    this.maxSpeed = this.ai.baseMax * this.rubberband;
  }

  tryBoost() {
    if (this.spectrum < 30 || this.boostTimer > 0 || this.finished) return false;
    if (this.boostCooldown > 0) return false;

    if (this.isPlayer) {
      const cost = Math.min(this.spectrum, 40);
      this.spectrum -= cost;
      this.boostTimer = 1.35 + (cost / 40) * 0.4;
      this.boostCooldown = 0.35;
    } else {
      const cost = Math.min(this.spectrum, 55);
      this.spectrum -= cost;
      this.boostTimer = 0.7 + (cost / 55) * 0.35;
      this.boostCooldown = this.ai?.boostCooldown ?? 3.5;
    }
    return true;
  }

  updatePhysics(dt, track, input) {
    if (this.finished) {
      this.speed = THREE.MathUtils.damp(this.speed, 8, 2, dt);
    } else if (this.isPlayer && input) {
      this.throttle = 0.72;
      if (input.forward) this.throttle = 1;
      if (input.back) this.throttle = -0.55;
      this.steer = 0;
      if (input.left) this.steer += 1;
      if (input.right) this.steer -= 1;
      this.drift = input.drift;
      if (input.boost) {
        if (this.tryBoost()) input.boostConsumed = true;
      }
    }

    if (this.boostCooldown > 0 && this.isPlayer) this.boostCooldown -= dt;

    const driftMul = this.drift ? 0.88 : 1;
    const target = Math.max(0, this.throttle) * this.maxSpeed * this.boostMul * driftMul;
    if (this.throttle >= 0) {
      const accelScale = this.isPlayer ? 1.15 : 1;
      this.speed += (target - this.speed) * Math.min(1, (this.accel * accelScale * dt) / this.maxSpeed);
    } else {
      this.speed = Math.max(0, this.speed - this.brake * dt);
    }
    if (this.throttle === 0 && !this.finished) {
      this.speed = Math.max(0, this.speed - 8 * dt);
    }

    const steerPower =
      this.turnRate *
      (this.drift ? 1.65 : 1) *
      (0.45 + this.speed / this.maxSpeed) *
      (this.isPlayer ? 1.35 : 1);
    if (this.isPlayer) {
      this.lateral += this.steer * steerPower * dt * 0.62;
    }
    this.lateral = THREE.MathUtils.clamp(this.lateral, -0.92, 0.92);

    const trackLen = track.curve.getLength();
    const dp = (this.speed * dt) / trackLen;
    this.prevProgress = this.progress;
    this.progress += dp;
    this.totalDistance += this.speed * dt;

    if (!this.finished && this.prevProgress > 0.85 && this.progress >= 1) {
      this.progress -= 1;
      const now = performance.now() / 1000;
      if (this.lapStart > 0) this.lapTimes.push(now - this.lapStart);
      this.lapStart = now;
      this.lap += 1;
    } else if (this.progress >= 1) {
      this.progress -= 1;
    }

    if (this.boostTimer > 0) this.boostTimer -= dt;

    if (this.drift && this.speed > 10) {
      this.spectrum = Math.min(100, this.spectrum + dt * (this.isPlayer ? 16 : 8));
    }

    const frame = track.getFrame(this.progress);
    const halfW = track.width * 0.42;
    const hover = Math.sin(performance.now() * 0.006 + this.hoverPhase) * 0.18;
    const pos = frame.position
      .clone()
      .addScaledVector(frame.side, this.lateral * halfW)
      .addScaledVector(frame.up, 1.35 + hover);

    this.mesh.root.position.copy(pos);

    const lookDir = frame.tangent.clone();
    const bank = -this.lateral * 0.35 - (this.steer || 0) * 0.2;
    const lookTarget = pos.clone().add(lookDir);
    const m = new THREE.Matrix4().lookAt(pos, lookTarget, frame.up);
    const quat = new THREE.Quaternion().setFromRotationMatrix(m);
    const bankQ = new THREE.Quaternion().setFromAxisAngle(lookDir, bank);
    this.mesh.root.quaternion.copy(quat).multiply(bankQ);

    const flap = 0.2 + Math.sin(performance.now() * 0.01 + this.hoverPhase) * 0.08;
    if (this.mesh.wings[0]) {
      this.mesh.wings[0].rotation.z = 0.25 + flap;
      this.mesh.wings[1].rotation.z = -0.25 - flap;
    }
    const boosting = this.boostTimer > 0;
    this.mesh.light.intensity = boosting ? 3.2 : this.drift ? 1.7 : 1.3;

    // Drift trail / boost light-wake: lerp the trail's color, size and opacity toward
    // a hotter variant while actively drifting, and toward a bright streak while boosting.
    const trailMat = this.mesh.trail.material;
    let targetColor = this.mesh.trailBaseColor;
    let targetSize = 0.42;
    let targetOpacity = 0.75;
    if (this.drift) {
      targetColor = this.mesh.trailDriftColor;
      targetSize = 0.6;
      targetOpacity = 0.92;
    }
    if (boosting) {
      targetColor = this.mesh.trailBoostColor;
      targetSize = 0.9;
      targetOpacity = 1;
    }
    trailMat.color.lerp(targetColor, 1 - Math.exp(-dt * 8));
    trailMat.size = THREE.MathUtils.damp(trailMat.size, targetSize, 6, dt);
    trailMat.opacity = THREE.MathUtils.damp(trailMat.opacity, targetOpacity, 6, dt);

    if (this.speed > 5) {
      const trailCount = this.mesh.trailCount;
      const idx = this.mesh.trailIdx % trailCount;
      const spreadJitter = this.drift ? 0.7 : 0.4;
      const backDist = boosting ? 3.2 : 2.2;
      const back = pos.clone().addScaledVector(lookDir, -backDist);
      this.mesh.trailPos[idx * 3] = back.x + (Math.random() - 0.5) * spreadJitter;
      this.mesh.trailPos[idx * 3 + 1] = back.y;
      this.mesh.trailPos[idx * 3 + 2] = back.z + (Math.random() - 0.5) * spreadJitter;
      this.mesh.trailIdx++;
      this.mesh.trail.geometry.attributes.position.needsUpdate = true;
    }
  }

  checkPickups(track) {
    if (this.finished) return;
    const pos = this.mesh.root.position;

    const orbGain = this.isPlayer ? 24 : this.ai?.orbGain ?? 10;
    const gateSpec = this.isPlayer ? 20 : this.ai?.gateSpec ?? 8;
    const gateSpeed = this.isPlayer ? 12 : this.ai?.gateSpeed ?? 4;
    const pickupRadius = this.isPlayer ? 3.6 : 2.6;

    for (const orb of track.orbs) {
      if (orb.taken) continue;
      if (pos.distanceTo(orb.mesh.position) < pickupRadius) {
        orb.taken = true;
        orb.mesh.visible = false;
        if (orb.glow) orb.glow.visible = false;
        this.orbs += 1;
        this.spectrum = Math.min(100, this.spectrum + orbGain);
      }
    }

    for (let i = 0; i < track.gates.length; i++) {
      const gate = track.gates[i];
      const last = this.gateHits.get(i) || 0;
      const now = performance.now() / 1000;
      const cd = this.isPlayer ? 2.2 : 4.5;
      if (now - last < cd) continue;

      const dist = Math.abs(this.progress - gate.t);
      const wrap = Math.min(dist, 1 - dist);
      const latLimit = this.isPlayer ? 0.8 : 0.55;
      if (wrap < 0.016 && Math.abs(this.lateral) < latLimit) {
        this.spectrum = Math.min(100, this.spectrum + gateSpec);
        this.speed = Math.min(this.maxSpeed * 1.35, this.speed + gateSpeed);
        this.gateHits.set(i, now);
        gate.mesh.material.emissiveIntensity = 2.5;
        gate._flash = 0.4;
      }
    }
  }
}

export const RIVAL_NAMES = ['Nyx Arc', 'Sol Vire', 'Ember Quill'];
