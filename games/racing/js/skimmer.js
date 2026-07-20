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

  return {
    root,
    wings: [wingL, wingR],
    light,
    trail,
    trailPos,
    trailIdx: 0,
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
  }

  get raceMetric() {
    return this.lap - 1 + this.progress + (this.finished ? 100 : 0);
  }

  get boostMul() {
    if (this.boostTimer <= 0) return 1;
    if (this.isPlayer) return 1.78;
    return this.ai?.boostPower ?? 1.22;
  }

  updateAI(dt, track, racers) {
    if (!this.ai || this.finished) return;
    const skill = this.ai.skill ?? 0.4;

    const player = racers.find((r) => r.isPlayer);
    let gap = 0;
    if (player) gap = this.raceMetric - player.raceMetric;

    // Approximate cornering via track tangent change — ease off in bends, push on straights
    const frame = track.getFrame(this.progress);
    const ahead = track.getFrame((this.progress + 0.018) % 1);
    const bend = 1 - Math.abs(frame.tangent.dot(ahead.tangent));
    const straightMul = THREE.MathUtils.lerp(0.9, 1, 1 - bend * 4.5);
    const baseThrottle = this.ai.throttle ?? 0.78;
    this.throttle = THREE.MathUtils.clamp(baseThrottle * straightMul, 0.68, 0.92);

    // Inside-line bias on curves; personality weave on straights
    const weaveAmp = (this.ai.weaveAmp ?? 0.55) * (1 - bend * 0.65);
    const weave = Math.sin(performance.now() * 0.001 * this.ai.weave + this.ai.phase) * weaveAmp;
    const insideLine = bend > 0.08 ? Math.sin(this.progress * Math.PI * 2) * 0.35 * bend : 0;
    const targetLat = THREE.MathUtils.clamp(
      weave + (this.ai.laneBias || 0) + insideLine,
      -0.88,
      0.88
    );
    const react = 1.1 + skill * 0.85 + (gap < -0.04 ? 0.35 : 0);
    this.lateral += (targetLat - this.lateral) * Math.min(1, dt * react);

    if (this.boostCooldown > 0) this.boostCooldown -= dt;

    const minCharge = this.ai.boostMinCharge ?? 70;
    const canBoost = this.spectrum >= minCharge && this.boostCooldown <= 0 && this.boostTimer <= 0;
    if (canBoost) {
      const behind = gap < -0.025;
      const close = gap >= -0.025 && gap < 0.1;
      let chance = 0;
      if (behind) chance = this.ai.boostRateBehind ?? 0.12;
      else if (close) chance = this.ai.boostRateClose ?? 0.04;
      else chance = this.ai.boostRateAhead ?? 0.008;

      // Rivals save boost for straights and duels — no hidden speed cheats
      if (straightMul > 0.94 || behind) chance *= 1.35;
      if (Math.random() < dt * chance) this.tryBoost();
    }

    // Fixed ceiling per rival — challenge comes from lines and boost timing, not rubberband speed
    this.maxSpeed = this.ai.baseMax;
    if (gap < -0.12 && straightMul > 0.95) {
      this.throttle = Math.min(0.95, this.throttle + dt * (0.4 + skill * 0.5));
    }
  }

  tryBoost() {
    if (this.spectrum < 30 || this.boostTimer > 0 || this.finished) return false;
    if (this.boostCooldown > 0) return false;

    if (this.isPlayer) {
      const cost = Math.min(this.spectrum, 40);
      this.spectrum -= cost;
      this.boostTimer = 1.45 + (cost / 40) * 0.55;
      this.boostCooldown = 0.3;
      const punch = 8 + (cost / 40) * 14;
      this.speed = Math.min(this.maxSpeed * this.boostMul, this.speed + punch);
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

    const driftMul = this.drift ? 0.9 : 1;
    const boostAccel = this.boostTimer > 0 && this.isPlayer ? 1.45 : 1;
    const target = Math.max(0, this.throttle) * this.maxSpeed * this.boostMul * driftMul;
    if (this.throttle >= 0) {
      const accelScale = this.isPlayer ? 1.28 : 1;
      this.speed += (target - this.speed) * Math.min(1, (this.accel * accelScale * boostAccel * dt) / this.maxSpeed);
    } else {
      this.speed = Math.max(0, this.speed - this.brake * dt);
    }
    if (this.throttle === 0 && !this.finished) {
      this.speed = Math.max(0, this.speed - 8 * dt);
    }

    const speedRatio = THREE.MathUtils.clamp(this.speed / this.maxSpeed, 0, 1);
    const steerPower =
      this.turnRate *
      (this.drift ? 1.85 : 1) *
      (0.52 + speedRatio * 0.55) *
      (this.isPlayer ? 1.42 : 1);
    if (this.isPlayer) {
      const steerInput = this.steer;
      this.lateral += steerInput * steerPower * dt * 0.92;
      // Snap back toward center when not steering — tighter Dawnshard response
      if (Math.abs(steerInput) < 0.01) {
        this.lateral *= 1 - Math.min(1, dt * (this.drift ? 1.8 : 3.2));
      }
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

    if (this.drift && this.speed > 8) {
      const steerBonus = this.isPlayer ? Math.abs(this.steer) * 10 : 2;
      const speedBonus = speedRatio * 8;
      const chargeRate = (this.isPlayer ? 22 : 8) + steerBonus + speedBonus;
      this.spectrum = Math.min(100, this.spectrum + dt * chargeRate);
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
    this.mesh.light.intensity = this.boostTimer > 0 ? 3.2 : 1.3;

    if (this.speed > 5) {
      const idx = this.mesh.trailIdx % 40;
      const back = pos.clone().addScaledVector(lookDir, -2.2);
      this.mesh.trailPos[idx * 3] = back.x + (Math.random() - 0.5) * 0.4;
      this.mesh.trailPos[idx * 3 + 1] = back.y;
      this.mesh.trailPos[idx * 3 + 2] = back.z + (Math.random() - 0.5) * 0.4;
      this.mesh.trailIdx++;
      this.mesh.trail.geometry.attributes.position.needsUpdate = true;
    }
  }

  checkPickups(track) {
    const empty = { orb: false, gate: false };
    if (this.finished) return empty;
    const pos = this.mesh.root.position;

    const orbGain = this.isPlayer ? 24 : this.ai?.orbGain ?? 10;
    const gateSpec = this.isPlayer ? 20 : this.ai?.gateSpec ?? 8;
    const gateSpeed = this.isPlayer ? 12 : this.ai?.gateSpeed ?? 4;
    const pickupRadius = this.isPlayer ? 3.6 : 2.6;
    let pickedOrb = false;
    let hitGate = false;

    for (const orb of track.orbs) {
      if (orb.taken) continue;
      if (pos.distanceTo(orb.mesh.position) < pickupRadius) {
        orb.taken = true;
        orb.mesh.visible = false;
        if (orb.glow) orb.glow.visible = false;
        this.orbs += 1;
        this.spectrum = Math.min(100, this.spectrum + orbGain);
        pickedOrb = true;
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
        gate._flash = 0.55;
        hitGate = true;
      }
    }

    return { orb: pickedOrb, gate: hitGate };
  }
}

export const RIVAL_NAMES = ['Nyx Arc', 'Sol Vire', 'Ember Quill'];
