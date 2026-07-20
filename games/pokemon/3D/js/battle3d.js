/**
 * 3D battle arena — Three.js stage with billboard Pokémon sprites + motion.
 */
import * as THREE from 'three';

const TYPE_HIT_COLORS = {
  fire: 0xff6633, water: 0x44aaff, grass: 0x55cc55, electric: 0xffee33,
  ice: 0xa8f0ff, fighting: 0xcc4422, poison: 0xaa44cc, ground: 0xccaa55,
  flying: 0x99bbff, psychic: 0xff66aa, bug: 0xaabb22, rock: 0xaa9955,
  ghost: 0x7744aa, dragon: 0x6644ff, normal: 0xffffff,
};

export class Battle3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 450, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x4a7ab0);
    this.scene.fog = new THREE.Fog(0x5a8ac0, 14, 42);

    this.camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 100);
    this.cameraBase = { x: 0, y: 3.2, z: 7.5 };
    this.camera.position.copy(this.cameraBase);
    this.camera.lookAt(0, 1.2, 0);
    this.shakeT = 0;
    this.shakeAmp = 0;

    const hemi = new THREE.HemisphereLight(0xfff8e8, 0x1a3a22, 0.75);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.0);
    sun.position.set(4, 10, 6);
    this.scene.add(sun);

    // Arena spotlights on fighters
    this.enemySpot = new THREE.SpotLight(0xffeedd, 2.2, 18, Math.PI / 5, 0.35, 1);
    this.enemySpot.position.set(2.2, 8, -1.5);
    this.enemySpot.target.position.set(2.2, 0, -1.5);
    this.scene.add(this.enemySpot);
    this.scene.add(this.enemySpot.target);

    this.playerSpot = new THREE.SpotLight(0xdde8ff, 2.0, 18, Math.PI / 5, 0.35, 1);
    this.playerSpot.position.set(-2.2, 8, 1.8);
    this.playerSpot.target.position.set(-2.2, 0, 1.8);
    this.scene.add(this.playerSpot);
    this.scene.add(this.playerSpot.target);

    // Rim/back lights for silhouette pop
    const rim = new THREE.DirectionalLight(0x88bbff, 0.45);
    rim.position.set(-6, 4, -8);
    this.scene.add(rim);

    // Arena ground — darker center ring for focus
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(8, 48),
      new THREE.MeshStandardMaterial({ color: 0x3d7a32, roughness: 0.92, metalness: 0.02 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(3.2, 7.8, 48),
      new THREE.MeshStandardMaterial({
        color: 0x5a9e4a, roughness: 0.88, emissive: 0x1a4020, emissiveIntensity: 0.15,
      })
    );
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.01;
    this.scene.add(innerRing);

    // Platforms
    this.enemyPlat = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.6, 0.25, 24),
      new THREE.MeshStandardMaterial({ color: 0xd4b896, emissive: 0x332211, emissiveIntensity: 0.08 })
    );
    this.enemyPlat.position.set(2.2, 0.12, -1.5);
    this.scene.add(this.enemyPlat);

    this.playerPlat = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.6, 0.25, 24),
      new THREE.MeshStandardMaterial({ color: 0xc4a35a, emissive: 0x332211, emissiveIntensity: 0.08 })
    );
    this.playerPlat.position.set(-2.2, 0.12, 1.8);
    this.scene.add(this.playerPlat);

    // Arena boundary ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(7, 0.1, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    this.scene.add(ring);

    // Hit flash plane (fullscreen in arena feel)
    this.flashPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
    );
    this.flashPlane.position.set(0, 3, 0);
    this.scene.add(this.flashPlane);

    // Hit particle pool
    this.hitParticles = [];
    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);
    for (let i = 0; i < 24; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 5, 5),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
      );
      p.userData.life = 0;
      this.particleGroup.add(p);
      this.hitParticles.push(p);
    }

    // Ambient particles (simple floating motes)
    this.motes = [];
    for (let i = 0; i < 18; i++) {
      const mote = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
      );
      mote.position.set((Math.random() - 0.5) * 10, 0.5 + Math.random() * 3, (Math.random() - 0.5) * 8);
      mote.userData.phase = Math.random() * Math.PI * 2;
      mote.userData.speed = 0.4 + Math.random() * 0.6;
      this.scene.add(mote);
      this.motes.push(mote);
    }

    this.enemySprite = null;
    this.playerSprite = null;
    this.enemyBase = { x: 2.2, y: 1.5, z: -1.5, scale: 1 };
    this.playerBase = { x: -2.2, y: 1.4, z: 1.8, scale: 1 };
    this.texLoader = new THREE.TextureLoader();
    this.clock = new THREE.Clock();
    this.active = false;
    this._animId = null;
    this.entranceT = 0;
    this.hitFx = { enemy: 0, player: 0 };
    this.lungeFx = { enemy: 0, player: 0 };
  }

  resize() {
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 450;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _makeBillboard(url, scale = 2.2) {
    return new Promise((resolve) => {
      this.texLoader.load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
          const spr = new THREE.Sprite(mat);
          const aspect = (tex.image?.width || 1) / (tex.image?.height || 1);
          spr.scale.set(scale * aspect, scale, 1);
          spr.userData.baseScale = { x: scale * aspect, y: scale };
          resolve(spr);
        },
        undefined,
        () => {
          const mat = new THREE.SpriteMaterial({ color: 0xffcb05 });
          const spr = new THREE.Sprite(mat);
          spr.scale.set(scale, scale, 1);
          spr.userData.baseScale = { x: scale, y: scale };
          resolve(spr);
        }
      );
    });
  }

  async setFighters(playerMon, enemyMon) {
    if (this.enemySprite) this.scene.remove(this.enemySprite);
    if (this.playerSprite) this.scene.remove(this.playerSprite);

    const enemyUrl = enemyMon.spriteAni || enemyMon.sprite || enemyMon.spriteArt;
    const playerUrl = playerMon.spriteAniBack || playerMon.spriteBack || playerMon.sprite;

    this.enemySprite = await this._makeBillboard(enemyUrl, 2.4);
    this.enemySprite.position.set(this.enemyBase.x + 2.5, this.enemyBase.y, this.enemyBase.z);
    this.enemySprite.material.opacity = 0;
    this.scene.add(this.enemySprite);

    this.playerSprite = await this._makeBillboard(playerUrl, 2.6);
    this.playerSprite.position.set(this.playerBase.x - 2.5, this.playerBase.y, this.playerBase.z);
    this.playerSprite.material.opacity = 0;
    this.scene.add(this.playerSprite);

    this.entranceT = 0;
    this.hitFx = { enemy: 0, player: 0 };
    this.lungeFx = { enemy: 0, player: 0 };
  }

  _spawnHitBurst(x, y, z, color = 0xffffff) {
    for (const p of this.hitParticles) {
      if (p.userData.life > 0) continue;
      p.position.set(x, y, z);
      p.material.color.setHex(color);
      p.material.opacity = 1;
      p.userData.life = 1;
      p.userData.vx = (Math.random() - 0.5) * 3;
      p.userData.vy = 0.5 + Math.random() * 2;
      p.userData.vz = (Math.random() - 0.5) * 3;
      break;
    }
  }

  _pulseFlash(color, intensity = 0.35) {
    if (!this.flashPlane?.material) return;
    this.flashPlane.material.color.setHex(color);
    this.flashPlane.material.opacity = intensity;
  }

  start() {
    this.active = true;
    this.resize();
    this.clock.start();
    const loop = () => {
      if (!this.active) return;
      this._animId = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      const t = this.clock.getElapsedTime();
      this.entranceT = Math.min(1, this.entranceT + dt * 1.8);

      // Entrance slide + fade
      const ease = 1 - Math.pow(1 - this.entranceT, 3);
      if (this.enemySprite) {
        const base = this.enemyBase;
        const hit = this.hitFx.enemy;
        const lunge = this.lungeFx.enemy;
        const knock = hit > 0 ? Math.sin(hit * Math.PI) * 0.45 : 0;
        const atkLunge = lunge > 0 ? Math.sin(lunge * Math.PI) * 0.55 : 0;
        this.enemySprite.position.x = base.x + (1 - ease) * 2.5 + knock - atkLunge;
        this.enemySprite.position.y = base.y + Math.sin(t * 2.2) * 0.08 + (hit > 0 ? Math.sin(hit * Math.PI * 4) * 0.06 : 0);
        this.enemySprite.position.z = base.z + atkLunge * 0.35;
        this.enemySprite.material.opacity = ease * (hit > 0.35 && hit < 0.85 ? 0.25 : 1);
        const bs = this.enemySprite.userData.baseScale || { x: 2.4, y: 2.4 };
        const pulse = 1 + Math.sin(t * 3) * 0.04 + (hit > 0 ? Math.sin(hit * Math.PI) * 0.18 : 0);
        this.enemySprite.scale.set(bs.x * pulse * ease, bs.y * pulse * ease, 1);
        if (hit > 0) this.hitFx.enemy = Math.max(0, hit - dt * 3.2);
        if (lunge > 0) this.lungeFx.enemy = Math.max(0, lunge - dt * 4);
      }
      if (this.playerSprite) {
        const base = this.playerBase;
        const hit = this.hitFx.player;
        const lunge = this.lungeFx.player;
        const knock = hit > 0 ? -Math.sin(hit * Math.PI) * 0.45 : 0;
        const atkLunge = lunge > 0 ? -Math.sin(lunge * Math.PI) * 0.55 : 0;
        this.playerSprite.position.x = base.x - (1 - ease) * 2.5 + knock - atkLunge;
        this.playerSprite.position.y = base.y + Math.sin(t * 2.2 + 1) * 0.06 + (hit > 0 ? Math.sin(hit * Math.PI * 4) * 0.06 : 0);
        this.playerSprite.position.z = base.z - atkLunge * 0.35;
        this.playerSprite.material.opacity = ease * (hit > 0.35 && hit < 0.85 ? 0.25 : 1);
        const bs = this.playerSprite.userData.baseScale || { x: 2.6, y: 2.6 };
        const pulse = 1 + Math.sin(t * 3 + 1) * 0.04 + (hit > 0 ? Math.sin(hit * Math.PI) * 0.18 : 0);
        this.playerSprite.scale.set(bs.x * pulse * ease, bs.y * pulse * ease, 1);
        if (hit > 0) this.hitFx.player = Math.max(0, hit - dt * 3.2);
        if (lunge > 0) this.lungeFx.player = Math.max(0, lunge - dt * 4);
      }

      // Platform subtle spin shimmer + spotlight breathe
      this.enemyPlat.rotation.y = t * 0.15;
      this.playerPlat.rotation.y = -t * 0.12;
      if (this.enemySpot) this.enemySpot.intensity = 2.0 + Math.sin(t * 2) * 0.25;
      if (this.playerSpot) this.playerSpot.intensity = 1.85 + Math.sin(t * 2 + 1) * 0.22;

      // Hit particles
      for (const p of this.hitParticles) {
        if (p.userData.life <= 0) continue;
        p.userData.life -= dt * 2.5;
        p.position.x += p.userData.vx * dt;
        p.position.y += p.userData.vy * dt;
        p.position.z += p.userData.vz * dt;
        p.userData.vy -= dt * 4;
        p.material.opacity = Math.max(0, p.userData.life);
        if (p.userData.life <= 0) p.material.opacity = 0;
      }

      // Flash fade
      if (this.flashPlane?.material && this.flashPlane.material.opacity > 0) {
        this.flashPlane.material.opacity = Math.max(0, this.flashPlane.material.opacity - dt * 3.5);
      }

      // Camera shake decay
      if (this.shakeT > 0) {
        this.shakeT = Math.max(0, this.shakeT - dt * 4);
        const s = this.shakeAmp * this.shakeT;
        this.camera.position.x = this.cameraBase.x + (Math.random() - 0.5) * s;
        this.camera.position.y = this.cameraBase.y + (Math.random() - 0.5) * s * 0.6;
      } else {
        this.camera.position.x = this.cameraBase.x + Math.sin(t * 0.3) * 0.25;
        this.camera.position.y = this.cameraBase.y + Math.sin(t * 0.5) * 0.08;
      }
      this.camera.position.z = this.cameraBase.z;
      this.camera.lookAt(0, 1.2, 0);

      // Floating motes
      for (const mote of this.motes) {
        const ph = mote.userData.phase;
        mote.position.y = 0.8 + Math.sin(t * mote.userData.speed + ph) * 1.2;
        mote.position.x += Math.sin(t * 0.3 + ph) * 0.002;
        mote.material.opacity = 0.15 + Math.sin(t * 2 + ph) * 0.15;
      }

      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  stop() {
    this.active = false;
    if (this._animId) cancelAnimationFrame(this._animId);
  }

  /** Attacker lunges toward opponent before impact. */
  attackLunge(side) {
    if (side === 'enemy') this.lungeFx.enemy = 1;
    else this.lungeFx.player = 1;
  }

  flashHit(side, moveType = 'normal', opts = {}) {
    const isCrit = !!opts.critical;
    const eff = opts.effectiveness ?? 1;
    if (side === 'enemy') this.hitFx.enemy = 1;
    else this.hitFx.player = 1;

    const spr = side === 'enemy' ? this.enemySprite : this.playerSprite;
    const color = TYPE_HIT_COLORS[moveType] || TYPE_HIT_COLORS.normal;
    if (spr) {
      this._spawnHitBurst(spr.position.x, spr.position.y, spr.position.z, color);
      const mat = spr.material;
      if (mat.color) {
        const orig = mat.color.getHex();
        mat.color.setHex(0xffffff);
        setTimeout(() => mat.color.setHex(orig), isCrit ? 140 : 90);
      }
    }

    let flashInt = isCrit ? 0.5 : 0.28;
    if (eff > 1) flashInt += 0.12;
    if (eff === 0) flashInt = 0.15;
    this._pulseFlash(color, flashInt);
    this.shakeAmp = isCrit ? 0.35 : eff > 1 ? 0.28 : 0.18;
    this.shakeT = 1;
  }

  faint(side) {
    const spr = side === 'enemy' ? this.enemySprite : this.playerSprite;
    if (!spr) return;
    const startY = spr.position.y;
    const startSx = spr.scale.x;
    const startSy = spr.scale.y;
    const start = performance.now();
    const anim = (now) => {
      const k = Math.min(1, (now - start) / 700);
      spr.position.y = startY - k * 1.4;
      spr.scale.set(startSx * (1 - k * 0.4), startSy * (1 - k * 0.7), 1);
      spr.material.opacity = 1 - k;
      if (k < 1) requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }
}
