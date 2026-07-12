/**
 * 3D battle arena — Three.js stage with billboard Pokémon sprites + motion.
 */
import * as THREE from 'three';

export class Battle3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 450, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b8e0);
    this.scene.fog = new THREE.Fog(0x87b8e0, 12, 40);

    this.camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 100);
    this.camera.position.set(0, 3.2, 7.5);
    this.camera.lookAt(0, 1.2, 0);

    const hemi = new THREE.HemisphereLight(0xfff2d9, 0x3a5a2a, 0.9);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.1);
    sun.position.set(4, 10, 6);
    this.scene.add(sun);

    // Arena ground
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(8, 48),
      new THREE.MeshStandardMaterial({ color: 0x5a9e4a, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Platforms
    this.enemyPlat = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.6, 0.25, 24),
      new THREE.MeshStandardMaterial({ color: 0xd4b896 })
    );
    this.enemyPlat.position.set(2.2, 0.12, -1.5);
    this.scene.add(this.enemyPlat);

    this.playerPlat = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.6, 0.25, 24),
      new THREE.MeshStandardMaterial({ color: 0xc4a35a })
    );
    this.playerPlat.position.set(-2.2, 0.12, 1.8);
    this.scene.add(this.playerPlat);

    // Soft sky dome ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(7, 0.08, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    this.scene.add(ring);

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
        const knock = hit > 0 ? Math.sin(hit * Math.PI) * 0.35 : 0;
        this.enemySprite.position.x = base.x + (1 - ease) * 2.5 + knock;
        this.enemySprite.position.y = base.y + Math.sin(t * 2.2) * 0.08;
        this.enemySprite.position.z = base.z;
        this.enemySprite.material.opacity = ease * (hit > 0.5 ? 0.35 : 1);
        const bs = this.enemySprite.userData.baseScale || { x: 2.4, y: 2.4 };
        const pulse = 1 + Math.sin(t * 3) * 0.04 + (hit > 0 ? Math.sin(hit * Math.PI) * 0.15 : 0);
        this.enemySprite.scale.set(bs.x * pulse * ease, bs.y * pulse * ease, 1);
        if (hit > 0) this.hitFx.enemy = Math.max(0, hit - dt * 3);
      }
      if (this.playerSprite) {
        const base = this.playerBase;
        const hit = this.hitFx.player;
        const knock = hit > 0 ? -Math.sin(hit * Math.PI) * 0.35 : 0;
        this.playerSprite.position.x = base.x - (1 - ease) * 2.5 + knock;
        this.playerSprite.position.y = base.y + Math.sin(t * 2.2 + 1) * 0.06;
        this.playerSprite.position.z = base.z;
        this.playerSprite.material.opacity = ease * (hit > 0.5 ? 0.35 : 1);
        const bs = this.playerSprite.userData.baseScale || { x: 2.6, y: 2.6 };
        const pulse = 1 + Math.sin(t * 3 + 1) * 0.04 + (hit > 0 ? Math.sin(hit * Math.PI) * 0.15 : 0);
        this.playerSprite.scale.set(bs.x * pulse * ease, bs.y * pulse * ease, 1);
        if (hit > 0) this.hitFx.player = Math.max(0, hit - dt * 3);
      }

      // Platform subtle spin shimmer
      this.enemyPlat.rotation.y = t * 0.15;
      this.playerPlat.rotation.y = -t * 0.12;

      // Floating motes
      for (const mote of this.motes) {
        const ph = mote.userData.phase;
        mote.position.y = 0.8 + Math.sin(t * mote.userData.speed + ph) * 1.2;
        mote.position.x += Math.sin(t * 0.3 + ph) * 0.002;
        mote.material.opacity = 0.15 + Math.sin(t * 2 + ph) * 0.15;
      }

      // Subtle camera sway
      this.camera.position.x = Math.sin(t * 0.3) * 0.25;
      this.camera.position.y = 3.2 + Math.sin(t * 0.5) * 0.08;
      this.camera.lookAt(0, 1.2, 0);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  stop() {
    this.active = false;
    if (this._animId) cancelAnimationFrame(this._animId);
  }

  flashHit(side) {
    if (side === 'enemy') this.hitFx.enemy = 1;
    else this.hitFx.player = 1;
    const spr = side === 'enemy' ? this.enemySprite : this.playerSprite;
    if (!spr) return;
    // Brief white flash via opacity + material color if possible
    const mat = spr.material;
    if (mat.color) {
      const orig = mat.color.getHex();
      mat.color.setHex(0xffffff);
      setTimeout(() => mat.color.setHex(orig), 90);
    }
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
