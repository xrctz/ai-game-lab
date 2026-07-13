// DEAD ZONE: EVACUATION - Game Bundle
const THREE = window.THREE;

// --- utils/MathUtils.js ---

const MathUtils = {
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    smoothstep(edge0, edge1, x) {
        const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    },

    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    },

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    randomPointInCircle(radius) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
        return { x: Math.cos(angle) * r, z: Math.sin(angle) * r };
    },

    distance2D(x1, z1, x2, z2) {
        const dx = x2 - x1;
        const dz = z2 - z1;
        return Math.sqrt(dx * dx + dz * dz);
    },

    distance3D(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },

    angleBetween(x1, z1, x2, z2) {
        return Math.atan2(x2 - x1, z2 - z1);
    },

    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    },

    easeOutQuad(t) {
        return t * (2 - t);
    },

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },

    damp(current, target, smoothing, dt) {
        return MathUtils.lerp(current, target, 1 - Math.exp(-smoothing * dt));
    }
};

// --- utils/ObjectPool.js ---

class ObjectPool {
    constructor(factory, reset, initialSize = 20) {
        this.factory = factory;
        this.reset = reset;
        this.pool = [];
        this.active = new Set();

        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.factory());
        }
    }

    get() {
        let obj = this.pool.pop();
        if (!obj) {
            obj = this.factory();
        }
        this.active.add(obj);
        return obj;
    }

    release(obj) {
        if (this.active.delete(obj)) {
            this.reset(obj);
            this.pool.push(obj);
        }
    }

    releaseAll() {
        for (const obj of this.active) {
            this.reset(obj);
            this.pool.push(obj);
        }
        this.active.clear();
    }

    get activeCount() {
        return this.active.size;
    }
}

// --- engine/Audio.js ---

class AudioSystem {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.ambientGain = null;
        this.initialized = false;
        this.sounds = {};
        this.music = null;
    }

    init() {
        if (this.initialized) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.connect(this.masterGain);

        this.musicGain = this.ctx.createGain();
        this.musicGain.connect(this.masterGain);

        this.ambientGain = this.ctx.createGain();
        this.ambientGain.connect(this.masterGain);

        this.setVolume(0.7);
        this.initialized = true;
        this._generateSounds();
    }

    setVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.value = value;
        }
    }

    _generateSounds() {
        this.sounds.rifleShot = this._createGunshot(0.08, 800, 200, 0.3);
        this.sounds.shotgunShot = this._createGunshot(0.15, 400, 100, 0.5);
        this.sounds.pistolShot = this._createGunshot(0.06, 1200, 300, 0.25);
        this.sounds.reload = this._createReloadSound();
        this.sounds.empty = this._createClickSound();
        this.sounds.hit = this._createHitSound();
        this.sounds.headshot = this._createHeadshotSound();
        this.sounds.zombieAttack = this._createZombieAttack();
        this.sounds.zombieDeath = this._createZombieDeath();
        this.sounds.zombieGrowl = this._createZombieGrowl();
        this.sounds.damage = this._createDamageSound();
        this.sounds.footstep = this._createFootstep();
        this.sounds.grenade = this._createGrenadeSound();
        this.sounds.melee = this._createMeleeSound();
        this.sounds.pickup = this._createPickupSound();
        this.sounds.allyCallout = this._createCalloutSound();
        this.sounds.waveStart = this._createWaveStartSound();
        this.sounds.waveEnd = this._createWaveEndSound();
    }

    _createBuffer(duration, fn) {
        const sampleRate = this.ctx.sampleRate;
        const length = Math.floor(duration * sampleRate);
        const buffer = this.ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        fn(data, sampleRate, length);
        return buffer;
    }

    _createGunshot(duration, freqStart, freqEnd, noiseAmount) {
        return this._createBuffer(duration, (data, sr, len) => {
            for (let i = 0; i < len; i++) {
                const t = i / len;
                const freq = freqStart + (freqEnd - freqStart) * t;
                const env = Math.exp(-t * 20);
                const tone = Math.sin(2 * Math.PI * freq * t) * (1 - noiseAmount);
                const noise = (Math.random() * 2 - 1) * noiseAmount;
                data[i] = (tone + noise) * env;
            }
        });
    }

    _createReloadSound() {
        return this._createBuffer(0.5, (data, sr, len) => {
            for (let i = 0; i < len; i++) {
                const t = i / len;
                let v = 0;
                if (t < 0.1) {
                    v = (Math.random() * 2 - 1) * (t / 0.1) * 0.3;
                } else if (t > 0.3 && t < 0.4) {
                    v = Math.sin(2 * Math.PI * 600 * t) * ((t - 0.3) / 0.1) * 0.2;
                } else if (t > 0.7 && t < 0.8) {
                    v = (Math.random() * 2 - 1) * 0.4;
                }
                data[i] = v * (1 - t * 0.5);
            }
        });
    }

    _createClickSound() {
        return this._createBuffer(0.05, (data, sr, len) => {
            for (let i = 0; i < len; i++) {
                const t = i / len;
                data[i] = Math.sin(2 * Math.PI * 1500 * t) * Math.exp(-t * 40) * 0.3;
            }
        });
    }

    _createHitSound() {
        return this._createBuffer(0.1, (data, sr, len) => {
            for (let i = 0; i < len; i++) {
                const t = i / len;
                data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 15) * 0.4 +
                          Math.sin(2 * Math.PI * 300 * t) * Math.exp(-t * 20) * 0.2;
            }
        });
    }

    _createHeadshotSound() {
        return this._createBuffer(0.15, (data, sr, len) => {
            for (let i = 0; i < len; i++) {
                const t = i / len;
                data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 10) * 0.5 +
                          Math.sin(2 * Math.PI * 500 * t) * Math.exp(-t * 15) * 0.3;
            }
        });
    }

    _createZombieAttack() {
        return this._createBuffer(0.3, (data, sr, len) => {
            for (let i = 0; i < len; i++) {
                const t = i / len;
                const freq = 150 + Math.sin(t * 30) * 50;
                data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 3) * 0.4 +
                          (Math.random() * 2 - 1) * 0.2 * Math.exp(-t * 5);
            }
        });
    }

    _createZombieDeath() {
        return this._createBuffer(0.5, (data, sr, len) => {
            for (let i = 0; i < len; i++) {
                const t = i / len;
                const freq = 200 - t * 150;
                data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 2) * 0.3 +
                          (Math.random() * 2 - 1) * 0.15 * Math.exp(-t * 3);
            }
        });
    }

    _createZombieGrowl() {
        return this._createBuffer(0.8, (data, sr, len) => {
            for (let i = 0; i < len; i++) {
                const t = i / len;
                const freq = 80 + Math.sin(t * 5) * 30;
                const env = Math.sin(t * Math.PI) * 0.25;
                data[i] = Math.sin(2 * Math.PI * freq * t) * env +
                          (Math.random() * 2 - 1) * 0.1 * env;
            }
        });
    }

    _createDamageSound() {
        return this._createBuffer(0.15, (data, sr, len) => {
            for (let i = 0; i < len; i++) {
                const t = i / len;
                data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 8) * 0.5;
            }
        });
    }

    _createFootstep() {
        return this._createBuffer(0.08, (data, sr, len) => {
            for (let i = 0; i < len; i++) {
                const t = i / len;
                data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 20) * 0.15;
            }
        });
    }

    _createGrenadeSound() {
        return this._createBuffer(0.8, (data, sr, len) => {
            for (let i = 0; i < len; i++) {
                const t = i / len;
                const env = Math.exp(-t * 3);
                data[i] = (Math.random() * 2 - 1) * env * 0.6 +
                          Math.sin(2 * Math.PI * 60 * t) * env * 0.4;
            }
        });
    }

    _createMeleeSound() {
        return this._createBuffer(0.15, (data, sr, len) => {
            for (let i = 0; i < len; i++) {
                const t = i / len;
                const freq = 200 + (1 - t) * 300;
                data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 10) * 0.3;
            }
        });
    }

    _createPickupSound() {
        return this._createBuffer(0.2, (data, sr, len) => {
            for (let i = 0; i < len; i++) {
                const t = i / len;
                const freq = 400 + t * 600;
                data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 5) * 0.2;
            }
        });
    }

    _createCalloutSound() {
        return this._createBuffer(0.15, (data, sr, len) => {
            for (let i = 0; i < len; i++) {
                const t = i / len;
                data[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 8) * 0.15;
            }
        });
    }

    _createWaveStartSound() {
        return this._createBuffer(1.0, (data, sr, len) => {
            for (let i = 0; i < len; i++) {
                const t = i / len;
                const freq = 200 + t * 400;
                const env = Math.sin(t * Math.PI) * 0.3;
                data[i] = Math.sin(2 * Math.PI * freq * t) * env;
            }
        });
    }

    _createWaveEndSound() {
        return this._createBuffer(0.8, (data, sr, len) => {
            for (let i = 0; i < len; i++) {
                const t = i / len;
                const freq = 600 - t * 400;
                const env = Math.sin(t * Math.PI) * 0.25;
                data[i] = Math.sin(2 * Math.PI * freq * t) * env;
            }
        });
    }

    play(name, volume = 1.0) {
        if (!this.initialized || !this.sounds[name]) return;
        const source = this.ctx.createBufferSource();
        source.buffer = this.sounds[name];
        const gain = this.ctx.createGain();
        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(this.sfxGain);
        source.start();
    }

    playPositional(name, position, listenerPos, volume = 1.0, maxDist = 30) {
        if (!this.initialized || !this.sounds[name]) return;
        const dx = position.x - listenerPos.x;
        const dz = position.z - listenerPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > maxDist) return;

        const attenuation = 1 - (dist / maxDist);
        const pan = Math.max(-1, Math.min(1, dx / maxDist));

        const source = this.ctx.createBufferSource();
        source.buffer = this.sounds[name];

        const gain = this.ctx.createGain();
        gain.gain.value = volume * attenuation;

        const panner = this.ctx.createStereoPanner();
        panner.pan.value = pan;

        source.connect(gain);
        gain.connect(panner);
        panner.connect(this.sfxGain);
        source.start();
    }

    startAmbient() {
        if (!this.initialized) return;
        if (this._ambientSource) return;

        const duration = 4;
        const buffer = this._createBuffer(duration, (data, sr, len) => {
            for (let i = 0; i < len; i++) {
                const t = i / len;
                const wind = Math.sin(t * 0.5) * 0.02;
                data[i] = (Math.random() * 2 - 1) * 0.015 + wind;
            }
        });

        this._ambientSource = this.ctx.createBufferSource();
        this._ambientSource.buffer = buffer;
        this._ambientSource.loop = true;
        this._ambientSource.connect(this.ambientGain);
        this._ambientSource.start();
    }
}

// --- engine/Input.js ---

class Input {
    constructor() {
        this.keys = {};
        this.keysJustPressed = {};
        this.keysJustReleased = {};
        this.mouse = { x: 0, y: 0, dx: 0, dy: 0 };
        this.mouseButtons = {};
        this.mouseButtonsJustPressed = {};
        this.mouseButtonsJustReleased = {};
        this.locked = false;
        this.mobileActive = false;
        this._mobileLookDx = 0;
        this._mobileLookDy = 0;
        this.embedded = false;
        this._lockRetryCount = 0;
        this._lockRetryMax = 1;

        try { this.embedded = window.self !== window.top; } catch(e) { this.embedded = true; }
        if (/[?&]embed=1(?:&|$)/.test(location.search)) this.embedded = true;

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onLockChange = this._onLockChange.bind(this);
        this._onLockError = this._onLockError.bind(this);

        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('mousedown', this._onMouseDown);
        document.addEventListener('mouseup', this._onMouseUp);
        document.addEventListener('pointerlockchange', this._onLockChange);
        document.addEventListener('pointerlockerror', this._onLockError);

        this.sensitivity = 0.002;
    }

    setSensitivity(value) {
        this.sensitivity = value * 0.001;
    }

    requestPointerLock(element) {
        this._lockRetryCount = 0;
        this._attemptLock(element);
    }

    _attemptLock(element) {
        try {
            var promise = element.requestPointerLock();
            if (promise && typeof promise.catch === 'function') {
                promise.catch(function(err) {
                    console.warn('[Dead Zone] Pointer lock failed:', err);
                });
            }
        } catch(e) {
            console.warn('[Dead Zone] Pointer lock error:', e);
        }
    }

    exitPointerLock() {
        try { document.exitPointerLock(); } catch(e) {}
    }

    _onLockError() {
        console.warn('[Dead Zone] pointerlockerror fired');
        if (this.embedded) {
            var overlay = document.getElementById('embed-overlay');
            var lockError = document.getElementById('embed-lock-error');
            if (overlay) overlay.style.display = 'grid';
            if (lockError) lockError.style.display = 'block';
        }
    }

    _onKeyDown(e) {
        if (!this.keys[e.code]) {
            this.keysJustPressed[e.code] = true;
        }
        this.keys[e.code] = true;
    }

    _onKeyUp(e) {
        this.keys[e.code] = false;
        this.keysJustReleased[e.code] = true;
    }

    _onMouseMove(e) {
        if (this.locked) {
            this.mouse.dx = e.movementX * this.sensitivity;
            this.mouse.dy = e.movementY * this.sensitivity;
        }
    }

    _onMouseDown(e) {
        if (!this.mouseButtons[e.button]) {
            this.mouseButtonsJustPressed[e.button] = true;
        }
        this.mouseButtons[e.button] = true;
    }

    _onMouseUp(e) {
        this.mouseButtons[e.button] = false;
        this.mouseButtonsJustReleased[e.button] = true;
    }

    _onLockChange() {
        this.locked = !!document.pointerLockElement;
    }

    isKeyDown(code) {
        return !!this.keys[code];
    }

    isKeyJustPressed(code) {
        return !!this.keysJustPressed[code];
    }

    isMouseDown(button = 0) {
        return !!this.mouseButtons[button];
    }

    isMouseJustPressed(button = 0) {
        return !!this.mouseButtonsJustPressed[button];
    }

    getMouseDelta() {
        if (this.mobileActive) {
            return { x: this._mobileLookDx, y: this._mobileLookDy };
        }
        return { x: this.mouse.dx, y: this.mouse.dy };
    }

    update() {
        this.mouse.dx = 0;
        this.mouse.dy = 0;
        if (this.mobileActive) {
            this._mobileLookDx = 0;
            this._mobileLookDy = 0;
        }
        this.keysJustPressed = {};
        this.keysJustReleased = {};
        this.mouseButtonsJustPressed = {};
        this.mouseButtonsJustReleased = {};
    }

    isLocked() {
        return this.locked || this.mobileActive;
    }

    setMobileActive(on) {
        this.mobileActive = !!on;
    }

    addMobileLook(dx, dy) {
        this._mobileLookDx += dx * this.sensitivity;
        this._mobileLookDy += dy * this.sensitivity;
    }

    setMobileKey(code, down) {
        if (down) {
            if (!this.keys[code]) this.keysJustPressed[code] = true;
            this.keys[code] = true;
        } else {
            this.keys[code] = false;
            this.keysJustReleased[code] = true;
        }
    }

    setMobileFire(down) {
        if (down) {
            if (!this.mouseButtons[0]) this.mouseButtonsJustPressed[0] = true;
            this.mouseButtons[0] = true;
        } else {
            this.mouseButtons[0] = false;
            this.mouseButtonsJustReleased[0] = true;
        }
    }
}

// --- engine/Renderer.js ---

class Renderer {
    constructor(canvas) {
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x1a0a0a, 0.008);
        this.scene.background = new THREE.Color(0x0a0505);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
        this.scene.add(this.camera);

        this._onResize = this._onResize.bind(this);
        window.addEventListener('resize', this._onResize);
    }

    setFOV(fov) {
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
    }

    _onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.renderer.dispose();
        window.removeEventListener('resize', this._onResize);
    }
}

// --- effects/CameraShake.js ---

class CameraShake {
    constructor() {
        this.intensity = 0;
        this.decay = 5;
        this.offsetX = 0;
        this.offsetY = 0;
        this.offsetZ = 0;
    }

    shake(intensity, duration = 0.2) {
        this.intensity = Math.max(this.intensity, intensity);
        this.decay = 1 / duration;
    }

    update(dt) {
        if (this.intensity > 0.001) {
            this.offsetX = (Math.random() - 0.5) * this.intensity;
            this.offsetY = (Math.random() - 0.5) * this.intensity;
            this.offsetZ = (Math.random() - 0.5) * this.intensity * 0.3;
            this.intensity *= Math.exp(-this.decay * dt);
        } else {
            this.offsetX = 0;
            this.offsetY = 0;
            this.offsetZ = 0;
            this.intensity = 0;
        }
    }

    applyTo(camera) {
        camera.position.x += this.offsetX;
        camera.position.y += this.offsetY;
        camera.position.z += this.offsetZ;
    }

    reset() {
        this.intensity = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.offsetZ = 0;
    }
}

// --- effects/Particles.js ---

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.emitters = [];
        this.particles = [];

        this._pool = new ObjectPool(
            () => {
                const geo = new THREE.SphereGeometry(0.05, 4, 4);
                const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.visible = false;
                this.scene.add(mesh);
                return {
                    mesh,
                    velocity: new THREE.Vector3(),
                    life: 0,
                    maxLife: 0,
                    size: 0.05,
                    color: new THREE.Color(1, 1, 1),
                    gravity: true
                };
            },
            (p) => {
                p.mesh.visible = false;
                p.life = 0;
            },
            100
        );
    }

    emit(config) {
        const count = config.count || 1;
        for (let i = 0; i < count; i++) {
            const p = this._pool.get();
            p.mesh.visible = true;
            p.mesh.position.copy(config.position);

            if (config.velocity) {
                p.velocity.copy(config.velocity);
                if (config.spread) {
                    p.velocity.x += (Math.random() - 0.5) * config.spread;
                    p.velocity.y += (Math.random() - 0.5) * config.spread;
                    p.velocity.z += (Math.random() - 0.5) * config.spread;
                }
            } else {
                p.velocity.set(
                    (Math.random() - 0.5) * (config.spread || 2),
                    Math.random() * (config.upForce || 2),
                    (Math.random() - 0.5) * (config.spread || 2)
                );
            }

            p.life = config.life || 1.0;
            p.maxLife = p.life;
            p.size = config.size || 0.05;
            p.gravity = config.gravity !== undefined ? config.gravity : true;

            if (config.color) {
                p.color.set(config.color);
                p.mesh.material.color.set(config.color);
            }

            p.mesh.material.opacity = 1;
            p.mesh.scale.setScalar(p.size * 20);
            this.particles.push(p);
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;

            if (p.life <= 0) {
                this._pool.release(p);
                this.particles.splice(i, 1);
                continue;
            }

            if (p.gravity) {
                p.velocity.y -= 9.8 * dt;
            }

            p.mesh.position.x += p.velocity.x * dt;
            p.mesh.position.y += p.velocity.y * dt;
            p.mesh.position.z += p.velocity.z * dt;

            const lifeRatio = p.life / p.maxLife;
            p.mesh.material.opacity = lifeRatio;
            p.mesh.scale.setScalar(p.size * 20 * lifeRatio);
        }
    }

    emitBlood(position, direction) {
        this.emit({
            position,
            velocity: direction ? direction.clone().multiplyScalar(2) : new THREE.Vector3(),
            count: 6,
            spread: 3,
            upForce: 2,
            life: 0.5,
            size: 0.04,
            color: 0xaa0000
        });
    }

    emitSparks(position) {
        this.emit({
            position,
            count: 4,
            spread: 4,
            upForce: 3,
            life: 0.4,
            size: 0.03,
            color: 0xffaa00,
            gravity: true
        });
    }

    emitDust(position) {
        this.emit({
            position,
            count: 3,
            spread: 1,
            upForce: 0.5,
            life: 1.0,
            size: 0.08,
            color: 0x888888,
            gravity: false
        });
    }

    emitExplosion(position) {
        this.emit({
            position,
            count: 30,
            spread: 8,
            upForce: 5,
            life: 1.0,
            size: 0.1,
            color: 0xff4400
        });
        this.emit({
            position: position.clone().add(new THREE.Vector3(0, 0.5, 0)),
            count: 15,
            spread: 4,
            upForce: 8,
            life: 1.5,
            size: 0.15,
            color: 0x333333,
            gravity: false
        });
    }

    clear() {
        for (const p of this.particles) {
            this._pool.release(p);
        }
        this.particles = [];
    }
}

﻿// --- effects/BulletSystem.js ---

class Bullet {
    constructor(scene) {
        this.scene = scene;
        this.alive = false;
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.distanceTraveled = 0;
        this.maxRange = 200;
        this.mesh = null;
    }
    spawn(origin, direction, speed, range, color) {
        this.alive = true;
        this.position.copy(origin);
        this.velocity.copy(direction).multiplyScalar(speed);
        this.distanceTraveled = 0;
        this.maxRange = range || 200;
        if (!this.mesh) {
            const tracerGeo = new THREE.CylinderGeometry(0.008, 0.003, 0.15, 4);
            tracerGeo.rotateX(Math.PI / 2);
            const tracerMat = new THREE.MeshBasicMaterial({color: color || 0xffdd44, transparent: true, opacity: 0.95});
            this.mesh = new THREE.Mesh(tracerGeo, tracerMat);
        } else {
            this.mesh.material.color.set(color || 0xffdd44);
            this.mesh.material.opacity = 0.95;
        }
        this.mesh.position.copy(origin);
        this.mesh.lookAt(origin.clone().add(direction));
        this.mesh.visible = true;
        this.scene.add(this.mesh);
    }
    release() {
        this.alive = false;
        this.distanceTraveled = 0;
        if (this.mesh) {
            this.mesh.visible = false;
            if (this.mesh.parent) this.scene.remove(this.mesh);
        }
    }
}

class BulletSystem {
    constructor(scene, particles) {
        this.scene = scene;
        this.particles = particles;
        this.bulletPool = [];
        this.activeBullets = [];
        this.maxBullets = 50;
        this.shellCasings = [];
        this.maxShellCasings = 30;
        this.impactMarks = [];
        this.maxImpactMarks = 50;
        this._sweepRay = new THREE.Raycaster();
        this._aabbBox = new THREE.Box3();
        for (let i = 0; i < this.maxBullets; i++) {
            this.bulletPool.push(new Bullet(scene));
        }
    }
    _getBullet() {
        for (const b of this.bulletPool) { if (!b.alive) return b; }
        const oldest = this.activeBullets.shift();
        if (oldest) oldest.release();
        return oldest || new Bullet(this.scene);
    }
    fire(origin, direction, speed, range, color, barrelPos) {
        const b = this._getBullet();
        b.spawn(origin, direction, speed, range, color);
        this.activeBullets.push(b);
        if (barrelPos) this._spawnShellCasing(barrelPos, direction);
        return b;
    }
    update(dt, levelObjects) {
        for (let i = this.activeBullets.length - 1; i >= 0; i--) {
            const b = this.activeBullets[i];
            if (!b.alive) { this.activeBullets.splice(i, 1); continue; }
            const prevPos = b.position.clone();
            const moveStep = b.velocity.clone().multiplyScalar(dt);
            b.position.add(moveStep);
            b.mesh.position.copy(b.position);
            b.mesh.lookAt(b.position.clone().add(b.velocity));
            b.distanceTraveled += moveStep.length();
            if (b.distanceTraveled > b.maxRange) { b.release(); this.activeBullets.splice(i, 1); continue; }
            let hitDetected = false;
            if (levelObjects && levelObjects.length > 0) {
                const moveLen = moveStep.length();
                if (moveLen > 0.001) {
                    const dir = moveStep.clone().normalize();
                    this._sweepRay.set(prevPos, dir);
                    this._sweepRay.near = 0;
                    this._sweepRay.far = moveLen + 0.1;
                    const hits = this._sweepRay.intersectObjects(levelObjects, true);
                    if (hits.length > 0) {
                        this._spawnImpactDecal(hits[0].point, hits[0].face ? hits[0].face.normal : new THREE.Vector3(0, 1, 0));
                        if (this.particles) this.particles.emitSparks(hits[0].point);
                        b.release();
                        this.activeBullets.splice(i, 1);
                        hitDetected = true;
                    }
                }
            }
            if (!hitDetected && levelObjects) {
                for (const obj of levelObjects) {
                    if (!obj.geometry && !(obj.children && obj.children.length)) continue;
                    this._aabbBox.setFromObject(obj);
                    if (this._aabbBox.containsPoint(b.position)) {
                        this._spawnImpactDecal(b.position.clone(), new THREE.Vector3(0, 1, 0));
                        b.release();
                        this.activeBullets.splice(i, 1);
                        break;
                    }
                }
            }
        }
        this._updateShellCasings(dt);
        this._updateImpactMarks(dt);
    }
    _spawnShellCasing(barrelPos, forwardDir) {
        if (this.shellCasings.length >= this.maxShellCasings) {
            const oldest = this.shellCasings.shift();
            if (oldest.mesh.parent) this.scene.remove(oldest.mesh);
        }
        const geo = new THREE.CylinderGeometry(0.005, 0.004, 0.018, 4);
        const mat = new THREE.MeshStandardMaterial({color: 0xcc9933, metalness: 0.7, roughness: 0.3});
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(barrelPos);
        const right = new THREE.Vector3().crossVectors(forwardDir, new THREE.Vector3(0, 1, 0)).normalize();
        const ejectSpeed = 2 + Math.random() * 2;
        const vel = right.multiplyScalar(ejectSpeed);
        vel.y = 2 + Math.random();
        this.scene.add(mesh);
        this.shellCasings.push({mesh, velocity: vel, life: 3.0, rotVel: new THREE.Vector3((Math.random()-0.5)*20, (Math.random()-0.5)*20, (Math.random()-0.5)*20), onGround: false});
    }
    _updateShellCasings(dt) {
        for (let i = this.shellCasings.length - 1; i >= 0; i--) {
            const sc = this.shellCasings[i];
            sc.life -= dt;
            if (sc.life <= 0) { if (sc.mesh.parent) this.scene.remove(sc.mesh); this.shellCasings.splice(i, 1); continue; }
            if (!sc.onGround) {
                sc.velocity.y -= 9.8 * dt;
                sc.mesh.position.x += sc.velocity.x * dt;
                sc.mesh.position.y += sc.velocity.y * dt;
                sc.mesh.position.z += sc.velocity.z * dt;
                sc.mesh.rotation.x += sc.rotVel.x * dt;
                sc.mesh.rotation.y += sc.rotVel.y * dt;
                sc.mesh.rotation.z += sc.rotVel.z * dt;
                if (sc.mesh.position.y <= 0.02) { sc.mesh.position.y = 0.02; sc.onGround = true; sc.velocity.set(0,0,0); sc.rotVel.multiplyScalar(0.1); }
            }
            sc.mesh.material.opacity = Math.min(1, sc.life / 0.5);
            sc.mesh.material.transparent = true;
        }
    }
    _spawnImpactDecal(point, normal) {
        if (this.impactMarks.length >= this.maxImpactMarks) {
            const oldest = this.impactMarks.shift();
            if (oldest.mesh.parent) this.scene.remove(oldest.mesh);
        }
        const size = 0.04 + Math.random() * 0.04;
        const geo = new THREE.PlaneGeometry(size, size);
        const mat = new THREE.MeshBasicMaterial({color: 0x222222, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false});
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(point).add(normal.clone().multiplyScalar(0.01));
        mesh.lookAt(point.clone().add(normal));
        this.scene.add(mesh);
        this.impactMarks.push({mesh, life: 3.0});
    }
    _updateImpactMarks(dt) {
        for (let i = this.impactMarks.length - 1; i >= 0; i--) {
            const im = this.impactMarks[i];
            im.life -= dt;
            if (im.life <= 0) { if (im.mesh.parent) this.scene.remove(im.mesh); this.impactMarks.splice(i, 1); continue; }
            im.mesh.material.opacity = 0.7 * (im.life / 3.0);
        }
    }
    clear() {
        for (const b of this.activeBullets) b.release();
        this.activeBullets = [];
        for (const sc of this.shellCasings) { if (sc.mesh.parent) this.scene.remove(sc.mesh); }
        this.shellCasings = [];
        for (const im of this.impactMarks) { if (im.mesh.parent) this.scene.remove(im.mesh); }
        this.impactMarks = [];
    }
}

// --- player/Weapon.js ---

class Weapon {
    constructor(config) {
        this.name = config.name || 'Weapon';
        this.damage = config.damage || 25;
        this.headshotMultiplier = config.headshotMultiplier || 2.5;
        this.fireRate = config.fireRate || 0.1;
        this.reloadTime = config.reloadTime || 2.0;
        this.magazineSize = config.magazineSize || 30;
        this.reserveAmmo = config.reserveAmmo || 120;
        this.maxReserve = config.maxReserve || 120;
        this.spread = config.spread || 0.02;
        this.recoilX = config.recoilX || 0.01;
        this.recoilY = config.recoilY || 0.015;
        this.range = config.range || 100;
        this.automatic = config.automatic !== undefined ? config.automatic : true;
        this.pellets = config.pellets || 1;
        this.aimSpreadMultiplier = config.aimSpreadMultiplier || 0.4;
        this.aimRecoilMultiplier = config.aimRecoilMultiplier || 0.6;

        this.currentAmmo = this.magazineSize;
        this.fireTimer = 0;
        this.reloading = false;
        this.reloadTimer = 0;
        this.canFire = true;
    }

    update(dt) {
        if (this.fireTimer > 0) {
            this.fireTimer -= dt;
        }

        if (this.reloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.finishReload();
            }
        }
    }

    shouldFire(isTriggerHeld, isTriggerPressed) {
        return this.automatic ? isTriggerHeld : isTriggerPressed;
    }

    fire(aiming) {
        if (this.reloading || this.fireTimer > 0 || this.currentAmmo <= 0) return null;

        this.currentAmmo--;
        this.fireTimer = this.fireRate;

        const spreadMult = aiming ? this.aimSpreadMultiplier : 1;
        const recoilMult = aiming ? this.aimRecoilMultiplier : 1;

        const results = [];
        for (let i = 0; i < this.pellets; i++) {
            const spreadX = (Math.random() - 0.5) * this.spread * spreadMult;
            const spreadY = (Math.random() - 0.5) * this.spread * spreadMult;
            results.push({ spreadX, spreadY });
        }

        return {
            pellets: results,
            recoilX: this.recoilX * recoilMult * (0.9 + Math.random() * 0.2),
            recoilY: this.recoilY * recoilMult * (0.9 + Math.random() * 0.2),
            damage: this.damage,
            headshotMultiplier: this.headshotMultiplier,
            range: this.range
        };
    }

    reload() {
        if (this.reloading || this.currentAmmo === this.magazineSize || this.reserveAmmo <= 0) return false;
        this.reloading = true;
        this.reloadTimer = this.reloadTime;
        return true;
    }

    finishReload() {
        const needed = this.magazineSize - this.currentAmmo;
        const available = Math.min(needed, this.reserveAmmo);
        this.currentAmmo += available;
        this.reserveAmmo -= available;
        this.reloading = false;
    }

    addReserve(amount) {
        this.reserveAmmo = Math.min(this.maxReserve, this.reserveAmmo + amount);
    }

    reset() {
        this.currentAmmo = this.magazineSize;
        this.reserveAmmo = this.maxReserve;
        this.reloading = false;
        this.reloadTimer = 0;
        this.fireTimer = 0;
    }
}

// --- player/WeaponSystem.js ---

class WeaponSystem {
    constructor(gameState) {
        this.gameState = gameState;

        this.weapons = [
            new Weapon({
                name: 'M4 CARBINE',
                damage: 28,
                headshotMultiplier: 2.5,
                fireRate: 0.09,
                reloadTime: 2.2,
                magazineSize: 30,
                reserveAmmo: 150,
                maxReserve: 150,
                spread: 0.025,
                recoilX: 0.008,
                recoilY: 0.014,
                range: 80,
                automatic: true,
                pellets: 1,
                aimSpreadMultiplier: 0.35,
                aimRecoilMultiplier: 0.55
            }),
            new Weapon({
                name: 'REMINGTON 870',
                damage: 18,
                headshotMultiplier: 2.0,
                fireRate: 0.7,
                reloadTime: 2.8,
                magazineSize: 8,
                reserveAmmo: 40,
                maxReserve: 40,
                spread: 0.08,
                recoilX: 0.015,
                recoilY: 0.035,
                range: 25,
                automatic: false,
                pellets: 8,
                aimSpreadMultiplier: 0.6,
                aimRecoilMultiplier: 0.75
            }),
            new Weapon({
                name: 'M1911',
                damage: 35,
                headshotMultiplier: 3.0,
                fireRate: 0.18,
                reloadTime: 1.6,
                magazineSize: 12,
                reserveAmmo: 60,
                maxReserve: 60,
                spread: 0.03,
                recoilX: 0.012,
                recoilY: 0.02,
                range: 50,
                automatic: false,
                pellets: 1,
                aimSpreadMultiplier: 0.3,
                aimRecoilMultiplier: 0.5
            })
        ];

        this.currentIndex = 0;
        this.grenades = 3;
        this.maxGrenades = 5;
    }

    getCurrent() {
        return this.weapons[this.currentIndex];
    }

    switchTo(index) {
        if (index >= 0 && index < this.weapons.length && index !== this.currentIndex) {
            this.currentIndex = index;
            return true;
        }
        return false;
    }

    update(dt) {
        this.getCurrent().update(dt);
    }

    fire(aiming) {
        return this.getCurrent().fire(aiming);
    }

    reload() {
        return this.getCurrent().reload();
    }

    throwGrenade() {
        if (this.grenades <= 0) return false;
        this.grenades--;
        return true;
    }

    addGrenade() {
        this.grenades = Math.min(this.maxGrenades, this.grenades + 1);
    }

    reset() {
        for (const weapon of this.weapons) {
            weapon.reset();
        }
        this.currentIndex = 0;
        this.grenades = 3;
    }
}

// --- player/Player.js ---

class Player {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;

        this.position = new THREE.Vector3(0, 1.7, 0);
        this.velocity = new THREE.Vector3();
        this.rotation = { x: 0, y: 0 };

        this.health = 100;
        this.maxHealth = 100;
        this.armor = 0;
        this.alive = true;
        this.downed = false;
        this.downTimer = 0;
        this.downDuration = 15;

        this.speed = 6;
        this.sprintMultiplier = 1.6;
        this.crouchMultiplier = 0.5;
        this.jumpForce = 7;
        this.gravity = -20;
        this.onGround = true;
        this.height = 1.7;
        this.crouchHeight = 1.0;
        this.currentHeight = 1.7;

        this.sprinting = false;
        this.crouching = false;
        this.aiming = false;

        this.recoilX = 0;
        this.recoilY = 0;
        this.recoilRecovery = 5;

        this.hitDirection = new THREE.Vector3();

        this.bobPhase = 0;
        this.bobAmplitude = 0;
        this.bobX = 0;
        this.bobY = 0;

        this.onDamage = null;

        this._moveForward = false;
        this._moveBackward = false;
        this._moveLeft = false;
        this._moveRight = false;

        // Viewmodel (first-person weapon)
        this.viewmodel = null;
        this.viewmodelRecoilOffset = 0;
        this.viewmodelBobX = 0;
        this.viewmodelBobY = 0;
        this.viewmodelSwapTimer = 0;
        this.viewmodelSwapDuration = 0.3;

        // Flashlight
        this.flashlight = null;
        this.flashlightOn = true;

        this._createViewmodel();
        this._createFlashlight();
    }

    _createViewmodel() {
        // Build weapon-specific models
        this._gunModels = [
            this._buildM4Carbine(),
            this._buildRemington870(),
            this._buildM1911()
        ];

        // Weapon-specific viewmodel positions (hip / ADS)
        this._viewmodelConfigs = [
            { hipX: 0.25, hipY: -0.22, hipZ: -0.4,  adsX: 0.12, adsY: -0.18, adsZ: -0.35 },  // M4 Carbine
            { hipX: 0.25, hipY: -0.20, hipZ: -0.38, adsX: 0.14, adsY: -0.17, adsZ: -0.33 },  // Remington 870
            { hipX: 0.22, hipY: -0.20, hipZ: -0.32, adsX: 0.10, adsY: -0.16, adsZ: -0.28 }   // M1911
        ];

        this._currentViewmodelIndex = 0;
        this.viewmodel = this._gunModels[0];
        this.viewmodel.position.set(0.25, -0.22, -0.4);
        this.viewmodel.rotation.set(0, 0, 0);
        this.camera.add(this.viewmodel);
    }

    switchViewmodel(index) {
        if (index < 0 || index >= this._gunModels.length) return;
        if (this.viewmodel) {
            this.camera.remove(this.viewmodel);
        }
        this.viewmodel = this._gunModels[index];
        this._currentViewmodelIndex = index;

        // Weapon-specific viewmodel positions (hip / ADS)
        this._viewmodelConfigs = [
            { hipX: 0.25, hipY: -0.22, hipZ: -0.4,  adsX: 0.12, adsY: -0.18, adsZ: -0.35 },  // M4 Carbine
            { hipX: 0.25, hipY: -0.20, hipZ: -0.38, adsX: 0.14, adsY: -0.17, adsZ: -0.33 },  // Remington 870
            { hipX: 0.22, hipY: -0.20, hipZ: -0.32, adsX: 0.10, adsY: -0.16, adsZ: -0.28 }   // M1911
        ];
        const cfg = this._viewmodelConfigs[index] || this._viewmodelConfigs[0];
        this.viewmodel.position.set(cfg.hipX, cfg.hipY, cfg.hipZ);
        this.viewmodel.rotation.set(0, 0, 0);
        this.camera.add(this.viewmodel);
    }

    _buildM4Carbine() {
        const group = new THREE.Group();

        const receiverMat = new THREE.MeshStandardMaterial({ color: 0x2d2d2d, roughness: 0.35, metalness: 0.85, emissive: 0x111111, emissiveIntensity: 0.15 });
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.25, metalness: 0.9, emissive: 0x0a0a0a, emissiveIntensity: 0.15 });
        const railMat = new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.3, metalness: 0.8, emissive: 0x0f0f0f, emissiveIntensity: 0.15 });
        const gripMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.15, emissive: 0x0a0a0a, emissiveIntensity: 0.15 });
        const stockMat = new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 0.6, metalness: 0.3, emissive: 0x0d0d0d, emissiveIntensity: 0.15 });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.5, metalness: 0.4, emissive: 0x2a1e06, emissiveIntensity: 0.2 });
        const magMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.45, metalness: 0.7, emissive: 0x0b0b0b, emissiveIntensity: 0.15 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.9, emissive: 0x060606, emissiveIntensity: 0.1 });

        // === UPPER RECEIVER ===
        const upperGeo = new THREE.BoxGeometry(0.052, 0.055, 0.22);
        const upper = new THREE.Mesh(upperGeo, receiverMat);
        upper.position.set(0, 0.015, -0.06);
        group.add(upper);

        // Upper receiver top rail (Picatinny)
        const upperRailGeo = new THREE.BoxGeometry(0.036, 0.006, 0.22);
        const upperRail = new THREE.Mesh(upperRailGeo, railMat);
        upperRail.position.set(0, 0.046, -0.06);
        group.add(upperRail);
        // Rail segments
        for (let i = 0; i < 8; i++) {
            const segGeo = new THREE.BoxGeometry(0.038, 0.003, 0.008);
            const seg = new THREE.Mesh(segGeo, receiverMat);
            seg.position.set(0, 0.05, -0.15 + i * 0.018);
            group.add(seg);
        }

        // === LOWER RECEIVER ===
        const lowerGeo = new THREE.BoxGeometry(0.056, 0.04, 0.16);
        const lower = new THREE.Mesh(lowerGeo, receiverMat);
        lower.position.set(0, -0.02, -0.03);
        group.add(lower);

        // Magazine well flare
        const wellGeo = new THREE.BoxGeometry(0.058, 0.012, 0.06);
        const well = new THREE.Mesh(wellGeo, receiverMat);
        well.position.set(0, -0.042, -0.04);
        group.add(well);

        // Takedown pins
        for (let i = 0; i < 2; i++) {
            const pinGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.06, 6);
            pinGeo.rotateZ(Math.PI / 2);
            const pin = new THREE.Mesh(pinGeo, accentMat);
            pin.position.set(0, 0.015, -0.14 + i * 0.14);
            group.add(pin);
        }

        // === BARREL ASSEMBLY ===
        const barrelGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.36, 10);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.position.set(0, 0.02, -0.37);
        group.add(barrel);

        // Barrel inner (visible bore)
        const boreGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.005, 8);
        boreGeo.rotateX(Math.PI / 2);
        const boreInner = new THREE.Mesh(boreGeo, darkMat);
        boreInner.position.set(0, 0.02, -0.555);
        group.add(boreInner);

        // === GAS BLOCK & FRONT SIGHT ===
        const gasBlockGeo = new THREE.BoxGeometry(0.028, 0.028, 0.03);
        const gasBlock = new THREE.Mesh(gasBlockGeo, receiverMat);
        gasBlock.position.set(0, 0.035, -0.38);
        group.add(gasBlock);

        // Gas tube
        const gasTubeGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.12, 6);
        gasTubeGeo.rotateX(Math.PI / 2);
        const gasTube = new THREE.Mesh(gasTubeGeo, barrelMat);
        gasTube.position.set(0, 0.04, -0.32);
        group.add(gasTube);

        // Front sight base
        const frontBaseGeo = new THREE.BoxGeometry(0.025, 0.015, 0.018);
        const frontBase = new THREE.Mesh(frontBaseGeo, barrelMat);
        frontBase.position.set(0, 0.04, -0.52);
        group.add(frontBase);

        // Front sight post
        const frontPostGeo = new THREE.BoxGeometry(0.006, 0.035, 0.006);
        const frontPost = new THREE.Mesh(frontPostGeo, barrelMat);
        frontPost.position.set(0, 0.055, -0.52);
        group.add(frontPost);

        // Front sight ears (protective wings)
        for (let side = -1; side <= 1; side += 2) {
            const earGeo = new THREE.BoxGeometry(0.004, 0.025, 0.012);
            const ear = new THREE.Mesh(earGeo, barrelMat);
            ear.position.set(side * 0.01, 0.055, -0.52);
            group.add(ear);
        }

        // === HANDGUARD (Quad Rail) ===
        const hgBodyGeo = new THREE.BoxGeometry(0.04, 0.04, 0.2);
        const hgBody = new THREE.Mesh(hgBodyGeo, receiverMat);
        hgBody.position.set(0, 0.02, -0.25);
        group.add(hgBody);

        // Top rail
        const topRailGeo = new THREE.BoxGeometry(0.032, 0.008, 0.2);
        const topRail = new THREE.Mesh(topRailGeo, railMat);
        topRail.position.set(0, 0.05, -0.25);
        group.add(topRail);

        // Bottom rail
        const bottomRail = new THREE.Mesh(topRailGeo, railMat);
        bottomRail.position.set(0, -0.01, -0.25);
        group.add(bottomRail);

        // Side rails
        const sideRailGeo = new THREE.BoxGeometry(0.008, 0.035, 0.2);
        const leftRail = new THREE.Mesh(sideRailGeo, railMat);
        leftRail.position.set(-0.022, 0.02, -0.25);
        group.add(leftRail);
        const rightRail = new THREE.Mesh(sideRailGeo, railMat);
        rightRail.position.set(0.022, 0.02, -0.25);
        group.add(rightRail);

        // Rail covers (polymer panels on sides)
        for (let side = -1; side <= 1; side += 2) {
            const coverGeo = new THREE.BoxGeometry(0.006, 0.028, 0.14);
            const cover = new THREE.Mesh(coverGeo, gripMat);
            cover.position.set(side * 0.025, 0.02, -0.25);
            group.add(cover);
            // Cover texture ridges
            for (let i = 0; i < 5; i++) {
                const ridgeGeo2 = new THREE.BoxGeometry(0.007, 0.002, 0.14);
                const ridge2 = new THREE.Mesh(ridgeGeo2, gripMat);
                ridge2.position.set(side * 0.025, 0.01 + i * 0.008, -0.25);
                group.add(ridge2);
            }
        }

        // Bottom rail cover
        const botCoverGeo = new THREE.BoxGeometry(0.028, 0.006, 0.14);
        const botCover = new THREE.Mesh(botCoverGeo, gripMat);
        botCover.position.set(0, -0.013, -0.25);
        group.add(botCover);

        // Barrel cooling vents (holes visible between rail and barrel)
        for (let i = 0; i < 6; i++) {
            const ventGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.042, 6);
            ventGeo.rotateZ(Math.PI / 2);
            const vent = new THREE.Mesh(ventGeo, darkMat);
            vent.position.set(0, 0.02, -0.18 - i * 0.025);
            group.add(vent);
        }

        // Handguard cap (front)
        const hgCapGeo = new THREE.BoxGeometry(0.044, 0.044, 0.008);
        const hgCap = new THREE.Mesh(hgCapGeo, receiverMat);
        hgCap.position.set(0, 0.02, -0.35);
        group.add(hgCap);

        // === CARRY HANDLE / REAR SIGHT ===
        const carryBaseGeo = new THREE.BoxGeometry(0.04, 0.018, 0.09);
        const carryBase = new THREE.Mesh(carryBaseGeo, receiverMat);
        carryBase.position.set(0, 0.05, -0.01);
        group.add(carryBase);

        // Carry handle walls
        for (let side = -1; side <= 1; side += 2) {
            const wallGeo = new THREE.BoxGeometry(0.004, 0.015, 0.09);
            const wall = new THREE.Mesh(wallGeo, receiverMat);
            wall.position.set(side * 0.018, 0.062, -0.01);
            group.add(wall);
        }

        // Carry handle top
        const carryTopGeo = new THREE.BoxGeometry(0.04, 0.004, 0.09);
        const carryTop = new THREE.Mesh(carryTopGeo, receiverMat);
        carryTop.position.set(0, 0.07, -0.01);
        group.add(carryTop);

        // Rear sight aperture
        const rearSightGeo = new THREE.BoxGeometry(0.03, 0.015, 0.005);
        const rearSight = new THREE.Mesh(rearSightGeo, barrelMat);
        rearSight.position.set(0, 0.065, -0.04);
        group.add(rearSight);

        // Rear sight peep hole
        const peepGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.006, 8);
        peepGeo.rotateX(Math.PI / 2);
        const peep = new THREE.Mesh(peepGeo, darkMat);
        peep.position.set(0, 0.065, -0.042);
        group.add(peep);

        // === EJECTION PORT & CONTROLS ===
        const ejectGeo = new THREE.BoxGeometry(0.03, 0.015, 0.04);
        const eject = new THREE.Mesh(ejectGeo, darkMat);
        eject.position.set(0.026, 0.02, -0.04);
        group.add(eject);

        // Shell deflector
        const deflectorGeo = new THREE.BoxGeometry(0.012, 0.015, 0.02);
        const deflector = new THREE.Mesh(deflectorGeo, receiverMat);
        deflector.position.set(0.028, 0.025, -0.005);
        deflector.rotation.y = 0.3;
        group.add(deflector);

        // Bolt catch
        const boltGeo = new THREE.BoxGeometry(0.012, 0.01, 0.015);
        const bolt = new THREE.Mesh(boltGeo, receiverMat);
        bolt.position.set(-0.03, 0.005, 0.0);
        group.add(bolt);

        // Forward assist
        const assistGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.015, 6);
        assistGeo.rotateX(Math.PI / 2);
        const assist = new THREE.Mesh(assistGeo, receiverMat);
        assist.position.set(0.03, 0.02, 0.01);
        group.add(assist);

        // Charging handle
        const chargeGeo = new THREE.BoxGeometry(0.03, 0.01, 0.02);
        const charge = new THREE.Mesh(chargeGeo, receiverMat);
        charge.position.set(0, 0.04, 0.07);
        group.add(charge);

        // Charging handle latch
        const latchGeo = new THREE.BoxGeometry(0.01, 0.008, 0.015);
        const latch = new THREE.Mesh(latchGeo, accentMat);
        latch.position.set(-0.015, 0.04, 0.075);
        group.add(latch);

        // === MAGAZINE ===
        const magGeo = new THREE.BoxGeometry(0.032, 0.14, 0.05);
        const mag = new THREE.Mesh(magGeo, magMat);
        mag.position.set(0, -0.095, -0.04);
        mag.rotation.x = 0.12;
        group.add(mag);

        // Magazine ridges (textured surface)
        for (let i = 0; i < 5; i++) {
            const magRidgeGeo = new THREE.BoxGeometry(0.034, 0.002, 0.05);
            const magRidge = new THREE.Mesh(magRidgeGeo, magMat);
            magRidge.position.set(0, -0.045 + i * -0.025, -0.04);
            magRidge.rotation.x = 0.12;
            group.add(magRidge);
        }

        // Magazine base plate
        const magBaseGeo = new THREE.BoxGeometry(0.034, 0.008, 0.04);
        const magBase = new THREE.Mesh(magBaseGeo, accentMat);
        magBase.position.set(0, -0.165, -0.06);
        magBase.rotation.x = 0.12;
        group.add(magBase);

        // Magazine window (visible round count)
        const magWinGeo = new THREE.BoxGeometry(0.02, 0.04, 0.002);
        const magWin = new THREE.Mesh(magWinGeo, darkMat);
        magWin.position.set(0.017, -0.07, -0.04);
        magWin.rotation.x = 0.12;
        group.add(magWin);

        // Magazine release
        const magRelGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.008, 6);
        magRelGeo.rotateZ(Math.PI / 2);
        const magRel = new THREE.Mesh(magRelGeo, accentMat);
        magRel.position.set(0.03, -0.02, -0.03);
        group.add(magRel);

        // === TRIGGER ASSEMBLY ===
        const guardGeo = new THREE.BoxGeometry(0.035, 0.005, 0.07);
        const guard = new THREE.Mesh(guardGeo, receiverMat);
        guard.position.set(0, -0.045, 0.01);
        group.add(guard);

        // Trigger guard front (rounded)
        const guardFrontGeo = new THREE.BoxGeometry(0.035, 0.015, 0.004);
        const guardFront = new THREE.Mesh(guardFrontGeo, receiverMat);
        guardFront.position.set(0, -0.038, -0.025);
        group.add(guardFront);

        // Trigger
        const triggerGeo = new THREE.BoxGeometry(0.006, 0.018, 0.004);
        const trigger = new THREE.Mesh(triggerGeo, barrelMat);
        trigger.position.set(0, -0.035, 0.005);
        trigger.rotation.x = -0.2;
        group.add(trigger);

        // === PISTOL GRIP ===
        const gripGeo = new THREE.BoxGeometry(0.036, 0.1, 0.04);
        const gripMesh = new THREE.Mesh(gripGeo, gripMat);
        gripMesh.position.set(0, -0.075, 0.065);
        gripMesh.rotation.x = -0.25;
        group.add(gripMesh);

        // Grip finger grooves
        for (let i = 0; i < 4; i++) {
            const grooveGeo = new THREE.BoxGeometry(0.038, 0.004, 0.042);
            const groove = new THREE.Mesh(grooveGeo, gripMat);
            groove.position.set(0, -0.05 + i * -0.02, 0.065);
            groove.rotation.x = -0.25;
            group.add(groove);
        }

        // Grip backstrap
        const backGeo = new THREE.BoxGeometry(0.032, 0.08, 0.015);
        const back = new THREE.Mesh(backGeo, gripMat);
        back.position.set(0, -0.065, 0.082);
        back.rotation.x = -0.25;
        group.add(back);

        // === BUFFER TUBE & STOCK ===
        const bufferGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8);
        bufferGeo.rotateX(Math.PI / 2);
        const buffer = new THREE.Mesh(bufferGeo, stockMat);
        buffer.position.set(0, 0.015, 0.1);
        group.add(buffer);

        // Buffer tube castle nut
        const nutGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.01, 8);
        nutGeo.rotateX(Math.PI / 2);
        const nut = new THREE.Mesh(nutGeo, receiverMat);
        nut.position.set(0, 0.015, 0.03);
        group.add(nut);

        // Stock main body
        const stockMainGeo = new THREE.BoxGeometry(0.045, 0.05, 0.08);
        const stockMain = new THREE.Mesh(stockMainGeo, stockMat);
        stockMain.position.set(0, 0.01, 0.18);
        group.add(stockMain);

        // Stock adjustment lever
        const leverGeo = new THREE.BoxGeometry(0.006, 0.025, 0.02);
        const lever = new THREE.Mesh(leverGeo, receiverMat);
        lever.position.set(-0.025, 0.01, 0.14);
        group.add(lever);

        // Stock cheek weld
        const cheekGeo = new THREE.BoxGeometry(0.04, 0.015, 0.06);
        const cheek = new THREE.Mesh(cheekGeo, stockMat);
        cheek.position.set(0, 0.04, 0.18);
        group.add(cheek);

        // Stock butt plate (rubber)
        const buttGeo = new THREE.BoxGeometry(0.048, 0.055, 0.012);
        const butt = new THREE.Mesh(buttGeo, gripMat);
        butt.position.set(0, 0.01, 0.225);
        group.add(butt);

        // Butt plate texture
        for (let i = 0; i < 3; i++) {
            const texGeo = new THREE.BoxGeometry(0.04, 0.003, 0.013);
            const tex = new THREE.Mesh(texGeo, stockMat);
            tex.position.set(0, -0.01 + i * 0.02, 0.225);
            group.add(tex);
        }

        // === MUZZLE DEVICE ===
        // Flash hider (birdcage)
        const fhBodyGeo = new THREE.CylinderGeometry(0.016, 0.014, 0.04, 8);
        fhBodyGeo.rotateX(Math.PI / 2);
        const fhBody = new THREE.Mesh(fhBodyGeo, barrelMat);
        fhBody.position.set(0, 0.02, -0.57);
        group.add(fhBody);

        // Flash hider slots
        for (let i = 0; i < 3; i++) {
            const slotGeo = new THREE.BoxGeometry(0.018, 0.004, 0.025);
            const slot = new THREE.Mesh(slotGeo, darkMat);
            slot.position.set(0, 0.028 + i * 0.005, -0.57);
            group.add(slot);
        }

        // Flash hider base ring
        const fhRingGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.006, 8);
        fhRingGeo.rotateX(Math.PI / 2);
        const fhRing = new THREE.Mesh(fhRingGeo, barrelMat);
        fhRing.position.set(0, 0.02, -0.548);
        group.add(fhRing);

        return group;
    }

    _buildRemington870() {
        const group = new THREE.Group();

        const receiverMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.3, metalness: 0.9, emissive: 0x0a0a0a, emissiveIntensity: 0.15 });
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.2, metalness: 0.95, emissive: 0x080808, emissiveIntensity: 0.15 });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.85, metalness: 0.05, emissive: 0x1a100a, emissiveIntensity: 0.2 });
        const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e15, roughness: 0.8, metalness: 0.05, emissive: 0x140c06, emissiveIntensity: 0.2 });
        const forendMat = new THREE.MeshStandardMaterial({ color: 0x5a3619, roughness: 0.8, metalness: 0.05, emissive: 0x180e06, emissiveIntensity: 0.2 });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.5, metalness: 0.4, emissive: 0x2a1e06, emissiveIntensity: 0.2 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.25, metalness: 0.95, emissive: 0x050505, emissiveIntensity: 0.1 });

        // === RECEIVER ===
        const recvGeo = new THREE.BoxGeometry(0.055, 0.06, 0.2);
        const recv = new THREE.Mesh(recvGeo, receiverMat);
        recv.position.set(0, 0.01, -0.04);
        group.add(recv);

        // Receiver top contour (rounded feel)
        const recvTopGeo = new THREE.BoxGeometry(0.048, 0.008, 0.2);
        const recvTop = new THREE.Mesh(recvTopGeo, receiverMat);
        recvTop.position.set(0, 0.044, -0.04);
        group.add(recvTop);

        // Receiver bottom rail
        const recvBotGeo = new THREE.BoxGeometry(0.05, 0.005, 0.2);
        const recvBot = new THREE.Mesh(recvBotGeo, receiverMat);
        recvBot.position.set(0, -0.022, -0.04);
        group.add(recvBot);

        // === BARREL ===
        const bblGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.42, 10);
        bblGeo.rotateX(Math.PI / 2);
        const bbl = new THREE.Mesh(bblGeo, barrelMat);
        bbl.position.set(0, 0.025, -0.35);
        group.add(bbl);

        // Barrel vent rib (top of barrel)
        const ribGeo = new THREE.BoxGeometry(0.006, 0.004, 0.35);
        const rib = new THREE.Mesh(ribGeo, barrelMat);
        rib.position.set(0, 0.035, -0.38);
        group.add(rib);

        // Vent rib cross slots
        for (let i = 0; i < 10; i++) {
            const slotGeo = new THREE.BoxGeometry(0.008, 0.005, 0.004);
            const slot = new THREE.Mesh(slotGeo, darkMat);
            slot.position.set(0, 0.035, -0.22 - i * 0.025);
            group.add(slot);
        }

        // Barrel bore (dark hole at muzzle)
        const boreGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.005, 8);
        boreGeo.rotateX(Math.PI / 2);
        const bore = new THREE.Mesh(boreGeo, darkMat);
        bore.position.set(0, 0.025, -0.582);
        group.add(bore);

        // === TUBE MAGAZINE ===
        const tubeGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.35, 8);
        tubeGeo.rotateX(Math.PI / 2);
        const tube = new THREE.Mesh(tubeGeo, receiverMat);
        tube.position.set(0, -0.005, -0.3);
        group.add(tube);

        // Tube magazine cap
        const tubeCapGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.014, 8);
        tubeCapGeo.rotateX(Math.PI / 2);
        const tubeCap = new THREE.Mesh(tubeCapGeo, barrelMat);
        tubeCap.position.set(0, -0.005, -0.475);
        group.add(tubeCap);

        // Tube cap knurling ring
        const tubeKnurlGeo = new THREE.CylinderGeometry(0.019, 0.019, 0.004, 10);
        tubeKnurlGeo.rotateX(Math.PI / 2);
        const tubeKnurl = new THREE.Mesh(tubeKnurlGeo, barrelMat);
        tubeKnurl.position.set(0, -0.005, -0.467);
        group.add(tubeKnurl);

        // Tube follower spring (visible end)
        const springGeo = new THREE.TorusGeometry(0.01, 0.002, 4, 8);
        springGeo.rotateX(Math.PI / 2);
        const spring = new THREE.Mesh(springGeo, barrelMat);
        spring.position.set(0, -0.005, -0.45);
        group.add(spring);

        // === BARREL CLAMP (connects barrel to tube magazine) ===
        const clampGeo = new THREE.BoxGeometry(0.038, 0.012, 0.01);
        const clamp = new THREE.Mesh(clampGeo, receiverMat);
        clamp.position.set(0, 0.01, -0.38);
        group.add(clamp);

        // Clamp bolts
        for (let side = -1; side <= 1; side += 2) {
            const boltGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.04, 6);
            boltGeo.rotateZ(Math.PI / 2);
            const bolt = new THREE.Mesh(boltGeo, accentMat);
            bolt.position.set(side * 0.02, 0.01, -0.38);
            group.add(bolt);
        }

        // Barrel bracket ring (front)
        const ringGeo = new THREE.TorusGeometry(0.022, 0.005, 6, 10);
        ringGeo.rotateX(Math.PI / 2);
        const ring = new THREE.Mesh(ringGeo, receiverMat);
        ring.position.set(0, 0.01, -0.35);
        group.add(ring);

        // === FRONT SIGHT ===
        const beadGeo = new THREE.SphereGeometry(0.005, 6, 4);
        const bead = new THREE.Mesh(beadGeo, new THREE.MeshStandardMaterial({ color: 0xcc0000, emissive: 0x880000, emissiveIntensity: 0.3 }));
        bead.position.set(0, 0.04, -0.56);
        group.add(bead);

        // Front sight base
        const frontBaseGeo = new THREE.BoxGeometry(0.02, 0.01, 0.012);
        const frontBase = new THREE.Mesh(frontBaseGeo, barrelMat);
        frontBase.position.set(0, 0.036, -0.56);
        group.add(frontBase);

        // === REAR SIGHT ===
        const rearBaseGeo = new THREE.BoxGeometry(0.04, 0.008, 0.012);
        const rearBase = new THREE.Mesh(rearBaseGeo, receiverMat);
        rearBase.position.set(0, 0.048, 0.05);
        group.add(rearBase);

        // Rear sight notch (U-notch)
        const rearNotchGeo = new THREE.BoxGeometry(0.015, 0.006, 0.004);
        const rearNotch = new THREE.Mesh(rearNotchGeo, darkMat);
        rearNotch.position.set(0, 0.052, 0.045);
        group.add(rearNotch);

        // === EJECTION PORT ===
        const ejectGeo = new THREE.BoxGeometry(0.028, 0.018, 0.06);
        const eject = new THREE.Mesh(ejectGeo, darkMat);
        eject.position.set(0.028, 0.015, -0.03);
        group.add(eject);

        // Ejection port cover edge
        const ejectEdgeGeo = new THREE.BoxGeometry(0.002, 0.02, 0.062);
        const ejectEdge = new THREE.Mesh(ejectEdgeGeo, receiverMat);
        ejectEdge.position.set(0.042, 0.015, -0.03);
        group.add(ejectEdge);

        // Bolt visible through port
        const boltVisGeo = new THREE.BoxGeometry(0.02, 0.012, 0.03);
        const boltVis = new THREE.Mesh(boltVisGeo, barrelMat);
        boltVis.position.set(0.028, 0.015, -0.03);
        group.add(boltVis);

        // === PUMP FOREND ===
        const forendGeo = new THREE.BoxGeometry(0.048, 0.048, 0.16);
        const forend = new THREE.Mesh(forendGeo, forendMat);
        forend.position.set(0, 0.0, -0.22);
        group.add(forend);

        // Forend grip grooves (cross-hatching)
        for (let i = 0; i < 7; i++) {
            const grooveGeo = new THREE.BoxGeometry(0.05, 0.003, 0.16);
            const groove = new THREE.Mesh(grooveGeo, woodDarkMat);
            groove.position.set(0, -0.02 + i * 0.008, -0.22);
            group.add(groove);
        }

        // Forend side checkering (vertical ridges)
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 4; i++) {
                const checkGeo = new THREE.BoxGeometry(0.002, 0.035, 0.12);
                const check = new THREE.Mesh(checkGeo, woodDarkMat);
                check.position.set(side * 0.025, 0.0, -0.22 + i * 0.03 - 0.045);
                group.add(check);
            }
        }

        // Forend front cap
        const forendCapGeo = new THREE.BoxGeometry(0.052, 0.052, 0.006);
        const forendCap = new THREE.Mesh(forendCapGeo, forendMat);
        forendCap.position.set(0, 0.0, -0.3);
        group.add(forendCap);

        // Forend rear collar
        const forendCollarGeo = new THREE.BoxGeometry(0.05, 0.05, 0.006);
        const forendCollar = new THREE.Mesh(forendCollarGeo, receiverMat);
        forendCollar.position.set(0, 0.0, -0.14);
        group.add(forendCollar);

        // Forend action bars
        const actionBarGeo = new THREE.BoxGeometry(0.006, 0.006, 0.12);
        const actionBarL = new THREE.Mesh(actionBarGeo, receiverMat);
        actionBarL.position.set(-0.018, -0.025, -0.2);
        group.add(actionBarL);

        const actionBarR = new THREE.Mesh(actionBarGeo, receiverMat);
        actionBarR.position.set(0.018, -0.025, -0.2);
        group.add(actionBarR);

        // === SHELL LIFTER / LOADING PORT ===
        const lifterGeo = new THREE.BoxGeometry(0.032, 0.006, 0.05);
        const lifter = new THREE.Mesh(lifterGeo, receiverMat);
        lifter.position.set(0, -0.03, 0.0);
        group.add(lifter);

        // Shell carrier latch
        const latchGeo = new THREE.BoxGeometry(0.01, 0.004, 0.015);
        const latch = new THREE.Mesh(latchGeo, accentMat);
        latch.position.set(0, -0.033, 0.025);
        group.add(latch);

        // Loading port opening
        const loadPortGeo = new THREE.BoxGeometry(0.03, 0.004, 0.04);
        const loadPort = new THREE.Mesh(loadPortGeo, darkMat);
        loadPort.position.set(0, -0.025, 0.0);
        group.add(loadPort);

        // === TRIGGER ASSEMBLY ===
        const guardGeo = new THREE.BoxGeometry(0.04, 0.005, 0.075);
        const guard = new THREE.Mesh(guardGeo, receiverMat);
        guard.position.set(0, -0.035, 0.02);
        group.add(guard);

        // Trigger guard front (rounded)
        const guardFrontGeo = new THREE.BoxGeometry(0.04, 0.015, 0.004);
        const guardFront = new THREE.Mesh(guardFrontGeo, receiverMat);
        guardFront.position.set(0, -0.028, -0.015);
        group.add(guardFront);

        // Trigger
        const triggerGeo = new THREE.BoxGeometry(0.006, 0.02, 0.004);
        const trigger = new THREE.Mesh(triggerGeo, barrelMat);
        trigger.position.set(0, -0.025, 0.015);
        trigger.rotation.x = -0.2;
        group.add(trigger);

        // === CROSS-BOLT SAFETY ===
        const safetyGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.014, 6);
        safetyGeo.rotateZ(Math.PI / 2);
        const safety = new THREE.Mesh(safetyGeo, accentMat);
        safety.position.set(0.03, 0.005, 0.04);
        group.add(safety);

        // Safety button (right side)
        const safetyBtnGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.003, 8);
        safetyBtnGeo.rotateZ(Math.PI / 2);
        const safetyBtn = new THREE.Mesh(safetyBtnGeo, accentMat);
        safetyBtn.position.set(0.037, 0.005, 0.04);
        group.add(safetyBtn);

        // === WOODEN STOCK ===
        const stockGeo = new THREE.BoxGeometry(0.05, 0.06, 0.2);
        const stock = new THREE.Mesh(stockGeo, woodMat);
        stock.position.set(0, 0.005, 0.16);
        group.add(stock);

        // Stock wrist (narrow grip area)
        const stockWristGeo = new THREE.BoxGeometry(0.044, 0.055, 0.06);
        const stockWrist = new THREE.Mesh(stockWristGeo, woodMat);
        stockWrist.position.set(0, 0.0, 0.06);
        group.add(stockWrist);

        // Stock grip area (slightly wider)
        const stockGripGeo = new THREE.BoxGeometry(0.052, 0.065, 0.06);
        const stockGrip = new THREE.Mesh(stockGripGeo, woodMat);
        stockGrip.position.set(0, -0.005, 0.06);
        group.add(stockGrip);

        // Stock comb (raised cheek area)
        const combGeo = new THREE.BoxGeometry(0.042, 0.012, 0.1);
        const comb = new THREE.Mesh(combGeo, woodMat);
        comb.position.set(0, 0.04, 0.16);
        group.add(comb);

        // Stock checkering pattern (diamond grip texture)
        for (let i = 0; i < 5; i++) {
            const checkGeo = new THREE.BoxGeometry(0.053, 0.003, 0.06);
            const check = new THREE.Mesh(checkGeo, woodDarkMat);
            check.position.set(0, -0.025 + i * 0.012, 0.06);
            group.add(check);
        }

        // Stock side checkering (vertical)
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 3; i++) {
                const sideCheckGeo = new THREE.BoxGeometry(0.003, 0.04, 0.06);
                const sideCheck = new THREE.Mesh(sideCheckGeo, woodDarkMat);
                sideCheck.position.set(side * 0.027, -0.005, 0.06 + i * 0.015 - 0.015);
                group.add(sideCheck);
            }
        }

        // Stock butt plate (rubber)
        const buttGeo = new THREE.BoxGeometry(0.054, 0.07, 0.018);
        const buttMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85, metalness: 0.15, emissive: 0x080808, emissiveIntensity: 0.1 });
        const butt = new THREE.Mesh(buttGeo, buttMat);
        butt.position.set(0, 0.005, 0.27);
        group.add(butt);

        // Butt plate texture (horizontal grip lines)
        for (let i = 0; i < 5; i++) {
            const texGeo = new THREE.BoxGeometry(0.048, 0.003, 0.019);
            const tex = new THREE.Mesh(texGeo, receiverMat);
            tex.position.set(0, -0.02 + i * 0.012, 0.27);
            group.add(tex);
        }

        // Butt plate screw (top)
        const buttScrewGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.019, 6);
        buttScrewGeo.rotateX(Math.PI / 2);
        const buttScrew = new THREE.Mesh(buttScrewGeo, accentMat);
        buttScrew.position.set(0, 0.025, 0.27);
        group.add(buttScrew);

        // === MUZZLE ===
        const muzzleGeo = new THREE.CylinderGeometry(0.019, 0.016, 0.03, 10);
        muzzleGeo.rotateX(Math.PI / 2);
        const muzzle = new THREE.Mesh(muzzleGeo, barrelMat);
        muzzle.position.set(0, 0.025, -0.57);
        group.add(muzzle);

        // Muzzle crown (recessed)
        const crownGeo = new THREE.CylinderGeometry(0.014, 0.016, 0.004, 10);
        crownGeo.rotateX(Math.PI / 2);
        const crown = new THREE.Mesh(crownGeo, darkMat);
        crown.position.set(0, 0.025, -0.586);
        group.add(crown);

        // === RECEIVER DETAILS ===
        // Shell stop (visible inside loading port)
        const shellStopGeo = new THREE.BoxGeometry(0.008, 0.006, 0.01);
        const shellStop = new THREE.Mesh(shellStopGeo, accentMat);
        shellStop.position.set(-0.02, -0.022, -0.01);
        group.add(shellStop);

        // Hammer (visible at rear of receiver)
        const hammerGeo = new THREE.BoxGeometry(0.015, 0.015, 0.006);
        const hammer = new THREE.Mesh(hammerGeo, receiverMat);
        hammer.position.set(0, 0.035, 0.08);
        group.add(hammer);

        // Hammer spur
        const spurGeo = new THREE.BoxGeometry(0.018, 0.004, 0.01);
        const spur = new THREE.Mesh(spurGeo, accentMat);
        spur.position.set(0, 0.043, 0.082);
        group.add(spur);

        return group;
    }

    _buildM1911() {
        const group = new THREE.Group();

        const slideMat = new THREE.MeshStandardMaterial({ color: 0x2e2e2e, roughness: 0.2, metalness: 0.92, emissive: 0x111111, emissiveIntensity: 0.15 });
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.35, metalness: 0.8, emissive: 0x111111, emissiveIntensity: 0.15 });
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.2, metalness: 0.95, emissive: 0x0a0a0a, emissiveIntensity: 0.15 });
        const gripMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.85, metalness: 0.05, emissive: 0x120c08, emissiveIntensity: 0.2 });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0xc0a060, roughness: 0.4, metalness: 0.6, emissive: 0x403018, emissiveIntensity: 0.25 });
        const triggerMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.85, emissive: 0x222222, emissiveIntensity: 0.15 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.25, metalness: 0.95, emissive: 0x050505, emissiveIntensity: 0.1 });

        // === SLIDE ===
        const slideGeo = new THREE.BoxGeometry(0.042, 0.032, 0.26);
        const slide = new THREE.Mesh(slideGeo, slideMat);
        slide.position.set(0, 0.025, -0.08);
        group.add(slide);

        // Slide top contour (slight crown for realism)
        const slideTopGeo = new THREE.BoxGeometry(0.038, 0.004, 0.26);
        const slideTop = new THREE.Mesh(slideTopGeo, slideMat);
        slideTop.position.set(0, 0.043, -0.08);
        group.add(slideTop);

        // Slide bottom chamfer (where slide meets frame rails)
        for (let side = -1; side <= 1; side += 2) {
            const chamferGeo = new THREE.BoxGeometry(0.004, 0.004, 0.26);
            const chamfer = new THREE.Mesh(chamferGeo, slideMat);
            chamfer.position.set(side * 0.02, 0.007, -0.08);
            group.add(chamfer);
        }

        // Slide rear serrations (deeper, more defined)
        for (let i = 0; i < 8; i++) {
            const serrGeo = new THREE.BoxGeometry(0.044, 0.003, 0.006);
            const serr = new THREE.Mesh(serrGeo, darkMat);
            serr.position.set(0, 0.025, 0.03 + i * 0.008);
            group.add(serr);
        }

        // Slide front serrations
        for (let i = 0; i < 5; i++) {
            const serrGeo = new THREE.BoxGeometry(0.044, 0.003, 0.006);
            const serr = new THREE.Mesh(serrGeo, darkMat);
            serr.position.set(0, 0.025, -0.175 + i * 0.008);
            group.add(serr);
        }

        // === NOVAK-STYLE SIGHTS ===
        // Rear sight (Novak low-mount, beveled)
        const rearBaseGeo = new THREE.BoxGeometry(0.03, 0.01, 0.018);
        const rearBase = new THREE.Mesh(rearBaseGeo, slideMat);
        rearBase.position.set(0, 0.046, 0.08);
        group.add(rearBase);

        // Rear sight notch (U-notch white outline)
        const rearNotchGeo = new THREE.BoxGeometry(0.012, 0.006, 0.008);
        const rearNotch = new THREE.Mesh(rearNotchGeo, darkMat);
        rearNotch.position.set(0, 0.051, 0.078);
        group.add(rearNotch);

        // Rear sight bevel (angled sides)
        for (let side = -1; side <= 1; side += 2) {
            const bevelGeo = new THREE.BoxGeometry(0.005, 0.008, 0.018);
            const bevel = new THREE.Mesh(bevelGeo, slideMat);
            bevel.position.set(side * 0.017, 0.047, 0.08);
            group.add(bevel);
        }

        // Front sight (ramped Novak-style)
        const frontSightGeo = new THREE.BoxGeometry(0.008, 0.01, 0.01);
        const frontSight = new THREE.Mesh(frontSightGeo, slideMat);
        frontSight.position.set(0, 0.046, -0.195);
        group.add(frontSight);

        // Front sight white dot
        const frontDotGeo = new THREE.SphereGeometry(0.002, 4, 3);
        const frontDot = new THREE.Mesh(frontDotGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 }));
        frontDot.position.set(0, 0.052, -0.195);
        group.add(frontDot);

        // Rear sight dots (two dots flanking notch)
        for (let side = -1; side <= 1; side += 2) {
            const dotGeo = new THREE.SphereGeometry(0.0015, 4, 3);
            const dot = new THREE.Mesh(dotGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 }));
            dot.position.set(side * 0.006, 0.052, 0.078);
            group.add(dot);
        }

        // === EJECTION PORT ===
        const ejectGeo = new THREE.BoxGeometry(0.025, 0.012, 0.035);
        const eject = new THREE.Mesh(ejectGeo, darkMat);
        eject.position.set(0.022, 0.025, -0.02);
        group.add(eject);

        // Extractor (visible claw)
        const extractorGeo = new THREE.BoxGeometry(0.004, 0.006, 0.02);
        const extractor = new THREE.Mesh(extractorGeo, accentMat);
        extractor.position.set(0.02, 0.033, -0.02);
        group.add(extractor);

        // === BARREL ASSEMBLY ===
        const bblGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.18, 8);
        bblGeo.rotateX(Math.PI / 2);
        const bbl = new THREE.Mesh(bblGeo, barrelMat);
        bbl.position.set(0, 0.018, -0.14);
        group.add(bbl);

        // Barrel bushing (muzzle end)
        const bushingGeo = new THREE.CylinderGeometry(0.015, 0.014, 0.014, 10);
        bushingGeo.rotateX(Math.PI / 2);
        const bushing = new THREE.Mesh(bushingGeo, slideMat);
        bushing.position.set(0, 0.018, -0.215);
        group.add(bushing);

        // Bushing lock ring
        const lockRingGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.004, 10);
        lockRingGeo.rotateX(Math.PI / 2);
        const lockRing = new THREE.Mesh(lockRingGeo, frameMat);
        lockRing.position.set(0, 0.018, -0.207);
        group.add(lockRing);

        // Barrel bore
        const boreGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.004, 8);
        boreGeo.rotateX(Math.PI / 2);
        const bore = new THREE.Mesh(boreGeo, darkMat);
        bore.position.set(0, 0.018, -0.223);
        group.add(bore);

        // Barrel link (connects barrel to frame)
        const linkGeo = new THREE.BoxGeometry(0.004, 0.015, 0.006);
        const link = new THREE.Mesh(linkGeo, frameMat);
        link.position.set(0, 0.005, -0.09);
        link.rotation.x = 0.2;
        group.add(link);

        // Barrel link pin
        const linkPinGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.045, 6);
        linkPinGeo.rotateZ(Math.PI / 2);
        const linkPin = new THREE.Mesh(linkPinGeo, accentMat);
        linkPin.position.set(0, 0.005, -0.09);
        group.add(linkPin);

        // === FRAME (lower) ===
        const frameGeo = new THREE.BoxGeometry(0.04, 0.025, 0.22);
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, 0.0, -0.06);
        group.add(frame);

        // Frame dust cover (front of frame under barrel)
        const dustCoverGeo = new THREE.BoxGeometry(0.036, 0.012, 0.06);
        const dustCover = new THREE.Mesh(dustCoverGeo, frameMat);
        dustCover.position.set(0, -0.008, -0.17);
        group.add(dustCover);

        // Frame rail (left - slide rides on this)
        const frameRailGeo = new THREE.BoxGeometry(0.003, 0.008, 0.22);
        const frameRailL = new THREE.Mesh(frameRailGeo, frameMat);
        frameRailL.position.set(-0.019, 0.01, -0.06);
        group.add(frameRailL);

        const frameRailR = new THREE.Mesh(frameRailGeo, frameMat);
        frameRailR.position.set(0.019, 0.01, -0.06);
        group.add(frameRailR);

        // === TRIGGER GUARD ===
        const guardGeo = new THREE.BoxGeometry(0.028, 0.004, 0.055);
        const guard = new THREE.Mesh(guardGeo, frameMat);
        guard.position.set(0, -0.018, 0.0);
        group.add(guard);

        // Trigger guard front (rounded, undercut)
        const guardFrontGeo = new THREE.BoxGeometry(0.028, 0.02, 0.004);
        const guardFront = new THREE.Mesh(guardFrontGeo, frameMat);
        guardFront.position.set(0, -0.01, -0.025);
        group.add(guardFront);

        // Trigger guard rear
        const guardRearGeo = new THREE.BoxGeometry(0.028, 0.008, 0.004);
        const guardRear = new THREE.Mesh(guardRearGeo, frameMat);
        guardRear.position.set(0, -0.015, 0.025);
        group.add(guardRear);

        // === TRIGGER ===
        const triggerGeo = new THREE.BoxGeometry(0.005, 0.02, 0.004);
        const trigger = new THREE.Mesh(triggerGeo, triggerMat);
        trigger.position.set(0, -0.01, -0.005);
        trigger.rotation.x = -0.15;
        group.add(trigger);

        // Trigger bow (thin wire shape - skeletonized)
        const bowGeo = new THREE.BoxGeometry(0.003, 0.003, 0.025);
        const bow = new THREE.Mesh(bowGeo, triggerMat);
        bow.position.set(0, -0.02, -0.005);
        group.add(bow);

        // Trigger bow sides
        for (let side = -1; side <= 1; side += 2) {
            const bowSideGeo = new THREE.BoxGeometry(0.003, 0.008, 0.003);
            const bowSide = new THREE.Mesh(bowSideGeo, triggerMat);
            bowSide.position.set(0, -0.015, side * 0.012 - 0.005);
            group.add(bowSide);
        }

        // === HAMMER ===
        const hammerGeo = new THREE.BoxGeometry(0.02, 0.02, 0.008);
        const hammer = new THREE.Mesh(hammerGeo, frameMat);
        hammer.position.set(0, 0.02, 0.1);
        hammer.rotation.x = -0.3;
        group.add(hammer);

        // Hammer spur (serrated)
        const spurGeo = new THREE.BoxGeometry(0.024, 0.005, 0.014);
        const spur = new THREE.Mesh(spurGeo, accentMat);
        spur.position.set(0, 0.032, 0.105);
        group.add(spur);

        // Hammer spur serrations
        for (let i = 0; i < 3; i++) {
            const serrGeo = new THREE.BoxGeometry(0.026, 0.002, 0.003);
            const serr = new THREE.Mesh(serrGeo, frameMat);
            serr.position.set(0, 0.035, 0.1 + i * 0.005);
            group.add(serr);
        }

        // Hammer pin
        const hammerPinGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.045, 6);
        hammerPinGeo.rotateZ(Math.PI / 2);
        const hammerPin = new THREE.Mesh(hammerPinGeo, accentMat);
        hammerPin.position.set(0, 0.022, 0.1);
        group.add(hammerPin);

        // === BEAVERTAIL GRIP SAFETY ===
        const gripSafetyGeo = new THREE.BoxGeometry(0.038, 0.075, 0.03);
        const gripSafety = new THREE.Mesh(gripSafetyGeo, frameMat);
        gripSafety.position.set(0, -0.042, 0.06);
        gripSafety.rotation.x = -0.15;
        group.add(gripSafety);

        // Beavertail extension (palm swell)
        const beaverGeo = new THREE.BoxGeometry(0.032, 0.02, 0.02);
        const beaver = new THREE.Mesh(beaverGeo, frameMat);
        beaver.position.set(0, 0.005, 0.085);
        beaver.rotation.x = -0.2;
        group.add(beaver);

        // Grip safety pivot area
        const safetyPivotGeo = new THREE.BoxGeometry(0.04, 0.008, 0.008);
        const safetyPivot = new THREE.Mesh(safetyPivotGeo, frameMat);
        safetyPivot.position.set(0, -0.005, 0.075);
        group.add(safetyPivot);

        // === GRIP PANELS ===
        // Left grip panel
        const gripLGeo = new THREE.BoxGeometry(0.008, 0.065, 0.06);
        const gripL = new THREE.Mesh(gripLGeo, gripMat);
        gripL.position.set(-0.024, -0.035, 0.04);
        gripL.rotation.x = -0.1;
        group.add(gripL);

        // Right grip panel
        const gripRGeo = new THREE.BoxGeometry(0.008, 0.065, 0.06);
        const gripR = new THREE.Mesh(gripRGeo, gripMat);
        gripR.position.set(0.024, -0.035, 0.04);
        gripR.rotation.x = -0.1;
        group.add(gripR);

        // Grip diamond checkering pattern (25 LPI style - more dense)
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 3; col++) {
                const checkGeo = new THREE.BoxGeometry(0.009, 0.006, 0.006);
                const checkL = new THREE.Mesh(checkGeo, new THREE.MeshStandardMaterial({ color: 0x2a1a0e, roughness: 0.9, emissive: 0x0a0604, emissiveIntensity: 0.1 }));
                checkL.position.set(-0.025, -0.01 + row * -0.012, 0.015 + col * 0.015);
                checkL.rotation.x = -0.1;
                group.add(checkL);

                const checkR = new THREE.Mesh(checkGeo, new THREE.MeshStandardMaterial({ color: 0x2a1a0e, roughness: 0.9, emissive: 0x0a0604, emissiveIntensity: 0.1 }));
                checkR.position.set(0.025, -0.01 + row * -0.012, 0.015 + col * 0.015);
                checkR.rotation.x = -0.1;
                group.add(checkR);
            }
        }

        // Grip screw (each side)
        for (let side = -1; side <= 1; side += 2) {
            const screwGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.009, 6);
            screwGeo.rotateZ(Math.PI / 2);
            const screw = new THREE.Mesh(screwGeo, accentMat);
            screw.position.set(side * 0.025, -0.035, 0.04);
            group.add(screw);
        }

        // === MAGAZINE ===
        const magGeo = new THREE.BoxGeometry(0.028, 0.06, 0.04);
        const mag = new THREE.Mesh(magGeo, frameMat);
        mag.position.set(0, -0.06, 0.03);
        group.add(mag);

        // Magazine body ribs
        for (let i = 0; i < 3; i++) {
            const magRibGeo = new THREE.BoxGeometry(0.03, 0.002, 0.04);
            const magRib = new THREE.Mesh(magRibGeo, slideMat);
            magRib.position.set(0, -0.045 + i * -0.015, 0.03);
            group.add(magRib);
        }

        // Magazine base pad (extended)
        const magPadGeo = new THREE.BoxGeometry(0.03, 0.01, 0.042);
        const magPad = new THREE.Mesh(magPadGeo, accentMat);
        magPad.position.set(0, -0.095, 0.03);
        group.add(magPad);

        // Magazine base pad bottom
        const magPadBotGeo = new THREE.BoxGeometry(0.032, 0.004, 0.044);
        const magPadBot = new THREE.Mesh(magPadBotGeo, frameMat);
        magPadBot.position.set(0, -0.1, 0.03);
        group.add(magPadBot);

        // === MAGAZINE RELEASE (extended) ===
        const magRelGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.012, 6);
        magRelGeo.rotateZ(Math.PI / 2);
        const magRel = new THREE.Mesh(magRelGeo, frameMat);
        magRel.position.set(0.026, -0.01, 0.02);
        group.add(magRel);

        // Magazine release checkered face
        const magRelFaceGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.002, 8);
        magRelFaceGeo.rotateZ(Math.PI / 2);
        const magRelFace = new THREE.Mesh(magRelFaceGeo, accentMat);
        magRelFace.position.set(0.032, -0.01, 0.02);
        group.add(magRelFace);

        // === SLIDE STOP ===
        const slideStopGeo = new THREE.BoxGeometry(0.018, 0.006, 0.03);
        const slideStop = new THREE.Mesh(slideStopGeo, frameMat);
        slideStop.position.set(-0.028, 0.01, 0.0);
        group.add(slideStop);

        // Slide stop checkered pad (left side)
        const stopPadGeo = new THREE.BoxGeometry(0.004, 0.008, 0.025);
        const stopPad = new THREE.Mesh(stopPadGeo, frameMat);
        stopPad.position.set(-0.032, 0.01, 0.0);
        group.add(stopPad);

        // Slide stop button (right side)
        const stopBtnGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.006, 6);
        stopBtnGeo.rotateZ(Math.PI / 2);
        const stopBtn = new THREE.Mesh(stopBtnGeo, frameMat);
        stopBtn.position.set(0.024, 0.01, 0.0);
        group.add(stopBtn);

        // Slide stop pin
        const stopPinGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.05, 6);
        stopPinGeo.rotateZ(Math.PI / 2);
        const stopPin = new THREE.Mesh(stopPinGeo, accentMat);
        stopPin.position.set(0, 0.01, 0.0);
        group.add(stopPin);

        // === THUMB SAFETY ===
        const safetyGeo = new THREE.BoxGeometry(0.014, 0.005, 0.04);
        const safety = new THREE.Mesh(safetyGeo, frameMat);
        safety.position.set(-0.028, 0.018, 0.04);
        group.add(safety);

        // Safety shelf (raised portion)
        const safetyShelfGeo = new THREE.BoxGeometry(0.006, 0.007, 0.02);
        const safetyShelf = new THREE.Mesh(safetyShelfGeo, frameMat);
        safetyShelf.position.set(-0.03, 0.02, 0.04);
        group.add(safetyShelf);

        // Right side safety
        const safetyRGeo = new THREE.BoxGeometry(0.008, 0.005, 0.035);
        const safetyR = new THREE.Mesh(safetyRGeo, frameMat);
        safetyR.position.set(0.028, 0.018, 0.04);
        group.add(safetyR);

        // === MAINSPRING HOUSING ===
        const housingGeo = new THREE.BoxGeometry(0.034, 0.042, 0.016);
        const housing = new THREE.Mesh(housingGeo, frameMat);
        housing.position.set(0, -0.042, 0.07);
        housing.rotation.x = -0.15;
        group.add(housing);

        // Mainspring housing checkering
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 2; col++) {
                const houseCheckGeo = new THREE.BoxGeometry(0.006, 0.006, 0.004);
                const houseCheck = new THREE.Mesh(houseCheckGeo, darkMat);
                houseCheck.position.set(-0.006 + col * 0.012, -0.03 + row * -0.01, 0.078);
                houseCheck.rotation.x = -0.15;
                group.add(houseCheck);
            }
        }

        // === PLUNGER TUBE ===
        const plungerGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.04, 6);
        plungerGeo.rotateZ(Math.PI / 2);
        const plunger = new THREE.Mesh(plungerGeo, barrelMat);
        plunger.position.set(-0.025, 0.005, 0.04);
        group.add(plunger);

        // Plunger tube cap
        const plungerCapGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.004, 6);
        plungerCapGeo.rotateZ(Math.PI / 2);
        const plungerCap = new THREE.Mesh(plungerCapGeo, frameMat);
        plungerCap.position.set(-0.028, 0.005, 0.02);
        group.add(plungerCap);

        // === EJECTOR ===
        const ejectorGeo = new THREE.BoxGeometry(0.004, 0.006, 0.03);
        const ejector = new THREE.Mesh(ejectorGeo, frameMat);
        ejector.position.set(-0.008, 0.012, -0.07);
        group.add(ejector);

        // === LANYARD LOOP ===
        const lanyardGeo = new THREE.TorusGeometry(0.007, 0.002, 4, 6);
        lanyardGeo.rotateY(Math.PI / 2);
        const lanyard = new THREE.Mesh(lanyardGeo, frameMat);
        lanyard.position.set(0, -0.072, 0.078);
        group.add(lanyard);

        // Lanyard loop pin
        const lanyardPinGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.035, 6);
        lanyardPinGeo.rotateZ(Math.PI / 2);
        const lanyardPin = new THREE.Mesh(lanyardPinGeo, accentMat);
        lanyardPin.position.set(0, -0.072, 0.078);
        group.add(lanyardPin);

        return group;
    }

    _createFlashlight() {
        // Main flashlight beam — strong, wide, long range
        this.flashlight = new THREE.SpotLight(0xffeedd, 4.0, 55, Math.PI / 3.5, 0.35, 1.2);
        this.flashlight.position.set(0, 0, 0);
        this.flashlight.castShadow = false;
        this.camera.add(this.flashlight);

        // Target needs to be in the scene for SpotLight to work
        const target = new THREE.Object3D();
        target.position.set(0, 0, -1);
        this.camera.add(target);
        this.flashlight.target = target;

        // Soft ambient glow around the player so the area right around you is never pitch black
        this.playerLight = new THREE.PointLight(0xccddff, 0.6, 12, 2);
        this.playerLight.position.set(0, -0.5, 0);
        this.camera.add(this.playerLight);
    }

    toggleFlashlight() {
        this.flashlightOn = !this.flashlightOn;
        if (this.flashlight) {
            this.flashlight.visible = this.flashlightOn;
        }
        if (this.playerLight) {
            this.playerLight.visible = this.flashlightOn;
        }
    }

    update(dt, input) {
        if (!this.alive) return;

        if (this.downed) {
            this.downTimer -= dt;
            if (this.downTimer <= 0) {
                this.die();
            }
            return;
        }

        this._moveForward = input.isKeyDown('KeyW');
        this._moveBackward = input.isKeyDown('KeyS');
        this._moveLeft = input.isKeyDown('KeyA');
        this._moveRight = input.isKeyDown('KeyD');

        this.sprinting = input.isKeyDown('ShiftLeft') && this._moveForward && !this.aiming;
        this.crouching = input.isKeyDown('ControlLeft');
        this.aiming = input.isMouseDown(2);

        const targetHeight = this.crouching ? this.crouchHeight : this.height;
        this.currentHeight = MathUtils.lerp(this.currentHeight, targetHeight, dt * 10);

        const moveSpeed = this.speed * (this.sprinting ? this.sprintMultiplier : 1) * (this.crouching ? this.crouchMultiplier : 1);
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);

        const moveDir = new THREE.Vector3();
        if (this._moveForward) moveDir.add(forward);
        if (this._moveBackward) moveDir.sub(forward);
        if (this._moveRight) moveDir.add(right);
        if (this._moveLeft) moveDir.sub(right);

        if (moveDir.lengthSq() > 0) {
            moveDir.normalize().multiplyScalar(moveSpeed);
        }

        this.velocity.x = MathUtils.damp(this.velocity.x, moveDir.x, 15, dt);
        this.velocity.z = MathUtils.damp(this.velocity.z, moveDir.z, 15, dt);

        if (!this.onGround) {
            this.velocity.y += this.gravity * dt;
        }

        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.position.z += this.velocity.z * dt;

        if (this.position.y <= this.currentHeight) {
            this.position.y = this.currentHeight;
            this.velocity.y = 0;
            this.onGround = true;
        }

        if (input.isKeyJustPressed('Space') && this.onGround && !this.crouching) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }

        const mouseDelta = input.getMouseDelta();
        this.rotation.y -= mouseDelta.x;
        this.rotation.x -= mouseDelta.y;
        this.rotation.x = MathUtils.clamp(this.rotation.x, -Math.PI / 2.2, Math.PI / 2.2);

        this.recoilX = MathUtils.damp(this.recoilX, 0, this.recoilRecovery, dt);
        this.recoilY = MathUtils.damp(this.recoilY, 0, this.recoilRecovery, dt);

        const moving = this.isMoving() && this.onGround;
        const bobSpeed = this.sprinting ? 12 : 8;
        const bobTarget = moving ? (this.sprinting ? 0.06 : 0.03) : 0;
        this.bobAmplitude = MathUtils.damp(this.bobAmplitude, bobTarget, 8, dt);

        if (moving) {
            this.bobPhase += dt * bobSpeed;
        } else {
            this.bobPhase = MathUtils.damp(this.bobPhase, 0, 4, dt);
        }

        this.bobY = Math.sin(this.bobPhase) * this.bobAmplitude;
        this.bobX = Math.cos(this.bobPhase * 0.5) * this.bobAmplitude * 0.5;

        this.camera.position.copy(this.position);
        this.camera.position.y = this.position.y - this.height + this.currentHeight + this.bobY;
        this.camera.position.x += this.bobX;
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.rotation.y;
        this.camera.rotation.x = this.rotation.x + this.recoilX;

        // Viewmodel animation
        if (this.viewmodel) {
            // Viewmodel recoil kick (kicks back and up when firing)
            this.viewmodelRecoilOffset = MathUtils.damp(this.viewmodelRecoilOffset, 0, 12, dt);

            // Viewmodel bob synced with player movement
            const vmBobScale = this.sprinting ? 1.5 : 1.0;
            this.viewmodelBobX = MathUtils.damp(this.viewmodelBobX, this.bobX * vmBobScale * 3, 10, dt);
            this.viewmodelBobY = MathUtils.damp(this.viewmodelBobY, this.bobY * vmBobScale * 2, 10, dt);

            // Swap animation (weapon raise from below)
            if (this.viewmodelSwapTimer > 0) {
                this.viewmodelSwapTimer -= dt;
            }
            const swapT = this.viewmodelSwapTimer > 0 ? (1 - this.viewmodelSwapTimer / this.viewmodelSwapDuration) : 1;
            const swapOffset = this.viewmodelSwapTimer > 0 ? MathUtils.easeOutQuad(swapT) * 0.15 : 0;

            // Aiming offset (move weapon to center, weapon-specific)
            const aimT = this.aiming ? 1 : 0;
            const cfg = this._viewmodelConfigs ? (this._viewmodelConfigs[this._currentViewmodelIndex || 0] || this._viewmodelConfigs[0]) : { hipX: 0.25, hipY: -0.22, hipZ: -0.4, adsX: 0.12, adsY: -0.18, adsZ: -0.35 };
            const aimOffsetX = MathUtils.lerp(cfg.hipX, cfg.adsX, aimT);
            const aimOffsetY = MathUtils.lerp(cfg.hipY, cfg.adsY, aimT);
            const aimOffsetZ = MathUtils.lerp(cfg.hipZ, cfg.adsZ, aimT);

            this.viewmodel.position.set(
                aimOffsetX + this.viewmodelBobX * 0.3,
                aimOffsetY + this.viewmodelBobY * 0.5 - swapOffset + this.viewmodelRecoilOffset * 0.02,
                aimOffsetZ + this.viewmodelRecoilOffset * 0.04
            );

            this.viewmodel.rotation.x = -this.viewmodelRecoilOffset * 0.15 + this.viewmodelBobY * 0.8;
            this.viewmodel.rotation.z = this.viewmodelBobX * 0.5;
        }
    }

    applyViewmodelRecoil(amount) {
        this.viewmodelRecoilOffset = amount;
    }

    playViewmodelSwap() {
        this.viewmodelSwapTimer = this.viewmodelSwapDuration;
    }

    takeDamage(amount, attackerPos) {
        if (!this.alive || this.downed) return;

        amount = Math.floor(amount * (1 - this.armor));
        this.health -= amount;

        if (attackerPos) {
            this.hitDirection.set(
                this.position.x - attackerPos.x,
                0,
                this.position.z - attackerPos.z
            ).normalize();
        }

        if (this.onDamage) {
            this.onDamage(amount, attackerPos);
        }

        if (this.health <= 0) {
            this.health = 0;
            this.downed = true;
            this.downTimer = this.downDuration;
        }
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    revive() {
        this.downed = false;
        this.health = 50;
        this.downTimer = 0;
    }

    die() {
        this.alive = false;
        this.downed = false;
    }

    reset() {
        this.health = 100;
        this.maxHealth = 100;
        this.armor = 0;
        this.alive = true;
        this.downed = false;
        this.downTimer = 0;
        this.position.set(0, 1.7, 0);
        this.velocity.set(0, 0, 0);
        this.rotation.x = 0;
        this.rotation.y = 0;
        this.recoilX = 0;
        this.recoilY = 0;
        this.sprinting = false;
        this.crouching = false;
        this.aiming = false;
        this.currentHeight = this.height;
        this.onGround = true;
        this.bobPhase = 0;
        this.bobAmplitude = 0;
        this.bobX = 0;
        this.bobY = 0;
        this._moveForward = false;
        this._moveBackward = false;
        this._moveLeft = false;
        this._moveRight = false;
        this.hitDirection.set(0, 0, 0);
        this.viewmodelRecoilOffset = 0;
        this.viewmodelBobX = 0;
        this.viewmodelBobY = 0;
        this.viewmodelSwapTimer = 0;
        this.switchViewmodel(0);
    }

    applyRecoil(x, y) {
        this.recoilX += x;
        this.recoilY += y;
    }

    getForward() {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
        return dir;
    }

    getLookDirection() {
        const dir = new THREE.Vector3(0, 0, -1);
        const euler = new THREE.Euler(this.rotation.x, this.rotation.y, 0, 'YXZ');
        dir.applyEuler(euler);
        return dir;
    }

    isMoving() {
        return this._moveForward || this._moveBackward || this._moveLeft || this._moveRight;
    }
}

// --- enemies/Zombie.js ---

const ZOMBIE_STATES = {
    IDLE: 'idle',
    ROAMING: 'roaming',
    CHASING: 'chasing',
    ATTACKING: 'attacking',
    STAGGERED: 'staggered',
    DOWNED: 'downed',
    DYING: 'dying'
};

class Zombie {
    constructor(config, scene) {
        this.scene = scene;
        this.type = config.type || 'runner';
        this.health = config.health || 80;
        this.maxHealth = this.health;
        this.speed = config.speed || 4.5;
        this.damage = config.damage || 15;
        this.attackRange = config.attackRange || 1.8;
        this.attackCooldown = config.attackCooldown || 1.0;
        this.detectionRange = config.detectionRange || 35;
        this.staggerThreshold = config.staggerThreshold || 30;
        this.headshotMultiplier = config.headshotMultiplier || 2.5;
        this.scoreValue = config.scoreValue || 100;
        this.armor = config.armor || 0;
        this.bodyColor = config.bodyColor || 0x556b2f;
        this.skinColor = config.skinColor || 0x7a9a6a;
        this.eyeColor = config.eyeColor || 0xcc2200;
        this.scale = config.scale || 1.0;

        this.position = new THREE.Vector3(config.x || 0, 0, config.z || 0);
        this.rotation = Math.random() * Math.PI * 2;
        this.velocity = new THREE.Vector3();

        this.alive = true;
        this.state = ZOMBIE_STATES.IDLE;
        this.prevState = null;

        this.target = null;
        this.attackTimer = 0;
        this.staggerTimer = 0;
        this.stateTimer = 0;
        this.roamTimer = 0;
        this.roamTarget = null;
        this._targets = [];
        this.deathTimer = 0;

        this.thinkTimer = 0;
        this.thinkInterval = 0.15 + Math.random() * 0.1;

        this.hitFlashTimer = 0;
        this.hitFlashDuration = 0.1;
        this._originalBodyColor = this.bodyColor;

        // Animation state
        this._animTime = Math.random() * 100;
        this._walkCycle = 0;
        this._idleSway = 0;
        this._attackAnim = 0;
        this._staggerAnim = 0;
        this._deathAnim = 0;
        this._deathFallDir = Math.random() * Math.PI * 2;
        this._deathFallForward = Math.random() > 0.5;

        this.mesh = this._createMesh();
        this.scene.add(this.mesh);

        this.healthBar = this._createHealthBar();
        this.scene.add(this.healthBar);

        this._lastHitTime = 0;
    }

    _createMaterial(color, opts = {}) {
        return new THREE.MeshStandardMaterial({
            color,
            roughness: opts.roughness ?? 0.85,
            metalness: opts.metalness ?? 0.05,
            emissive: opts.emissive ?? 0x000000,
            emissiveIntensity: opts.emissiveIntensity ?? 0,
            flatShading: opts.flat ?? false,
        });
    }

    _createMesh() {
        const group = new THREE.Group();
        const s = this.scale;
        const skinCol = this.skinColor;
        const bodyCol = this.bodyColor;

        // ── TORSO ──
        const torsoGroup = new THREE.Group();

        // Upper torso (chest) - box-like for broad shoulders
        const chestGeo = new THREE.BoxGeometry(0.55 * s, 0.45 * s, 0.3 * s);
        const chestMat = this._createMaterial(bodyCol);
        const chest = new THREE.Mesh(chestGeo, chestMat);
        chest.position.y = 1.35 * s;
        chest.castShadow = true;
        torsoGroup.add(chest);

        // Rib cage detail - visible through torn shirt
        const ribGeo = new THREE.BoxGeometry(0.48 * s, 0.15 * s, 0.28 * s);
        const ribMat = this._createMaterial(skinCol, { roughness: 0.7 });
        const ribCage = new THREE.Mesh(ribGeo, ribMat);
        ribCage.position.y = 1.22 * s;
        torsoGroup.add(ribCage);

        // Lower torso (abdomen)
        const abdGeo = new THREE.BoxGeometry(0.45 * s, 0.35 * s, 0.25 * s);
        const abdMat = this._createMaterial(bodyCol);
        const abdomen = new THREE.Mesh(abdGeo, abdMat);
        abdomen.position.y = 0.92 * s;
        abdomen.castShadow = true;
        torsoGroup.add(abdomen);

        // Waist / belt area
        const waistGeo = new THREE.CylinderGeometry(0.22 * s, 0.25 * s, 0.1 * s, 8);
        const waistMat = this._createMaterial(0x3a2a1a);
        const waist = new THREE.Mesh(waistGeo, waistMat);
        waist.position.y = 0.72 * s;
        torsoGroup.add(waist);

        group.add(torsoGroup);

        // ── NECK ──
        const neckGeo = new THREE.CylinderGeometry(0.1 * s, 0.12 * s, 0.15 * s, 6);
        const neckMat = this._createMaterial(skinCol);
        const neck = new THREE.Mesh(neckGeo, neckMat);
        neck.position.y = 1.63 * s;
        group.add(neck);

        // ── HEAD ──
        const headGroup = new THREE.Group();
        headGroup.position.y = 1.78 * s;

        // Skull
        const skullGeo = new THREE.SphereGeometry(0.2 * s, 8, 8);
        const skullMat = this._createMaterial(skinCol, { roughness: 0.75 });
        const skull = new THREE.Mesh(skullGeo, skullMat);
        skull.scale.set(1, 1.1, 0.95);
        skull.castShadow = true;
        headGroup.add(skull);

        // Jaw
        const jawGeo = new THREE.BoxGeometry(0.16 * s, 0.07 * s, 0.12 * s);
        const jawMat = this._createMaterial(skinCol, { roughness: 0.8 });
        const jaw = new THREE.Mesh(jawGeo, jawMat);
        jaw.position.y = -0.12 * s;
        jaw.position.z = 0.04 * s;
        headGroup.add(jaw);

        // Left eye socket
        const eyeSocketGeo = new THREE.SphereGeometry(0.05 * s, 6, 4);
        const eyeSocketMat = this._createMaterial(0x1a0a0a);
        const leftEyeSocket = new THREE.Mesh(eyeSocketGeo, eyeSocketMat);
        leftEyeSocket.position.set(-0.08 * s, 0.04 * s, 0.15 * s);
        headGroup.add(leftEyeSocket);

        // Right eye socket
        const rightEyeSocket = new THREE.Mesh(eyeSocketGeo, eyeSocketMat.clone());
        rightEyeSocket.position.set(0.08 * s, 0.04 * s, 0.15 * s);
        headGroup.add(rightEyeSocket);

        // Left glowing eye — very bright so zombies are visible in the dark
        const eyeGeo = new THREE.SphereGeometry(0.04 * s, 6, 4);
        const eyeMat = this._createMaterial(this.eyeColor, {
            emissive: this.eyeColor,
            emissiveIntensity: 3.0,
            roughness: 0.2
        });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.08 * s, 0.04 * s, 0.18 * s);
        headGroup.add(leftEye);

        // Right glowing eye
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
        rightEye.position.set(0.08 * s, 0.04 * s, 0.18 * s);
        headGroup.add(rightEye);

        // Tiny point light on head so zombies cast a faint glow visible from afar
        const eyeGlow = new THREE.PointLight(this.eyeColor, 0.25, 8, 2);
        eyeGlow.position.set(0, 1.78 * s, 0.2 * s);
        group.add(eyeGlow);

        // Nose (flat, broken)
        const noseGeo = new THREE.BoxGeometry(0.05 * s, 0.04 * s, 0.06 * s);
        const noseMat = this._createMaterial(skinCol);
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, -0.01 * s, 0.18 * s);
        nose.rotation.x = -0.2;
        headGroup.add(nose);

        // Exposed teeth
        const teethGeo = new THREE.BoxGeometry(0.13 * s, 0.03 * s, 0.02 * s);
        const teethMat = this._createMaterial(0xcccc99, { roughness: 0.4 });
        const teeth = new THREE.Mesh(teethGeo, teethMat);
        teeth.position.set(0, -0.08 * s, 0.14 * s);
        headGroup.add(teeth);

        // Wound/gore on head
        const woundGeo = new THREE.SphereGeometry(0.04 * s, 5, 4);
        const woundMat = this._createMaterial(0x880000, { roughness: 0.6 });
        const wound = new THREE.Mesh(woundGeo, woundMat);
        wound.position.set(0.1 * s, 0.12 * s, 0.05 * s);
        wound.scale.set(1, 0.5, 1);
        headGroup.add(wound);

        group.add(headGroup);

        // ── LEFT ARM ──
        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.38 * s, 1.4 * s, 0);

        // Upper arm
        const upperArmGeo = new THREE.CapsuleGeometry(0.06 * s, 0.28 * s, 3, 6);
        const upperArmMat = this._createMaterial(skinCol);
        const leftUpperArm = new THREE.Mesh(upperArmGeo, upperArmMat);
        leftUpperArm.position.y = -0.12 * s;
        leftUpperArm.castShadow = true;
        leftArmGroup.add(leftUpperArm);

        // Forearm
        const forearmGeo = new THREE.CapsuleGeometry(0.05 * s, 0.25 * s, 3, 6);
        const forearmMat = this._createMaterial(skinCol);
        const leftForearm = new THREE.Mesh(forearmGeo, forearmMat);
        leftForearm.position.set(0, -0.38 * s, -0.08 * s);
        leftForearm.rotation.x = -0.7;
        leftArmGroup.add(leftForearm);

        // Clawed hand
        const handGeo = new THREE.BoxGeometry(0.08 * s, 0.06 * s, 0.1 * s);
        const handMat = this._createMaterial(skinCol, { roughness: 0.9 });
        const leftHand = new THREE.Mesh(handGeo, handMat);
        leftHand.position.set(0, -0.5 * s, -0.15 * s);
        leftArmGroup.add(leftHand);

        // Claws
        for (let i = -1; i <= 1; i++) {
            const clawGeo = new THREE.ConeGeometry(0.012 * s, 0.06 * s, 4);
            const clawMat = this._createMaterial(0x554433, { roughness: 0.3, metalness: 0.3 });
            const claw = new THREE.Mesh(clawGeo, clawMat);
            claw.position.set(i * 0.025 * s, -0.53 * s, -0.2 * s);
            claw.rotation.x = 0.5;
            leftArmGroup.add(claw);
        }

        group.add(leftArmGroup);

        // ── RIGHT ARM ──
        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.38 * s, 1.4 * s, 0);

        const rightUpperArm = new THREE.Mesh(upperArmGeo, upperArmMat.clone());
        rightUpperArm.position.y = -0.12 * s;
        rightUpperArm.castShadow = true;
        rightArmGroup.add(rightUpperArm);

        const rightForearm = new THREE.Mesh(forearmGeo, forearmMat.clone());
        rightForearm.position.set(0, -0.38 * s, -0.08 * s);
        rightForearm.rotation.x = -0.7;
        rightArmGroup.add(rightForearm);

        const rightHand = new THREE.Mesh(handGeo, handMat.clone());
        rightHand.position.set(0, -0.5 * s, -0.15 * s);
        rightArmGroup.add(rightHand);

        for (let i = -1; i <= 1; i++) {
            const clawGeo = new THREE.ConeGeometry(0.012 * s, 0.06 * s, 4);
            const clawMat = this._createMaterial(0x554433, { roughness: 0.3, metalness: 0.3 });
            const claw = new THREE.Mesh(clawGeo, clawMat);
            claw.position.set(i * 0.025 * s, -0.53 * s, -0.2 * s);
            claw.rotation.x = 0.5;
            rightArmGroup.add(claw);
        }

        group.add(rightArmGroup);

        // ── LEFT LEG ──
        const leftLegGroup = new THREE.Group();
        leftLegGroup.position.set(-0.15 * s, 0.68 * s, 0);

        // Thigh
        const thighGeo = new THREE.CapsuleGeometry(0.09 * s, 0.3 * s, 3, 6);
        const thighMat = this._createMaterial(bodyCol);
        const leftThigh = new THREE.Mesh(thighGeo, thighMat);
        leftThigh.position.y = -0.2 * s;
        leftThigh.castShadow = true;
        leftLegGroup.add(leftThigh);

        // Shin
        const shinGeo = new THREE.CapsuleGeometry(0.07 * s, 0.28 * s, 3, 6);
        const shinMat = this._createMaterial(skinCol);
        const leftShin = new THREE.Mesh(shinGeo, shinMat);
        leftShin.position.y = -0.55 * s;
        leftShin.castShadow = true;
        leftLegGroup.add(leftShin);

        // Foot
        const footGeo = new THREE.BoxGeometry(0.1 * s, 0.06 * s, 0.18 * s);
        const footMat = this._createMaterial(0x333333, { roughness: 0.95 });
        const leftFoot = new THREE.Mesh(footGeo, footMat);
        leftFoot.position.set(0, -0.74 * s, 0.04 * s);
        leftLegGroup.add(leftFoot);

        group.add(leftLegGroup);

        // ── RIGHT LEG ──
        const rightLegGroup = new THREE.Group();
        rightLegGroup.position.set(0.15 * s, 0.68 * s, 0);

        const rightThigh = new THREE.Mesh(thighGeo, thighMat.clone());
        rightThigh.position.y = -0.2 * s;
        rightThigh.castShadow = true;
        rightLegGroup.add(rightThigh);

        const rightShin = new THREE.Mesh(shinGeo, shinMat.clone());
        rightShin.position.y = -0.55 * s;
        rightShin.castShadow = true;
        rightLegGroup.add(rightShin);

        const rightFoot = new THREE.Mesh(footGeo, footMat.clone());
        rightFoot.position.set(0, -0.74 * s, 0.04 * s);
        rightLegGroup.add(rightFoot);

        group.add(rightLegGroup);

        // ── TORN CLOTHING DETAILS ──
        // Tattered sleeve left
        const sleeveGeo = new THREE.CylinderGeometry(0.09 * s, 0.12 * s, 0.15 * s, 6);
        const sleeveMat = this._createMaterial(0x444444, { roughness: 0.95 });
        const leftSleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
        leftSleeve.position.set(-0.38 * s, 1.25 * s, 0);
        group.add(leftSleeve);

        const rightSleeve = new THREE.Mesh(sleeveGeo, sleeveMat.clone());
        rightSleeve.position.set(0.38 * s, 1.25 * s, 0);
        group.add(rightSleeve);

        // Tattered pants cuff
        const cuffGeo = new THREE.CylinderGeometry(0.09 * s, 0.1 * s, 0.08 * s, 6);
        const cuffMat = this._createMaterial(0x444444, { roughness: 0.95 });
        const leftCuff = new THREE.Mesh(cuffGeo, cuffMat);
        leftCuff.position.set(-0.15 * s, 0.42 * s, 0);
        group.add(leftCuff);

        const rightCuff = new THREE.Mesh(cuffGeo, cuffMat.clone());
        rightCuff.position.set(0.15 * s, 0.42 * s, 0);
        group.add(rightCuff);

        // Store references for animation
        group.userData = {
            torsoGroup,
            headGroup,
            leftArmGroup,
            rightArmGroup,
            leftLegGroup,
            rightLegGroup,
            jaw,
        };

        group.position.copy(this.position);
        return group;
    }

    _createHealthBar() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 8;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, 64, 8);
        ctx.fillStyle = '#c62828';
        ctx.fillRect(1, 1, 62, 6);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.3 });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(1.4, 0.22, 1);
        return sprite;
    }

    update(dt, targets, obstacles) {
        if (!this.alive) return;

        this._animTime += dt;

        // Hit flash effect
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= dt;
            this._applyHitFlash();
            if (this.hitFlashTimer <= 0) {
                this._clearHitFlash();
            }
        }

        this.thinkTimer -= dt;
        if (this.thinkTimer <= 0) {
            this.thinkTimer = this.thinkInterval;
            this._think(targets);
        }

        this._move(dt);
        this._updateCombat(dt);
        this._updateAnimation(dt);

        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;

        this.healthBar.position.copy(this.position);
        this.healthBar.position.y += 2.2 * this.scale;

        // Show health bar when chasing, attacking, or damaged
        const wantsBar = this.health < this.maxHealth ||
                         this.state === ZOMBIE_STATES.CHASING ||
                         this.state === ZOMBIE_STATES.ATTACKING;
        if (wantsBar) {
            this.healthBar.material.opacity = MathUtils.lerp(this.healthBar.material.opacity, 0.8, dt * 5);
            this._updateHealthBarTexture();
        } else {
            this.healthBar.material.opacity = MathUtils.lerp(this.healthBar.material.opacity, 0, dt * 3);
        }
    }

    _applyHitFlash() {
        const flashT = this.hitFlashTimer / this.hitFlashDuration;
        const intensity = flashT > 0.5 ? 0.8 : flashT * 1.6;
        this.mesh.traverse((child) => {
            if (child.isMesh && child.material && child.material.emissive) {
                child.material.emissive.setHex(0xff2222);
                child.material.emissiveIntensity = intensity;
            }
        });
    }

    _clearHitFlash() {
        this.mesh.traverse((child) => {
            if (child.isMesh && child.material && child.material.emissive) {
                // Don't clear emissive on eyes - they always glow
                const isEye = child.material.emissiveIntensity > 1;
                if (!isEye) {
                    child.material.emissive.setHex(0x000000);
                    child.material.emissiveIntensity = 0;
                }
            }
        });
    }

    _updateAnimation(dt) {
        const parts = this.mesh.userData;
        if (!parts) return;

        const s = this.scale;

        switch (this.state) {
            case ZOMBIE_STATES.CHASING:
            case ZOMBIE_STATES.ROAMING:
                this._animateWalk(dt, parts, s);
                break;
            case ZOMBIE_STATES.ATTACKING:
                this._animateAttack(dt, parts, s);
                break;
            case ZOMBIE_STATES.STAGGERED:
                this._animateStagger(dt, parts, s);
                break;
            case ZOMBIE_STATES.DYING:
                this._animateDeath(dt, parts, s);
                break;
            default:
                this._animateIdle(dt, parts, s);
                break;
        }
    }

    _animateWalk(dt, parts, s) {
        const walkSpeed = this.state === ZOMBIE_STATES.CHASING ? this.speed * 1.2 : this.speed * 0.8;
        this._walkCycle += dt * walkSpeed * 2;

        const legSwing = Math.sin(this._walkCycle) * 0.6;
        const armSwing = Math.sin(this._walkCycle + Math.PI) * 0.5;

        // Lean forward while chasing
        if (parts.torsoGroup) {
            const leanAngle = this.state === ZOMBIE_STATES.CHASING ? -0.25 : -0.15;
            parts.torsoGroup.rotation.x = leanAngle + Math.sin(this._walkCycle * 0.5) * 0.03;
        }

        // Head bob and look
        if (parts.headGroup) {
            parts.headGroup.rotation.x = -0.15 + Math.sin(this._walkCycle * 0.7) * 0.05;
            parts.headGroup.rotation.z = Math.sin(this._walkCycle * 0.3) * 0.06;
        }

        // Jaw snapping while chasing
        if (parts.jaw && this.state === ZOMBIE_STATES.CHASING) {
            parts.jaw.rotation.x = Math.abs(Math.sin(this._animTime * 5)) * 0.3;
        }

        // Arm swing - zombie-like forward reaching
        if (parts.leftArmGroup) {
            parts.leftArmGroup.rotation.x = -1.0 + armSwing * 0.3;
            parts.leftArmGroup.rotation.z = 0.15;
        }
        if (parts.rightArmGroup) {
            parts.rightArmGroup.rotation.x = -1.0 - armSwing * 0.3;
            parts.rightArmGroup.rotation.z = -0.15;
        }

        // Leg walk cycle
        if (parts.leftLegGroup) {
            parts.leftLegGroup.rotation.x = legSwing;
        }
        if (parts.rightLegGroup) {
            parts.rightLegGroup.rotation.x = -legSwing;
        }

        // Slight vertical bob
        this.position.y = this.baseY + Math.abs(Math.sin(this._walkCycle)) * 0.04 * s;
    }

    _animateAttack(dt, parts, s) {
        this._attackAnim += dt * 8;
        const swing = Math.sin(this._attackAnim);

        if (parts.torsoGroup) {
            parts.torsoGroup.rotation.x = -0.2 + swing * 0.15;
        }

        // Lunge forward with arms
        if (parts.leftArmGroup) {
            parts.leftArmGroup.rotation.x = -1.5 + swing * 0.8;
            parts.leftArmGroup.rotation.z = 0.3 + swing * 0.2;
        }
        if (parts.rightArmGroup) {
            parts.rightArmGroup.rotation.x = -1.5 - swing * 0.8;
            parts.rightArmGroup.rotation.z = -0.3 - swing * 0.2;
        }

        // Jaw snap
        if (parts.jaw) {
            parts.jaw.rotation.x = Math.abs(swing) * 0.5;
        }

        // Head forward
        if (parts.headGroup) {
            parts.headGroup.rotation.x = -0.3 + swing * 0.1;
        }
    }

    _animateStagger(dt, parts, s) {
        this._staggerAnim += dt * 6;

        // Lean back
        if (parts.torsoGroup) {
            parts.torsoGroup.rotation.x = 0.3 + Math.sin(this._staggerAnim) * 0.1;
        }

        // Arms flail
        if (parts.leftArmGroup) {
            parts.leftArmGroup.rotation.x = -0.5 + Math.sin(this._staggerAnim * 1.3) * 0.6;
            parts.leftArmGroup.rotation.z = 0.5 + Math.sin(this._staggerAnim) * 0.4;
        }
        if (parts.rightArmGroup) {
            parts.rightArmGroup.rotation.x = -0.5 - Math.sin(this._staggerAnim * 1.3) * 0.6;
            parts.rightArmGroup.rotation.z = -0.5 - Math.sin(this._staggerAnim) * 0.4;
        }

        // Head snap back
        if (parts.headGroup) {
            parts.headGroup.rotation.x = 0.4 + Math.sin(this._staggerAnim * 2) * 0.1;
        }
    }

    _animateDeath(dt, parts, s) {
        this._deathAnim = Math.min(this._deathAnim + dt * 2.5, 1);

        const t = this._deathAnim;
        const easeT = t * t; // Ease in

        if (this._deathFallForward) {
            // Fall forward
            this.mesh.rotation.x = easeT * (Math.PI / 2);
            this.position.y = this.baseY - easeT * 0.3 * s;
        } else {
            // Fall backward
            this.mesh.rotation.x = -easeT * (Math.PI / 2);
            this.position.y = this.baseY - easeT * 0.3 * s;
        }

        // Limbs go limp
        if (parts.leftArmGroup) {
            parts.leftArmGroup.rotation.x = -0.5 + easeT * 1.5;
            parts.leftArmGroup.rotation.z = easeT * 0.8;
        }
        if (parts.rightArmGroup) {
            parts.rightArmGroup.rotation.x = -0.5 + easeT * 1.2;
            parts.rightArmGroup.rotation.z = -easeT * 0.6;
        }

        // Ragdoll legs
        if (parts.leftLegGroup) {
            parts.leftLegGroup.rotation.x = easeT * 0.5;
        }
        if (parts.rightLegGroup) {
            parts.rightLegGroup.rotation.x = -easeT * 0.3;
        }
    }

    _animateIdle(dt, parts, s) {
        // Subtle breathing sway
        this._idleSway += dt * 0.8;
        const sway = Math.sin(this._idleSway) * 0.02;

        if (parts.torsoGroup) {
            parts.torsoGroup.rotation.z = sway;
            parts.torsoGroup.rotation.x = -0.05;
        }

        if (parts.headGroup) {
            parts.headGroup.rotation.z = sway * 1.5;
            parts.headGroup.rotation.x = Math.sin(this._idleSway * 0.7) * 0.03;
        }

        if (parts.leftArmGroup) {
            parts.leftArmGroup.rotation.x = -0.3 + Math.sin(this._idleSway * 1.1) * 0.05;
        }
        if (parts.rightArmGroup) {
            parts.rightArmGroup.rotation.x = -0.3 - Math.sin(this._idleSway * 1.1) * 0.05;
        }

        // Jaw randomly snaps
        if (parts.jaw) {
            parts.jaw.rotation.x = Math.random() < 0.01 ? 0.3 : MathUtils.lerp(parts.jaw.rotation.x, 0, dt * 5);
        }
    }

    _think(targets) {
        if (this.state === ZOMBIE_STATES.STAGGERED || this.state === ZOMBIE_STATES.DYING) return;

        this._targets = targets;

        let nearestTarget = null;
        let nearestDist = Infinity;

        for (const target of targets) {
            if (!target.alive) continue;
            const dist = this.position.distanceTo(target.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestTarget = target;
            }
        }

        if (!nearestTarget) {
            if (this.state !== ZOMBIE_STATES.ROAMING) {
                this._changeState(ZOMBIE_STATES.ROAMING);
            }
            return;
        }

        this.target = nearestTarget;

        if (nearestDist <= this.attackRange) {
            this._changeState(ZOMBIE_STATES.ATTACKING);
        } else if (nearestDist <= this.detectionRange) {
            this._changeState(ZOMBIE_STATES.CHASING);
        } else if (this.state !== ZOMBIE_STATES.ROAMING) {
            this._changeState(ZOMBIE_STATES.ROAMING);
        }
    }

    _move(dt) {
        switch (this.state) {
            case ZOMBIE_STATES.CHASING:
                if (this.target) {
                    const dir = this.target.position.clone().sub(this.position);
                    dir.y = 0;
                    dir.normalize();
                    this.position.x += dir.x * this.speed * dt;
                    this.position.z += dir.z * this.speed * dt;
                    this.rotation = Math.atan2(dir.x, dir.z);
                }
                break;

            case ZOMBIE_STATES.ROAMING:
                this.roamTimer -= dt;
                if (this.roamTimer <= 0 || !this.roamTarget) {
                    this.roamTimer = 2 + Math.random() * 2;
                    const targetPos = this._targets && this._targets.length > 0 ? this._targets[0].position : null;
                    if (targetPos) {
                        const toTarget = targetPos.clone().sub(this.position);
                        toTarget.y = 0;
                        toTarget.normalize().multiplyScalar(8 + Math.random() * 6);
                        const wobble = MathUtils.randomPointInCircle(3);
                        this.roamTarget = new THREE.Vector3(
                            this.position.x + toTarget.x + wobble.x,
                            0,
                            this.position.z + toTarget.z + wobble.z
                        );
                    } else {
                        const offset = MathUtils.randomPointInCircle(10);
                        this.roamTarget = new THREE.Vector3(
                            this.position.x + offset.x,
                            0,
                            this.position.z + offset.z
                        );
                    }
                }

                if (this.roamTarget) {
                    const dir = this.roamTarget.clone().sub(this.position);
                    dir.y = 0;
                    const dist = dir.length();
                    if (dist > 0.5) {
                        dir.normalize();
                        this.position.x += dir.x * this.speed * 0.6 * dt;
                        this.position.z += dir.z * this.speed * 0.6 * dt;
                        this.rotation = Math.atan2(dir.x, dir.z);
                    } else {
                        this.roamTarget = null;
                    }
                }
                break;

            case ZOMBIE_STATES.ATTACKING:
                if (this.target) {
                    const dir = this.target.position.clone().sub(this.position);
                    dir.y = 0;
                    this.rotation = Math.atan2(dir.x, dir.z);
                }
                break;
        }

        this.position.y = this.baseY;
    }

    get baseY() { return 0; }

    _updateCombat(dt) {
        if (this.state === ZOMBIE_STATES.STAGGERED) {
            this.staggerTimer -= dt;
            if (this.staggerTimer <= 0) {
                this._changeState(ZOMBIE_STATES.CHASING);
            }
            return;
        }

        if (this.state === ZOMBIE_STATES.ATTACKING) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.attackTimer = this.attackCooldown;
                this._performAttack();
            }
        }
    }

    _performAttack() {
        if (!this.target || !this.target.alive) return;

        const dist = this.position.distanceTo(this.target.position);
        if (dist <= this.attackRange * 1.2) {
            this.target.takeDamage(this.damage, this.position);
        }
    }

    takeDamage(amount, sourcePos, isHeadshot = false) {
        if (!this.alive) return;

        let finalDamage = amount;
        if (isHeadshot) {
            finalDamage *= this.headshotMultiplier;
        }
        finalDamage *= (1 - this.armor);

        this.health -= finalDamage;
        this.hitFlashTimer = this.hitFlashDuration;

        if (this.health <= 0) {
            this.health = 0;
            this._die();
            return;
        }

        if (finalDamage >= this.staggerThreshold && this.state !== ZOMBIE_STATES.STAGGERED) {
            this._changeState(ZOMBIE_STATES.STAGGERED);
            this.staggerTimer = 0.4 + Math.random() * 0.2;
        }
    }

    _die() {
        this.alive = false;
        this.deathTimer = 1.2;
        this._deathAnim = 0;
        this._deathFallForward = Math.random() > 0.5;
        this._deathFallDir = this.rotation;
        this._changeState(ZOMBIE_STATES.DYING);

        setTimeout(() => {
            if (this.mesh.parent) this.scene.remove(this.mesh);
            if (this.healthBar.parent) this.scene.remove(this.healthBar);
        }, 1200);
    }

    _changeState(newState) {
        if (this.state === newState) return;
        this.prevState = this.state;
        this.state = newState;
        this.stateTimer = 0;
    }

    _updateHealthBarTexture() {
        const canvas = this.healthBar.material.map.image;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 64, 8);
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, 64, 8);
        const pct = this.health / this.maxHealth;
        ctx.fillStyle = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#ff9800' : '#c62828';
        ctx.fillRect(1, 1, 62 * pct, 6);
        this.healthBar.material.map.needsUpdate = true;
    }

    reset(x, z) {
        this.health = this.maxHealth;
        this.alive = true;
        this.position.set(x, this.baseY, z);
        this.target = null;
        this._changeState(ZOMBIE_STATES.IDLE);
        this.mesh.visible = true;
        this.mesh.rotation.set(0, 0, 0);
        this.mesh.position.set(x, 0, z);
        this.healthBar.material.opacity = 0;

        // Reset animations
        this._walkCycle = 0;
        this._attackAnim = 0;
        this._staggerAnim = 0;
        this._deathAnim = 0;
        this._idleSway = Math.random() * 10;

        // Reset hit flash
        this._clearHitFlash();
    }
}

// --- enemies/RunnerZombie.js ---

class RunnerZombie extends Zombie {
    constructor(x, z, scene) {
        super({
            type: 'runner',
            health: 180,
            speed: 3.2,
            damage: 15,
            attackRange: 1.8,
            attackCooldown: 0.8,
            detectionRange: 35,
            staggerThreshold: 60,
            headshotMultiplier: 2.5,
            scoreValue: 100,
            armor: 0.05,
            bodyColor: 0x5a6e28,
            skinColor: 0x7a9a6a,
            eyeColor: 0xcc3300,
            scale: 0.95,
            x, z
        }, scene);
    }

    _createMesh() {
        const group = super._createMesh();
        const s = this.scale;

        // Runner unique: torn athletic wear - add hoodie strings
        const stringGeo = new THREE.CylinderGeometry(0.008 * s, 0.008 * s, 0.2 * s, 4);
        const stringMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9 });
        const leftString = new THREE.Mesh(stringGeo, stringMat);
        leftString.position.set(-0.06 * s, 1.2 * s, 0.16 * s);
        group.add(leftString);

        const rightString = new THREE.Mesh(stringGeo, stringMat.clone());
        rightString.position.set(0.06 * s, 1.2 * s, 0.16 * s);
        group.add(rightString);

        // Scratches / wound marks on torso
        const scratchGeo = new THREE.BoxGeometry(0.02 * s, 0.12 * s, 0.01 * s);
        const scratchMat = new THREE.MeshStandardMaterial({ color: 0x882200, roughness: 0.7 });
        for (let i = 0; i < 3; i++) {
            const scratch = new THREE.Mesh(scratchGeo, scratchMat);
            scratch.position.set(
                (Math.random() - 0.5) * 0.3 * s,
                1.2 * s + i * 0.08 * s,
                0.15 * s
            );
            scratch.rotation.z = (Math.random() - 0.5) * 0.4;
            group.add(scratch);
        }

        return group;
    }
}

// --- enemies/TankZombie.js ---

class TankZombie extends Zombie {
    constructor(x, z, scene) {
        super({
            type: 'tank',
            health: 900,
            speed: 1.4,
            damage: 45,
            attackRange: 2.2,
            attackCooldown: 1.8,
            detectionRange: 30,
            staggerThreshold: 150,
            headshotMultiplier: 1.8,
            scoreValue: 300,
            armor: 0.25,
            bodyColor: 0x3d2b1f,
            skinColor: 0x5a7a5a,
            eyeColor: 0xff4400,
            scale: 1.5,
            x, z
        }, scene);
    }

    _createMesh() {
        const group = super._createMesh();
        const s = this.scale;

        const armorMat = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.5,
            metalness: 0.4,
        });

        // Shoulder armor plates
        const shoulderPlateGeo = new THREE.BoxGeometry(0.25 * s, 0.15 * s, 0.3 * s);
        const leftShoulderPlate = new THREE.Mesh(shoulderPlateGeo, armorMat);
        leftShoulderPlate.position.set(-0.42 * s, 1.5 * s, 0);
        leftShoulderPlate.castShadow = true;
        group.add(leftShoulderPlate);

        const rightShoulderPlate = new THREE.Mesh(shoulderPlateGeo, armorMat.clone());
        rightShoulderPlate.position.set(0.42 * s, 1.5 * s, 0);
        rightShoulderPlate.castShadow = true;
        group.add(rightShoulderPlate);

        // Chest armor plate
        const chestPlateGeo = new THREE.BoxGeometry(0.5 * s, 0.35 * s, 0.06 * s);
        const chestPlate = new THREE.Mesh(chestPlateGeo, armorMat.clone());
        chestPlate.position.set(0, 1.3 * s, 0.17 * s);
        chestPlate.castShadow = true;
        group.add(chestPlate);

        // Back hump / mutation
        const humpGeo = new THREE.SphereGeometry(0.25 * s, 8, 6);
        const humpMat = new THREE.MeshStandardMaterial({
            color: 0x6a5a4a,
            roughness: 0.7,
        });
        const hump = new THREE.Mesh(humpGeo, humpMat);
        hump.position.set(0, 1.55 * s, -0.2 * s);
        hump.scale.set(1, 0.8, 1);
        group.add(hump);

        // Thick metal chain around neck
        const chainGeo = new THREE.TorusGeometry(0.18 * s, 0.02 * s, 6, 12);
        const chainMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.3,
            metalness: 0.7,
        });
        const chain = new THREE.Mesh(chainGeo, chainMat);
        chain.position.set(0, 1.6 * s, 0);
        chain.rotation.x = Math.PI / 2;
        group.add(chain);

        // Bolts / studs on armor
        const boltGeo = new THREE.SphereGeometry(0.025 * s, 6, 4);
        const boltMat = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            metalness: 0.6,
            roughness: 0.3,
        });
        const boltPositions = [
            [-0.2 * s, 1.42 * s, 0.2 * s],
            [0.2 * s, 1.42 * s, 0.2 * s],
            [0, 1.2 * s, 0.2 * s],
            [-0.42 * s, 1.55 * s, 0.12 * s],
            [0.42 * s, 1.55 * s, 0.12 * s],
        ];
        for (const pos of boltPositions) {
            const bolt = new THREE.Mesh(boltGeo, boltMat);
            bolt.position.set(...pos);
            group.add(bolt);
        }

        // Mutated extra fingers / growths on hands
        const growthGeo = new THREE.ConeGeometry(0.04 * s, 0.12 * s, 5);
        const growthMat = new THREE.MeshStandardMaterial({
            color: 0x7a6a5a,
            roughness: 0.8,
        });
        const leftGrowth = new THREE.Mesh(growthGeo, growthMat);
        leftGrowth.position.set(-0.42 * s, 0.8 * s, -0.18 * s);
        leftGrowth.rotation.x = 0.5;
        group.add(leftGrowth);

        const rightGrowth = new THREE.Mesh(growthGeo, growthMat.clone());
        rightGrowth.position.set(0.42 * s, 0.8 * s, -0.18 * s);
        rightGrowth.rotation.x = 0.5;
        group.add(rightGrowth);

        // Head cage / helmet fragment
        const helmetGeo = new THREE.SphereGeometry(0.22 * s, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const helmetMat = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.4,
            metalness: 0.5,
        });
        const helmet = new THREE.Mesh(helmetGeo, helmetMat);
        helmet.position.set(0, 1.82 * s, 0);
        group.add(helmet);

        // Faint orange glow so the massive tank is visible in the dark
        const tankGlow = new THREE.PointLight(0xff4400, 0.35, 10, 2);
        tankGlow.position.set(0, 1.6 * s, 0);
        group.add(tankGlow);

        return group;
    }
}

// --- enemies/SpitterZombie.js ---

class SpitterZombie extends Zombie {
    constructor(x, z, scene) {
        super({
            type: 'spitter',
            health: 220,
            speed: 2.0,
            damage: 25,
            attackRange: 12,
            attackCooldown: 2.5,
            detectionRange: 35,
            staggerThreshold: 55,
            headshotMultiplier: 2.5,
            scoreValue: 150,
            armor: 0.05,
            bodyColor: 0x4a6e23,
            skinColor: 0x5a8a4a,
            eyeColor: 0x44ff44,
            scale: 1.0,
            x, z
        }, scene);

        this.preferredDistance = 8;
        this.spitProjectile = null;
        this.spitSpeed = 15;
    }

    _createMesh() {
        const group = super._createMesh();
        const s = this.scale;

        // Spitter unique: toxic glow sac on neck — very bright green beacon
        const sacGeo = new THREE.SphereGeometry(0.14 * s, 8, 6);
        const sacMat = new THREE.MeshStandardMaterial({
            color: 0x22cc22,
            emissive: 0x22ff22,
            emissiveIntensity: 1.2,
            roughness: 0.3,
            transparent: true,
            opacity: 0.85,
        });
        const sac = new THREE.Mesh(sacGeo, sacMat);
        sac.position.set(0, 1.58 * s, 0.08 * s);
        group.add(sac);

        // Green glow light on the sac
        const sacGlow = new THREE.PointLight(0x22ff22, 0.4, 10, 2);
        sacGlow.position.set(0, 1.58 * s, 0.15 * s);
        group.add(sacGlow);

        // Distended jaw - larger mouth area
        const distendedGeo = new THREE.SphereGeometry(0.15 * s, 8, 6);
        const distendedMat = new THREE.MeshStandardMaterial({
            color: 0x6a5a4a,
            roughness: 0.7,
        });
        const distended = new THREE.Mesh(distendedGeo, distendedMat);
        distended.position.set(0, 1.68 * s, 0.16 * s);
        distended.scale.set(1.2, 0.7, 1);
        group.add(distended);

        // Dripping toxic ooze
        const dripGeo = new THREE.CylinderGeometry(0.015 * s, 0.005 * s, 0.15 * s, 4);
        const dripMat = new THREE.MeshStandardMaterial({
            color: 0x33cc33,
            emissive: 0x116611,
            emissiveIntensity: 0.4,
            roughness: 0.2,
        });
        for (let i = 0; i < 4; i++) {
            const drip = new THREE.Mesh(dripGeo, dripMat);
            drip.position.set(
                (Math.random() - 0.5) * 0.15 * s,
                1.6 * s - Math.random() * 0.1 * s,
                0.12 * s + Math.random() * 0.05 * s
            );
            group.add(drip);
        }

        // Toxic veins / marks on skin
        const veinGeo = new THREE.CylinderGeometry(0.01 * s, 0.01 * s, 0.3 * s, 4);
        const veinMat = new THREE.MeshStandardMaterial({
            color: 0x22aa22,
            emissive: 0x115511,
            emissiveIntensity: 0.3,
            roughness: 0.5,
        });
        for (let i = 0; i < 3; i++) {
            const vein = new THREE.Mesh(veinGeo, veinMat);
            vein.position.set(
                -0.2 * s + i * 0.18 * s,
                1.2 * s,
                0.16 * s
            );
            vein.rotation.z = (Math.random() - 0.5) * 0.5;
            group.add(vein);
        }

        // Spitter has elongated fingers
        const fingerGeo = new THREE.CylinderGeometry(0.012 * s, 0.008 * s, 0.1 * s, 4);
        const fingerMat = new THREE.MeshStandardMaterial({ color: 0x5a8a4a, roughness: 0.8 });
        for (let side = -1; side <= 1; side += 2) {
            for (let i = -1; i <= 1; i++) {
                const finger = new THREE.Mesh(fingerGeo, fingerMat);
                finger.position.set(
                    (0.38 + i * 0.03) * s * side,
                    0.7 * s,
                    -0.18 * s
                );
                finger.rotation.x = -0.6;
                group.add(finger);
            }
        }

        return group;
    }

    _think(targets) {
        super._think(targets);

        if (this.state === ZOMBIE_STATES.CHASING && this.target) {
            const dist = this.position.distanceTo(this.target.position);
            if (dist < this.preferredDistance) {
                const away = this.position.clone().sub(this.target.position).normalize();
                this.roamTarget = this.position.clone().add(away.multiplyScalar(5));
            }
        }
    }

    _performAttack() {
        if (!this.target || !this.target.alive) return;

        const dist = this.position.distanceTo(this.target.position);
        if (dist <= this.attackRange) {
            const accuracy = 0.6 + Math.random() * 0.3;
            if (Math.random() < accuracy) {
                this.target.takeDamage(this.damage, this.position);
            }
        }
    }
}

// --- enemies/CrawlerZombie.js ---

class CrawlerZombie extends Zombie {
    constructor(x, z, scene) {
        super({
            type: 'crawler',
            health: 120,
            speed: 3.5,
            damage: 12,
            attackRange: 1.5,
            attackCooldown: 0.5,
            detectionRange: 30,
            staggerThreshold: 40,
            headshotMultiplier: 2.0,
            scoreValue: 80,
            armor: 0,
            bodyColor: 0x5a4a38,
            skinColor: 0x6a5a4a,
            eyeColor: 0xeecc00,
            scale: 0.6,
            x, z
        }, scene);

        this.dodgeTimer = 0;
        this.dodgeDir = 1;
        this.position.y = 0.3;
    }

    get baseY() { return 0.3; }

    _createMesh() {
        const group = new THREE.Group();
        const s = this.scale;
        const skinCol = this.skinColor;
        const bodyCol = this.bodyColor;

        const skinMat = new THREE.MeshStandardMaterial({ color: skinCol, roughness: 0.8 });
        const bodyMat = new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.85 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });

        // Low, horizontal torso
        const torsoGeo = new THREE.CapsuleGeometry(0.18 * s, 0.5 * s, 4, 8);
        const torso = new THREE.Mesh(torsoGeo, bodyMat);
        torso.position.set(0, 0.35 * s, 0);
        torso.rotation.x = Math.PI / 2 * 0.8;
        torso.castShadow = true;
        group.add(torso);

        // Head - forward and low
        const headGeo = new THREE.SphereGeometry(0.16 * s, 8, 6);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.set(0, 0.38 * s, 0.35 * s);
        head.scale.set(1, 0.85, 1.1);
        head.castShadow = true;
        group.add(head);

        // Glowing eyes — very bright for visibility
        const eyeGeo = new THREE.SphereGeometry(0.04 * s, 6, 4);
        const eyeMat = new THREE.MeshStandardMaterial({
            color: this.eyeColor,
            emissive: this.eyeColor,
            emissiveIntensity: 3.5,
            roughness: 0.2,
        });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.07 * s, 0.42 * s, 0.48 * s);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
        rightEye.position.set(0.07 * s, 0.42 * s, 0.48 * s);
        group.add(rightEye);

        // Glow light so crawlers are visible from a distance
        const eyeGlow = new THREE.PointLight(this.eyeColor, 0.3, 8, 2);
        eyeGlow.position.set(0, 0.42 * s, 0.5 * s);
        group.add(eyeGlow);

        // Mouth with fangs
        const mouthGeo = new THREE.BoxGeometry(0.1 * s, 0.04 * s, 0.06 * s);
        const mouthMat = new THREE.MeshStandardMaterial({ color: 0x220000, roughness: 0.7 });
        const mouth = new THREE.Mesh(mouthGeo, mouthMat);
        mouth.position.set(0, 0.32 * s, 0.45 * s);
        group.add(mouth);

        // Fangs
        const fangGeo = new THREE.ConeGeometry(0.015 * s, 0.05 * s, 4);
        const fangMat = new THREE.MeshStandardMaterial({ color: 0xccccaa, roughness: 0.3 });
        const leftFang = new THREE.Mesh(fangGeo, fangMat);
        leftFang.position.set(-0.03 * s, 0.33 * s, 0.48 * s);
        leftFang.rotation.x = 0.3;
        group.add(leftFang);

        const rightFang = new THREE.Mesh(fangGeo, fangMat.clone());
        rightFang.position.set(0.03 * s, 0.33 * s, 0.48 * s);
        rightFang.rotation.x = 0.3;
        group.add(rightFang);

        // Spider-like legs (4 pairs from the body)
        const legGeo = new THREE.CapsuleGeometry(0.03 * s, 0.35 * s, 3, 4);
        const legMat = skinMat.clone();

        const legPositions = [
            { x: -0.2, z: 0.15, angle: -0.5 },
            { x: 0.2, z: 0.15, angle: 0.5 },
            { x: -0.2, z: -0.1, angle: -0.7 },
            { x: 0.2, z: -0.1, angle: 0.7 },
            { x: -0.18, z: -0.3, angle: -0.9 },
            { x: 0.18, z: -0.3, angle: 0.9 },
        ];

        for (let i = 0; i < legPositions.length; i++) {
            const lp = legPositions[i];
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(lp.x * s, 0.3 * s, lp.z * s);
            leg.rotation.z = lp.angle;
            leg.rotation.x = -0.5;
            leg.castShadow = true;
            group.add(leg);
        }

        // Claws on legs
        const clawGeo = new THREE.ConeGeometry(0.02 * s, 0.06 * s, 4);
        const clawMat = new THREE.MeshStandardMaterial({
            color: 0x443322,
            roughness: 0.3,
            metalness: 0.2,
        });
        for (let i = 0; i < legPositions.length; i++) {
            const lp = legPositions[i];
            const claw = new THREE.Mesh(clawGeo, clawMat);
            const legLen = 0.4;
            claw.position.set(
                lp.x * s + Math.sin(lp.angle) * legLen * s,
                0.05 * s,
                lp.z * s + Math.cos(lp.angle) * 0.05 * s
            );
            group.add(claw);
        }

        // Spiny ridges along the back
        const spineGeo = new THREE.ConeGeometry(0.03 * s, 0.08 * s, 4);
        const spineMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.7 });
        for (let i = 0; i < 4; i++) {
            const spine = new THREE.Mesh(spineGeo, spineMat);
            spine.position.set(0, 0.42 * s, -0.15 * s - i * 0.12 * s);
            group.add(spine);
        }

        // Store parts for animation
        group.userData = {
            headGroup: group.children[1], // head
            jaw: mouth,
        };

        group.position.copy(this.position);
        return group;
    }

    _think(targets) {
        super._think(targets);

        if (this.state === ZOMBIE_STATES.CHASING) {
            this.dodgeTimer -= 0.15;
            if (this.dodgeTimer <= 0) {
                this.dodgeTimer = 0.5 + Math.random() * 1.0;
                this.dodgeDir = Math.random() > 0.5 ? 1 : -1;
            }
        }
    }

    _move(dt) {
        if (this.state === ZOMBIE_STATES.CHASING && this.target) {
            const dir = this.target.position.clone().sub(this.position);
            dir.y = 0;
            dir.normalize();

            const perpX = -dir.z * this.dodgeDir * 0.4;
            const perpZ = dir.x * this.dodgeDir * 0.4;

            dir.x += perpX;
            dir.z += perpZ;
            dir.normalize();

            this.position.x += dir.x * this.speed * dt;
            this.position.z += dir.z * this.speed * dt;
            this.rotation = Math.atan2(dir.x, dir.z);
            this.position.y = this.baseY;
        } else {
            super._move(dt);
            this.position.y = this.baseY;
        }
    }

    _updateAnimation(dt) {
        const parts = this.mesh.userData;
        if (!parts) return;

        const s = this.scale;

        switch (this.state) {
            case ZOMBIE_STATES.CHASING:
            case ZOMBIE_STATES.ROAMING:
                this._animateCrawlerWalk(dt, parts, s);
                break;
            case ZOMBIE_STATES.ATTACKING:
                this._animateCrawlerAttack(dt, parts, s);
                break;
            case ZOMBIE_STATES.DYING:
                this._animateDeath(dt, parts, s);
                break;
            default:
                this._animateCrawlerIdle(dt, parts, s);
                break;
        }
    }

    _animateCrawlerWalk(dt, parts, s) {
        this._walkCycle += dt * this.speed * 3;

        // Scuttling motion - body bobs up and down rapidly
        this.position.y = this.baseY + Math.abs(Math.sin(this._walkCycle * 2)) * 0.06 * s;

        // Head sways side to side
        if (parts.headGroup) {
            parts.headGroup.rotation.y = Math.sin(this._walkCycle) * 0.15;
            parts.headGroup.rotation.x = -0.1 + Math.sin(this._walkCycle * 1.5) * 0.05;
        }

        // Jaw snapping
        if (parts.jaw) {
            parts.jaw.rotation.x = Math.abs(Math.sin(this._walkCycle * 3)) * 0.25;
        }

        // Tilt body on curves
        this.mesh.rotation.z = Math.sin(this._walkCycle * 0.5) * 0.05;
    }

    _animateCrawlerAttack(dt, parts, s) {
        this._attackAnim += dt * 10;
        if (parts.headGroup) {
            parts.headGroup.rotation.x = -0.3 + Math.sin(this._attackAnim) * 0.4;
        }
        if (parts.jaw) {
            parts.jaw.rotation.x = Math.abs(Math.sin(this._attackAnim * 2)) * 0.5;
        }
        this.position.y = this.baseY + Math.sin(this._attackAnim) * 0.04 * s;
    }

    _animateCrawlerIdle(dt, parts, s) {
        this._idleSway += dt * 1.2;
        this.position.y = this.baseY + Math.sin(this._idleSway * 2) * 0.02 * s;
        if (parts.headGroup) {
            parts.headGroup.rotation.y = Math.sin(this._idleSway) * 0.1;
        }
    }

    reset(x, z) {
        super.reset(x, z);
        this.position.y = this.baseY;
    }
}

// --- enemies/ExploderZombie.js ---

class ExploderZombie extends Zombie {
    constructor(x, z, scene) {
        super({
            type: 'exploder',
            health: 160,
            speed: 2.5,
            damage: 60,
            attackRange: 3.0,
            attackCooldown: 0.1,
            detectionRange: 30,
            staggerThreshold: 80,
            headshotMultiplier: 3.0,
            scoreValue: 200,
            armor: 0,
            bodyColor: 0x6b1020,
            skinColor: 0x8a3040,
            eyeColor: 0xff6600,
            scale: 1.1,
            x, z
        }, scene);

        this.exploded = false;
        this.explosionRadius = 4;
        this.exploding = false;
        this.explodeTimer = 0;
        this._pulseTime = 0;
    }

    _createMesh() {
        const group = super._createMesh();
        const s = this.scale;

        // Bloated belly
        const bellyGeo = new THREE.SphereGeometry(0.32 * s, 10, 8);
        const bellyMat = new THREE.MeshStandardMaterial({
            color: 0x7a2030,
            roughness: 0.6,
            emissive: 0x440000,
            emissiveIntensity: 0.3,
        });
        const belly = new THREE.Mesh(bellyGeo, bellyMat);
        belly.position.set(0, 0.9 * s, 0.08 * s);
        belly.scale.set(1, 0.85, 1);
        belly.castShadow = true;
        group.add(belly);

        // Red-orange glow light so exploders are visible from far away
        const bellyGlow = new THREE.PointLight(0xff3300, 0.5, 12, 2);
        bellyGlow.position.set(0, 0.9 * s, 0.15 * s);
        group.add(bellyGlow);

        // Toxic boils / pustules — bright warning glow
        const boilGeo = new THREE.SphereGeometry(0.06 * s, 6, 4);
        const boilMat = new THREE.MeshStandardMaterial({
            color: 0xff5500,
            emissive: 0xff4400,
            emissiveIntensity: 1.8,
            roughness: 0.3,
            transparent: true,
            opacity: 0.9,
        });
        const boilPositions = [
            [0.12 * s, 0.95 * s, 0.2 * s],
            [-0.1 * s, 0.85 * s, 0.22 * s],
            [0.05 * s, 1.05 * s, 0.18 * s],
            [-0.15 * s, 1.1 * s, 0.15 * s],
            [0.1 * s, 0.75 * s, 0.2 * s],
            [0.18 * s, 0.88 * s, 0.14 * s],
        ];
        for (const pos of boilPositions) {
            const boil = new THREE.Mesh(boilGeo, boilMat.clone());
            boil.position.set(...pos);
            group.add(boil);
        }

        // Glowing veins across the body
        const veinGeo = new THREE.CylinderGeometry(0.012 * s, 0.008 * s, 0.25 * s, 4);
        const veinMat = new THREE.MeshStandardMaterial({
            color: 0xff4400,
            emissive: 0xff2200,
            emissiveIntensity: 0.6,
            roughness: 0.4,
        });
        const veinPositions = [
            { pos: [0.15 * s, 1.0 * s, 0.14 * s], rot: 0.3 },
            { pos: [-0.15 * s, 1.0 * s, 0.14 * s], rot: -0.3 },
            { pos: [0.2 * s, 1.2 * s, 0.08 * s], rot: 0.5 },
            { pos: [-0.2 * s, 1.2 * s, 0.08 * s], rot: -0.5 },
            { pos: [0, 0.8 * s, 0.2 * s], rot: 0 },
        ];
        for (const v of veinPositions) {
            const vein = new THREE.Mesh(veinGeo, veinMat.clone());
            vein.position.set(...v.pos);
            vein.rotation.z = v.rot;
            group.add(vein);
        }

        // Exposed ribs on one side
        const ribGeo = new THREE.CylinderGeometry(0.015 * s, 0.015 * s, 0.12 * s, 4);
        const ribMat = new THREE.MeshStandardMaterial({
            color: 0xccccaa,
            roughness: 0.5,
        });
        for (let i = 0; i < 3; i++) {
            const rib = new THREE.Mesh(ribGeo, ribMat);
            rib.position.set(-0.22 * s, 1.15 * s - i * 0.06 * s, 0.1 * s);
            rib.rotation.z = 0.8;
            group.add(rib);
        }

        // Crack/rupture on belly
        const crackGeo = new THREE.BoxGeometry(0.04 * s, 0.1 * s, 0.02 * s);
        const crackMat = new THREE.MeshStandardMaterial({
            color: 0x110000,
            emissive: 0xff3300,
            emissiveIntensity: 0.5,
        });
        const crack = new THREE.Mesh(crackGeo, crackMat);
        crack.position.set(0.03 * s, 0.88 * s, 0.22 * s);
        group.add(crack);

        // Unstable head - slightly larger and cracked
        const headTumor = new THREE.Mesh(
            new THREE.SphereGeometry(0.08 * s, 6, 5),
            new THREE.MeshStandardMaterial({
                color: 0x9a3040,
                emissive: 0x440000,
                emissiveIntensity: 0.3,
                roughness: 0.6,
            })
        );
        headTumor.position.set(0.1 * s, 1.92 * s, -0.02 * s);
        group.add(headTumor);

        // Dripping substance from body
        const dripGeo = new THREE.CylinderGeometry(0.01 * s, 0.003 * s, 0.12 * s, 4);
        const dripMat = new THREE.MeshStandardMaterial({
            color: 0xff4400,
            emissive: 0xff2200,
            emissiveIntensity: 0.5,
            roughness: 0.2,
        });
        for (let i = 0; i < 3; i++) {
            const drip = new THREE.Mesh(dripGeo, dripMat);
            drip.position.set(
                (Math.random() - 0.5) * 0.2 * s,
                0.72 * s - Math.random() * 0.1 * s,
                0.12 * s
            );
            group.add(drip);
        }

        return group;
    }

    _updateAnimation(dt) {
        if (this.exploding) {
            // Pulsing explosion buildup
            this._pulseTime += dt * 20;
            const pulse = 1 + Math.sin(this._pulseTime) * 0.15;
            this.mesh.scale.setScalar(this.scale * (1 + (0.6 - this.explodeTimer) * 2) * pulse);

            // Rapid emissive glow
            this.mesh.traverse((child) => {
                if (child.isMesh && child.material && child.material.emissive) {
                    child.material.emissiveIntensity = 1.0 + Math.sin(this._pulseTime * 3) * 0.5;
                }
            });
            return;
        }

        super._updateAnimation(dt);

        // Subtle pulsing glow when alive
        this._pulseTime += dt * 2;
        this.mesh.traverse((child) => {
            if (child.isMesh && child.material && child.material.emissive &&
                child.material.emissive.r > 0.1 && child.material.emissiveIntensity < 1) {
                child.material.emissiveIntensity = 0.3 + Math.sin(this._pulseTime) * 0.15;
            }
        });
    }

    _think(targets) {
        if (this.exploded || this.exploding) return;
        super._think(targets);

        if (this.state === ZOMBIE_STATES.CHASING && this.target) {
            const dist = this.position.distanceTo(this.target.position);
            if (dist < this.explosionRadius) {
                this._startExplode();
            }
        }
    }

    _startExplode() {
        this.exploding = true;
        this.explodeTimer = 0.6;
    }

    _updateCombat(dt) {
        if (this.exploding) {
            this.explodeTimer -= dt;
            if (this.explodeTimer <= 0) {
                this._explode();
            }
            return;
        }
        super._updateCombat(dt);
    }

    _explode() {
        if (this.exploded) return;
        this.exploded = true;
        this.alive = false;

        const targets = [];
        if (this.scene.__gameRef) {
            const game = this.scene.__gameRef;
            if (game.player && game.player.alive) targets.push(game.player);
            if (game.allySquad) {
                for (const ally of game.allySquad.allies) {
                    if (ally.alive) targets.push(ally);
                }
            }
            if (game.zombieManager) {
                for (const zombie of game.zombieManager.zombies) {
                    if (zombie !== this && zombie.alive) {
                        const dist = this.position.distanceTo(zombie.position);
                        if (dist < this.explosionRadius) {
                            zombie.takeDamage(this.damage * 0.5, this.position, false);
                        }
                    }
                }
            }
        }

        for (const target of targets) {
            const dist = this.position.distanceTo(target.position);
            if (dist < this.explosionRadius) {
                const falloff = 1 - (dist / this.explosionRadius);
                target.takeDamage(this.damage * falloff, this.position);
            }
        }

        if (this.mesh.parent) this.scene.remove(this.mesh);
        if (this.healthBar.parent) this.scene.remove(this.healthBar);
    }

    takeDamage(amount, sourcePos, isHeadshot = false) {
        if (this.exploded) return;
        super.takeDamage(amount, sourcePos, isHeadshot);

        if (!isHeadshot && this.alive && !this.exploding && Math.random() < 0.1) {
            this._startExplode();
        }
    }
}

// --- enemies/ZombieManager.js ---

class ZombieManager {
    constructor(scene) {
        this.scene = scene;
        this.zombies = [];
        this.maxZombies = 80;
    }

    spawn(type, x, z) {
        if (this.zombies.filter(z => z.alive).length >= this.maxZombies) return null;

        let zombie;
        switch (type) {
            case 'runner':
                zombie = new RunnerZombie(x, z, this.scene);
                break;
            case 'tank':
                zombie = new TankZombie(x, z, this.scene);
                break;
            case 'spitter':
                zombie = new SpitterZombie(x, z, this.scene);
                break;
            case 'crawler':
                zombie = new CrawlerZombie(x, z, this.scene);
                break;
            case 'exploder':
                zombie = new ExploderZombie(x, z, this.scene);
                break;
            default:
                zombie = new RunnerZombie(x, z, this.scene);
        }

        this.zombies.push(zombie);
        return zombie;
    }

    spawnWave(config, spawnPoints) {
        const spawned = [];
        const types = config.types || [{ type: 'runner', count: 5 }];

        for (const entry of types) {
            for (let i = 0; i < entry.count; i++) {
                const point = spawnPoints[MathUtils.randomInt(0, spawnPoints.length - 1)];
                const offset = MathUtils.randomPointInCircle(5);
                const zombie = this.spawn(
                    entry.type,
                    point.x + offset.x,
                    point.z + offset.z
                );
                if (zombie) spawned.push(zombie);
            }
        }

        return spawned;
    }

    update(dt, targets) {
        for (const zombie of this.zombies) {
            if (zombie.alive) {
                zombie.update(dt, targets);
            } else if (zombie.deathTimer > 0) {
                zombie.deathTimer -= dt;
            }
        }

        this.zombies = this.zombies.filter(z => z.alive || z.deathTimer > 0);
    }

    getAliveCount() {
        return this.zombies.filter(z => z.alive).length;
    }

    getAliveZombies() {
        return this.zombies.filter(z => z.alive);
    }

    clear() {
        for (const zombie of this.zombies) {
            if (zombie.mesh.parent) this.scene.remove(zombie.mesh);
            if (zombie.healthBar.parent) this.scene.remove(zombie.healthBar);
        }
        this.zombies = [];
    }

    reset() {
        this.clear();
    }
}

// --- ai/Ally.js ---

const ALLY_STATES = {
    FOLLOWING: 'following',
    HOLDING: 'holding',
    ENGAGING: 'engaging',
    REVIVING: 'reviving',
    DOWNED: 'downed',
    REGROUPING: 'regrouping',
    MOVING_TO: 'moving_to'
};

class Ally {
    constructor(config, scene) {
        this.scene = scene;
        this.name = config.name || 'Ally';
        this.role = config.role || 'assault';
        this.color = config.color || 0x4488ff;

        this.position = new THREE.Vector3(config.x || 0, 0, config.z || 0);
        this.rotation = 0;
        this.velocity = new THREE.Vector3();

        this.health = 100;
        this.maxHealth = 100;
        this.alive = true;
        this.downed = false;
        this.downTimer = 0;
        this.downDuration = 20;

        this.state = ALLY_STATES.FOLLOWING;
        this.prevState = null;

        this.speed = 5.0;
        this.followDistance = 4 + Math.random() * 2;
        this.formationAngle = config.formationAngle || 0;
        this.formationOffset = new THREE.Vector3();

        this.target = null;
        this.targetPosition = null;
        this.holdPosition = null;
        this.reviveTarget = null;

        this.fireRate = 0.22 + Math.random() * 0.13;
        this.fireTimer = 0;
        this.accuracy = 0.50 + Math.random() * 0.15;
        this.damage = 12;
        this.range = 28;
        this.detectionRange = 32;

        this.stateTimer = 0;
        this.thinkTimer = 0;
        this.thinkInterval = 0.2 + Math.random() * 0.1;

        this.mesh = this._createMesh();
        this.scene.add(this.mesh);

        this.indicator = this._createIndicator();
        this.scene.add(this.indicator);

        this._lastStateChange = 0;
    }

    _createMesh() {
        const group = new THREE.Group();

        const bodyGeo = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8);
        const bodyMat = new THREE.MeshLambertMaterial({ color: this.color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.0;
        body.castShadow = true;
        group.add(body);

        const headGeo = new THREE.SphereGeometry(0.2, 8, 6);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xddaa88 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.8;
        head.castShadow = true;
        group.add(head);

        // Role-specific 3D weapon
        const gun = this._buildRoleGun();
        gun.position.set(0.3, 1.2, -0.15);
        group.add(gun);

        // Colored glow light so teammates are always visible in the dark
        const glow = new THREE.PointLight(this.color, 0.8, 14, 2);
        glow.position.set(0, 1.5, 0);
        group.add(glow);

        // Vertical beacon line — a tall thin glowing column above the ally
        const beaconGeo = new THREE.CylinderGeometry(0.03, 0.03, 6, 4);
        const beaconMat = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.25
        });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.y = 5;
        group.add(beacon);

        // Glowing ring at the base
        const ringGeo = new THREE.TorusGeometry(0.6, 0.04, 6, 16);
        const ringMat = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.35
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.05;
        group.add(ring);

        group.position.copy(this.position);
        return group;
    }

    _buildRoleGun() {
        switch (this.role) {
            case 'assault': return this._buildAllyM4();
            case 'medic': return this._buildAllyM1911();
            case 'support': return this._buildAlly870();
            default: return this._buildAllyM4();
        }
    }

    _buildAllyM4() {
        const group = new THREE.Group();
        const rMat = new THREE.MeshLambertMaterial({ color: 0x2d2d2d });
        const bMat = new THREE.MeshLambertMaterial({ color: 0x1f1f1f });
        const gMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        const mMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const aMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });

        // Upper receiver
        const upper = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.2), rMat);
        upper.position.set(0, 0, -0.05);
        upper.castShadow = true;
        group.add(upper);

        // Lower receiver
        const lower = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.035, 0.14), rMat);
        lower.position.set(0, -0.02, -0.02);
        group.add(lower);

        // Barrel
        const bGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8);
        bGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(bGeo, bMat);
        barrel.position.set(0, 0.015, -0.32);
        barrel.castShadow = true;
        group.add(barrel);

        // Flash hider
        const fhGeo = new THREE.CylinderGeometry(0.016, 0.013, 0.035, 8);
        fhGeo.rotateX(Math.PI / 2);
        const fh = new THREE.Mesh(fhGeo, bMat);
        fh.position.set(0, 0.015, -0.5);
        group.add(fh);

        // Handguard
        const hgGeo = new THREE.BoxGeometry(0.038, 0.038, 0.18);
        const hg = new THREE.Mesh(hgGeo, rMat);
        hg.position.set(0, 0.015, -0.22);
        hg.castShadow = true;
        group.add(hg);

        // Top rail
        const trGeo = new THREE.BoxGeometry(0.03, 0.006, 0.18);
        const tr = new THREE.Mesh(trGeo, bMat);
        tr.position.set(0, 0.04, -0.22);
        group.add(tr);

        // Side rails
        const srGeo = new THREE.BoxGeometry(0.006, 0.03, 0.18);
        for (let s = -1; s <= 1; s += 2) {
            const sr = new THREE.Mesh(srGeo, bMat);
            sr.position.set(s * 0.02, 0.015, -0.22);
            group.add(sr);
        }

        // Front sight
        const fsGeo = new THREE.BoxGeometry(0.005, 0.03, 0.005);
        const fs = new THREE.Mesh(fsGeo, bMat);
        fs.position.set(0, 0.045, -0.47);
        group.add(fs);

        // Front sight base
        const fsbGeo = new THREE.BoxGeometry(0.02, 0.012, 0.015);
        const fsb = new THREE.Mesh(fsbGeo, bMat);
        fsb.position.set(0, 0.035, -0.47);
        group.add(fsb);

        // Gas block
        const gbGeo = new THREE.BoxGeometry(0.025, 0.025, 0.025);
        const gb = new THREE.Mesh(gbGeo, rMat);
        gb.position.set(0, 0.03, -0.35);
        group.add(gb);

        // Carry handle / rear sight
        const chGeo = new THREE.BoxGeometry(0.038, 0.022, 0.07);
        const ch = new THREE.Mesh(chGeo, rMat);
        ch.position.set(0, 0.045, 0.0);
        group.add(ch);

        // Magazine
        const magGeo = new THREE.BoxGeometry(0.03, 0.12, 0.045);
        const mag = new THREE.Mesh(magGeo, mMat);
        mag.position.set(0, -0.08, -0.03);
        mag.rotation.x = 0.12;
        mag.castShadow = true;
        group.add(mag);

        // Magazine base
        const mbGeo = new THREE.BoxGeometry(0.032, 0.007, 0.035);
        const mb = new THREE.Mesh(mbGeo, aMat);
        mb.position.set(0, -0.14, -0.05);
        mb.rotation.x = 0.12;
        group.add(mb);

        // Trigger guard
        const tgGeo = new THREE.BoxGeometry(0.032, 0.004, 0.06);
        const tg = new THREE.Mesh(tgGeo, rMat);
        tg.position.set(0, -0.04, 0.01);
        group.add(tg);

        // Trigger
        const tGeo = new THREE.BoxGeometry(0.005, 0.015, 0.003);
        const trigger = new THREE.Mesh(tGeo, bMat);
        trigger.position.set(0, -0.03, 0.005);
        group.add(trigger);

        // Pistol grip
        const pgGeo = new THREE.BoxGeometry(0.033, 0.09, 0.035);
        const pg = new THREE.Mesh(pgGeo, gMat);
        pg.position.set(0, -0.065, 0.06);
        pg.rotation.x = -0.25;
        pg.castShadow = true;
        group.add(pg);

        // Grip ridges
        for (let i = 0; i < 3; i++) {
            const grGeo = new THREE.BoxGeometry(0.035, 0.003, 0.037);
            const gr = new THREE.Mesh(grGeo, gMat);
            gr.position.set(0, -0.04 + i * -0.02, 0.06);
            gr.rotation.x = -0.25;
            group.add(gr);
        }

        // Buffer tube
        const btGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.11, 8);
        btGeo.rotateX(Math.PI / 2);
        const bt = new THREE.Mesh(btGeo, rMat);
        bt.position.set(0, 0.01, 0.08);
        group.add(bt);

        // Stock
        const stGeo = new THREE.BoxGeometry(0.042, 0.045, 0.07);
        const st = new THREE.Mesh(stGeo, rMat);
        st.position.set(0, 0.005, 0.15);
        st.castShadow = true;
        group.add(st);

        // Stock butt
        const sbGeo = new THREE.BoxGeometry(0.045, 0.05, 0.01);
        const sb = new THREE.Mesh(sbGeo, gMat);
        sb.position.set(0, 0.005, 0.19);
        group.add(sb);

        // Ejection port
        const epGeo = new THREE.BoxGeometry(0.025, 0.012, 0.035);
        const ep = new THREE.Mesh(epGeo, new THREE.MeshLambertMaterial({ color: 0x080808 }));
        ep.position.set(0.024, 0.015, -0.03);
        group.add(ep);

        return group;
    }

    _buildAlly870() {
        const group = new THREE.Group();
        const rMat = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
        const bMat = new THREE.MeshLambertMaterial({ color: 0x181818 });
        const wMat = new THREE.MeshLambertMaterial({ color: 0x5c3a1e });
        const wdMat = new THREE.MeshLambertMaterial({ color: 0x4a2e15 });
        const fMat = new THREE.MeshLambertMaterial({ color: 0x5a3619 });

        // Receiver
        const recGeo = new THREE.BoxGeometry(0.05, 0.055, 0.18);
        const rec = new THREE.Mesh(recGeo, rMat);
        rec.position.set(0, 0.005, -0.03);
        rec.castShadow = true;
        group.add(rec);

        // Barrel
        const bGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.38, 8);
        bGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(bGeo, bMat);
        barrel.position.set(0, 0.02, -0.3);
        barrel.castShadow = true;
        group.add(barrel);

        // Tube magazine
        const tmGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.3, 8);
        tmGeo.rotateX(Math.PI / 2);
        const tm = new THREE.Mesh(tmGeo, rMat);
        tm.position.set(0, -0.01, -0.26);
        group.add(tm);

        // Tube cap
        const tcGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.01, 8);
        tcGeo.rotateX(Math.PI / 2);
        const tc = new THREE.Mesh(tcGeo, bMat);
        tc.position.set(0, -0.01, -0.41);
        group.add(tc);

        // Barrel bracket ring
        const brGeo = new THREE.TorusGeometry(0.02, 0.004, 4, 8);
        brGeo.rotateX(Math.PI / 2);
        const br = new THREE.Mesh(brGeo, rMat);
        br.position.set(0, 0.005, -0.3);
        group.add(br);

        // Front sight bead (red)
        const fbGeo = new THREE.SphereGeometry(0.005, 6, 4);
        const fb = new THREE.Mesh(fbGeo, new THREE.MeshLambertMaterial({ color: 0xcc0000 }));
        fb.position.set(0, 0.035, -0.49);
        group.add(fb);

        // Muzzle
        const muGeo = new THREE.CylinderGeometry(0.017, 0.015, 0.02, 8);
        muGeo.rotateX(Math.PI / 2);
        const mu = new THREE.Mesh(muGeo, bMat);
        mu.position.set(0, 0.02, -0.5);
        group.add(mu);

        // Pump forend
        const feGeo = new THREE.BoxGeometry(0.044, 0.044, 0.14);
        const fe = new THREE.Mesh(feGeo, fMat);
        fe.position.set(0, -0.005, -0.19);
        fe.castShadow = true;
        group.add(fe);

        // Forend grooves
        for (let i = 0; i < 4; i++) {
            const fgGeo = new THREE.BoxGeometry(0.046, 0.003, 0.14);
            const fg = new THREE.Mesh(fgGeo, wdMat);
            fg.position.set(0, -0.02 + i * 0.01, -0.19);
            group.add(fg);
        }

        // Action bars
        const abGeo = new THREE.BoxGeometry(0.005, 0.005, 0.1);
        for (let s = -1; s <= 1; s += 2) {
            const ab = new THREE.Mesh(abGeo, rMat);
            ab.position.set(s * 0.016, -0.025, -0.17);
            group.add(ab);
        }

        // Rear sight
        const rsGeo = new THREE.BoxGeometry(0.03, 0.01, 0.006);
        const rs = new THREE.Mesh(rsGeo, rMat);
        rs.position.set(0, 0.038, 0.05);
        group.add(rs);

        // Ejection port
        const epGeo = new THREE.BoxGeometry(0.025, 0.015, 0.05);
        const ep = new THREE.Mesh(epGeo, new THREE.MeshLambertMaterial({ color: 0x080808 }));
        ep.position.set(0.026, 0.01, -0.02);
        group.add(ep);

        // Shell lifter
        const slGeo = new THREE.BoxGeometry(0.028, 0.005, 0.04);
        const sl = new THREE.Mesh(slGeo, rMat);
        sl.position.set(0, -0.028, 0.0);
        group.add(sl);

        // Trigger guard
        const tgGeo = new THREE.BoxGeometry(0.035, 0.004, 0.065);
        const tg = new THREE.Mesh(tgGeo, rMat);
        tg.position.set(0, -0.03, 0.02);
        group.add(tg);

        // Trigger
        const tGeo = new THREE.BoxGeometry(0.005, 0.017, 0.003);
        const trigger = new THREE.Mesh(tGeo, bMat);
        trigger.position.set(0, -0.022, 0.015);
        group.add(trigger);

        // Wooden stock
        const stGeo = new THREE.BoxGeometry(0.046, 0.055, 0.18);
        const st = new THREE.Mesh(stGeo, wMat);
        st.position.set(0, 0.0, 0.14);
        st.castShadow = true;
        group.add(st);

        // Stock grip section
        const sgGeo = new THREE.BoxGeometry(0.048, 0.06, 0.05);
        const sg = new THREE.Mesh(sgGeo, wMat);
        sg.position.set(0, -0.01, 0.05);
        group.add(sg);

        // Stock checkering
        for (let i = 0; i < 3; i++) {
            const ckGeo = new THREE.BoxGeometry(0.049, 0.003, 0.05);
            const ck = new THREE.Mesh(ckGeo, wdMat);
            ck.position.set(0, -0.02 + i * 0.012, 0.05);
            group.add(ck);
        }

        // Stock butt plate
        const bpGeo = new THREE.BoxGeometry(0.05, 0.065, 0.012);
        const bpMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        const bp = new THREE.Mesh(bpGeo, bpMat);
        bp.position.set(0, 0.0, 0.235);
        group.add(bp);

        // Pistol grip
        const pgGeo = new THREE.BoxGeometry(0.04, 0.09, 0.04);
        const pg = new THREE.Mesh(pgGeo, wMat);
        pg.position.set(0, -0.055, 0.07);
        pg.rotation.x = -0.2;
        pg.castShadow = true;
        group.add(pg);

        // Cross-bolt safety
        const csGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.01, 6);
        csGeo.rotateZ(Math.PI / 2);
        const cs = new THREE.Mesh(csGeo, rMat);
        cs.position.set(0.028, 0.0, 0.04);
        group.add(cs);

        return group;
    }

    _buildAllyM1911() {
        const group = new THREE.Group();
        const sMat = new THREE.MeshLambertMaterial({ color: 0x2e2e2e });
        const fMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const bMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        const gMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });
        const aMat = new THREE.MeshLambertMaterial({ color: 0xc0a060 });
        const tMat = new THREE.MeshLambertMaterial({ color: 0x888888 });

        // Slide
        const slGeo = new THREE.BoxGeometry(0.04, 0.03, 0.24);
        const slide = new THREE.Mesh(slGeo, sMat);
        slide.position.set(0, 0.02, -0.07);
        slide.castShadow = true;
        group.add(slide);

        // Slide serrations (rear)
        for (let i = 0; i < 5; i++) {
            const serGeo = new THREE.BoxGeometry(0.042, 0.002, 0.007);
            const ser = new THREE.Mesh(serGeo, fMat);
            ser.position.set(0, 0.02, 0.03 + i * 0.009);
            group.add(ser);
        }

        // Slide serrations (front)
        for (let i = 0; i < 3; i++) {
            const serGeo = new THREE.BoxGeometry(0.042, 0.002, 0.007);
            const ser = new THREE.Mesh(serGeo, fMat);
            ser.position.set(0, 0.02, -0.15 + i * 0.009);
            group.add(ser);
        }

        // Ejection port
        const epGeo = new THREE.BoxGeometry(0.022, 0.008, 0.03);
        const ep = new THREE.Mesh(epGeo, new THREE.MeshLambertMaterial({ color: 0x080808 }));
        ep.position.set(0.02, 0.02, -0.01);
        group.add(ep);

        // Barrel
        const bGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.16, 8);
        bGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(bGeo, bMat);
        barrel.position.set(0, 0.014, -0.12);
        group.add(barrel);

        // Barrel bushing
        const bbGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.01, 8);
        bbGeo.rotateX(Math.PI / 2);
        const bb = new THREE.Mesh(bbGeo, sMat);
        bb.position.set(0, 0.014, -0.195);
        group.add(bb);

        // Muzzle bore
        const boGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.003, 6);
        boGeo.rotateX(Math.PI / 2);
        const bo = new THREE.Mesh(boGeo, new THREE.MeshLambertMaterial({ color: 0x000000 }));
        bo.position.set(0, 0.014, -0.2);
        group.add(bo);

        // Front sight
        const fsGeo = new THREE.BoxGeometry(0.005, 0.007, 0.005);
        const fs = new THREE.Mesh(fsGeo, sMat);
        fs.position.set(0, 0.04, -0.17);
        group.add(fs);

        // Rear sight
        const rsGeo = new THREE.BoxGeometry(0.022, 0.007, 0.008);
        const rs = new THREE.Mesh(rsGeo, sMat);
        rs.position.set(0, 0.04, 0.07);
        group.add(rs);

        // Frame
        const frGeo = new THREE.BoxGeometry(0.038, 0.022, 0.2);
        const frame = new THREE.Mesh(frGeo, fMat);
        frame.position.set(0, -0.005, -0.05);
        frame.castShadow = true;
        group.add(frame);

        // Trigger guard
        const tgGeo = new THREE.BoxGeometry(0.025, 0.004, 0.05);
        const tg = new THREE.Mesh(tgGeo, fMat);
        tg.position.set(0, -0.02, 0.0);
        group.add(tg);

        // Trigger guard front
        const tgfGeo = new THREE.BoxGeometry(0.025, 0.017, 0.003);
        const tgf = new THREE.Mesh(tgfGeo, fMat);
        tgf.position.set(0, -0.012, -0.022);
        group.add(tgf);

        // Trigger
        const trGeo = new THREE.BoxGeometry(0.004, 0.018, 0.003);
        const trigger = new THREE.Mesh(trGeo, tMat);
        trigger.position.set(0, -0.012, -0.003);
        trigger.rotation.x = -0.15;
        group.add(trigger);

        // Hammer
        const haGeo = new THREE.BoxGeometry(0.018, 0.018, 0.006);
        const ha = new THREE.Mesh(haGeo, fMat);
        ha.position.set(0, 0.015, 0.09);
        ha.rotation.x = -0.3;
        group.add(ha);

        // Hammer spur
        const hsGeo = new THREE.BoxGeometry(0.02, 0.004, 0.01);
        const hs = new THREE.Mesh(hsGeo, aMat);
        hs.position.set(0, 0.025, 0.093);
        group.add(hs);

        // Grip safety
        const gsGeo = new THREE.BoxGeometry(0.032, 0.06, 0.02);
        const gs = new THREE.Mesh(gsGeo, fMat);
        gs.position.set(0, -0.04, 0.055);
        gs.rotation.x = -0.15;
        group.add(gs);

        // Grip panel left
        const glGeo = new THREE.BoxGeometry(0.007, 0.058, 0.055);
        const gl = new THREE.Mesh(glGeo, gMat);
        gl.position.set(-0.022, -0.035, 0.035);
        gl.rotation.x = -0.1;
        gl.castShadow = true;
        group.add(gl);

        // Grip panel right
        const grGeo = new THREE.BoxGeometry(0.007, 0.058, 0.055);
        const gr = new THREE.Mesh(grGeo, gMat);
        gr.position.set(0.022, -0.035, 0.035);
        gr.rotation.x = -0.1;
        group.add(gr);

        // Grip checkering
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 2; col++) {
                const ckGeo = new THREE.BoxGeometry(0.008, 0.007, 0.007);
                const ckMat = new THREE.MeshLambertMaterial({ color: 0x2a1a0e });
                for (let s = -1; s <= 1; s += 2) {
                    const ck = new THREE.Mesh(ckGeo, ckMat);
                    ck.position.set(s * 0.023, -0.015 + row * -0.014, 0.015 + col * 0.018);
                    ck.rotation.x = -0.1;
                    group.add(ck);
                }
            }
        }

        // Magazine
        const mgGeo = new THREE.BoxGeometry(0.025, 0.055, 0.035);
        const mag = new THREE.Mesh(mgGeo, fMat);
        mag.position.set(0, -0.06, 0.025);
        mag.castShadow = true;
        group.add(mag);

        // Magazine base pad
        const mpGeo = new THREE.BoxGeometry(0.027, 0.007, 0.037);
        const mp = new THREE.Mesh(mpGeo, aMat);
        mp.position.set(0, -0.09, 0.025);
        group.add(mp);

        // Slide stop
        const ssGeo = new THREE.BoxGeometry(0.013, 0.005, 0.022);
        const ss = new THREE.Mesh(ssGeo, fMat);
        ss.position.set(-0.025, 0.005, 0.0);
        group.add(ss);

        // Thumb safety
        const tsGeo = new THREE.BoxGeometry(0.01, 0.004, 0.03);
        const ts = new THREE.Mesh(tsGeo, fMat);
        ts.position.set(-0.025, 0.014, 0.035);
        group.add(ts);

        // Magazine release
        const mrGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.006, 6);
        mrGeo.rotateZ(Math.PI / 2);
        const mr = new THREE.Mesh(mrGeo, fMat);
        mr.position.set(0.022, -0.01, 0.015);
        group.add(mr);

        // Mainspring housing
        const mhGeo = new THREE.BoxGeometry(0.028, 0.035, 0.012);
        const mh = new THREE.Mesh(mhGeo, fMat);
        mh.position.set(0, -0.04, 0.065);
        mh.rotation.x = -0.15;
        group.add(mh);

        return group;
    }

    _createIndicator() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 64, 20);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.9 });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(2.0, 0.5, 1);
        return sprite;
    }

    update(dt, playerPos, enemies, allies, command, gameState) {
        if (!this.alive) return;

        this.indicator.position.copy(this.mesh.position);
        this.indicator.position.y += 2.5;

        if (this.downed) {
            this.downTimer -= dt;
            if (this.downTimer <= 0) {
                this.die();
            }
            this.mesh.position.copy(this.position);
            this.mesh.rotation.y = this.rotation;
            return;
        }

        this.thinkTimer -= dt;
        if (this.thinkTimer <= 0) {
            this.thinkTimer = this.thinkInterval;
            this._think(playerPos, enemies, allies, command);
        }

        this._move(dt, playerPos);
        this._combat(dt, enemies, playerPos, gameState);

        this.mesh.position.copy(this.position);
        this.mesh.position.y = 0;
        this.mesh.rotation.y = this.rotation;
    }

    _think(playerPos, enemies, allies, command) {
        if (this.state === ALLY_STATES.DOWNED) return;

        if (command) {
            this._handleCommand(command, playerPos);
        }

        const nearestEnemy = this._findNearestEnemy(enemies, playerPos);
        const downedAlly = this._findDownedAlly(allies);

        switch (this.state) {
            case ALLY_STATES.FOLLOWING:
            case ALLY_STATES.REGROUPING:
                if (nearestEnemy && nearestEnemy.dist < this.detectionRange) {
                    this.target = nearestEnemy.enemy;
                    this._changeState(ALLY_STATES.ENGAGING);
                }
                break;

            case ALLY_STATES.HOLDING:
                if (nearestEnemy && nearestEnemy.dist < this.detectionRange) {
                    this.target = nearestEnemy.enemy;
                    this._changeState(ALLY_STATES.ENGAGING);
                }
                break;

            case ALLY_STATES.ENGAGING:
                if (!this.target || !this.target.alive || this.target.health <= 0) {
                    this.target = null;
                    this._changeState(ALLY_STATES.FOLLOWING);
                } else {
                    const distToTarget = this.position.distanceTo(this.target.position);
                    if (distToTarget > this.detectionRange * 1.3) {
                        this.target = null;
                        this._changeState(ALLY_STATES.FOLLOWING);
                    }
                }
                break;

            case ALLY_STATES.REVIVING:
                if (!this.reviveTarget || !this.reviveTarget.downed) {
                    this.reviveTarget = null;
                    this._changeState(ALLY_STATES.FOLLOWING);
                }
                break;
        }

        if (this.state !== ALLY_STATES.REVIVING && downedAlly && this.role === 'medic') {
            this.reviveTarget = downedAlly.ally;
            this._changeState(ALLY_STATES.REVIVING);
        }
    }

    _handleCommand(command, playerPos) {
        switch (command) {
            case 'follow':
                this._changeState(ALLY_STATES.FOLLOWING);
                this.holdPosition = null;
                break;
            case 'hold':
                this.holdPosition = this.position.clone();
                this._changeState(ALLY_STATES.HOLDING);
                break;
            case 'focus':
                this._changeState(ALLY_STATES.ENGAGING);
                break;
            case 'regroup':
                this._changeState(ALLY_STATES.REGROUPING);
                break;
        }
    }

    _move(dt, playerPos) {
        let targetPos;

        switch (this.state) {
            case ALLY_STATES.FOLLOWING:
            case ALLY_STATES.REGROUPING:
                const angle = this.formationAngle;
                this.formationOffset.set(
                    Math.sin(angle) * this.followDistance,
                    0,
                    Math.cos(angle) * this.followDistance
                );
                targetPos = playerPos.clone().add(this.formationOffset);
                break;

            case ALLY_STATES.HOLDING:
                targetPos = this.holdPosition || this.position;
                break;

            case ALLY_STATES.ENGAGING:
                if (this.target) {
                    const dist = this.position.distanceTo(this.target.position);
                    if (dist > this.range * 0.6) {
                        targetPos = this.target.position.clone();
                    } else if (dist < this.range * 0.3) {
                        const away = this.position.clone().sub(this.target.position).normalize().multiplyScalar(3);
                        targetPos = this.position.clone().add(away);
                    } else {
                        targetPos = this.position.clone();
                    }
                } else {
                    targetPos = playerPos;
                }
                break;

            case ALLY_STATES.REVIVING:
                if (this.reviveTarget) {
                    targetPos = this.reviveTarget.position.clone();
                }
                break;

            default:
                targetPos = playerPos;
        }

        if (targetPos) {
            const dir = targetPos.clone().sub(this.position);
            dir.y = 0;
            const dist = dir.length();

            if (dist > 0.5) {
                dir.normalize();
                const moveSpeed = this.speed * dt;
                this.position.x += dir.x * Math.min(moveSpeed, dist);
                this.position.z += dir.z * Math.min(moveSpeed, dist);
                this.rotation = Math.atan2(dir.x, dir.z);
            }
        }

        this.position.y = 0;
    }

﻿    _combat(dt, enemies, playerPos, gameState) {
        if (this.state === ALLY_STATES.REVIVING && this.reviveTarget) {
            const dist = this.position.distanceTo(this.reviveTarget.position);
            if (dist < 2) {
                this.reviveTarget.revive();
                this.reviveTarget = null;
                this._changeState(ALLY_STATES.FOLLOWING);
                if (gameState) gameState.stats.revives++;
            }
            return;
        }

        if (this.state !== ALLY_STATES.ENGAGING || !this.target || !this.target.alive) return;

        this.fireTimer -= dt;

        const toTarget = this.target.position.clone().sub(this.position);
        toTarget.y = 0;
        this.rotation = Math.atan2(toTarget.x, toTarget.z);

        if (this.fireTimer <= 0 && this.position.distanceTo(this.target.position) < this.range) {
            this.fireTimer = this.fireRate;

            const gunPos = this.position.clone();
            gunPos.y = 1.3;
            const aimDir = this.target.position.clone();
            aimDir.y = this.target.position.y + 1.0 * (this.target.scale || 1);
            aimDir.sub(gunPos).normalize();
            aimDir.x += (Math.random() - 0.5) * 0.06;
            aimDir.y += (Math.random() - 0.5) * 0.04;
            aimDir.normalize();

            const game = this.scene.__gameRef;
            if (game && game.bulletSystem) {
                const tracerColor = this.role === 'assault' ? 0x4488ff : this.role === 'support' ? 0xff8844 : 0x44ff44;
                game.bulletSystem.fire(gunPos.clone(), aimDir, 180, this.range * 2, tracerColor);
            }

            if (Math.random() < this.accuracy) {
                const s = this.target.scale || 1;
                const bodyCenter = this.target.position.clone();
                bodyCenter.y = 1.0 * s;
                const bodyRadius = 0.5 * s;
                const headCenter = this.target.position.clone();
                headCenter.y = 1.8 * s;
                const headRadius = 0.28 * s;

                const bodyHit = this._allyRaySphere(gunPos, aimDir, bodyCenter, bodyRadius);
                const headHit = this._allyRaySphere(gunPos, aimDir, headCenter, headRadius);
                let hitIsHead = false;
                if (headHit !== null && (bodyHit === null || headHit < bodyHit)) hitIsHead = true;

                const isHeadshot = hitIsHead;
                const dmg = isHeadshot ? this.damage * 2 : this.damage;
                this.target.takeDamage(dmg, this.position, isHeadshot);

                if (game && game.particles) {
                    const hitDist = Math.min(headHit || 999, bodyHit || 999);
                    if (hitDist < 999) {
                        const hitPoint = gunPos.clone().add(aimDir.clone().multiplyScalar(hitDist));
                        game.particles.emitBlood(hitPoint, aimDir.clone().negate());
                    }
                }

                if (!this.target.alive) {
                    if (gameState) gameState.addKill(isHeadshot);
                }
            }
        }
    }

    _allyRaySphere(origin, dir, center, radius) {
        const oc = origin.clone().sub(center);
        const a = dir.dot(dir);
        const b = 2 * oc.dot(dir);
        const c = oc.dot(oc) - radius * radius;
        const disc = b * b - 4 * a * c;
        if (disc < 0) return null;
        const t = (-b - Math.sqrt(disc)) / (2 * a);
        return t > 0.01 ? t : null;
    }

    _findNearestEnemy(enemies, playerPos) {
        let nearest = null;
        let nearestDist = Infinity;

        for (const enemy of enemies) {
            if (!enemy.alive || enemy.health <= 0) continue;
            const dist = this.position.distanceTo(enemy.position);
            const playerDist = playerPos.distanceTo(enemy.position);
            const score = dist + playerDist * 0.5;

            if (score < nearestDist) {
                nearestDist = score;
                nearest = { enemy, dist };
            }
        }

        return nearest;
    }

    _findDownedAlly(allies) {
        for (const ally of allies) {
            if (ally === this || !ally.downed || !ally.alive) continue;
            return { ally, dist: this.position.distanceTo(ally.position) };
        }
        return null;
    }

    _changeState(newState) {
        if (this.state === newState) return;
        this.prevState = this.state;
        this.state = newState;
        this.stateTimer = 0;
    }

    takeDamage(amount, attackerPos) {
        if (!this.alive || this.downed) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.downed = true;
            this.downTimer = this.downDuration;
            this._changeState(ALLY_STATES.DOWNED);
            this.mesh.rotation.x = Math.PI / 2;
            this.mesh.position.y = 0.3;
        }
    }

    revive() {
        this.downed = false;
        this.health = 60;
        this.downTimer = 0;
        this.mesh.rotation.x = 0;
        this._changeState(ALLY_STATES.FOLLOWING);
    }

    die() {
        this.alive = false;
        this.downed = false;
        this.mesh.visible = false;
        this.indicator.visible = false;
    }

    getState() {
        return this.state;
    }

    getStatusText() {
        switch (this.state) {
            case ALLY_STATES.FOLLOWING: return 'FOLLOWING';
            case ALLY_STATES.HOLDING: return 'HOLDING';
            case ALLY_STATES.ENGAGING: return 'ENGAGING';
            case ALLY_STATES.REVIVING: return 'REVIVING';
            case ALLY_STATES.DOWNED: return 'DOWNED';
            case ALLY_STATES.REGROUPING: return 'REGROUPING';
            default: return 'IDLE';
        }
    }

    reset(x, z) {
        this.health = 100;
        this.alive = true;
        this.downed = false;
        this.downTimer = 0;
        this.position.set(x, 0, z);
        this.target = null;
        this.reviveTarget = null;
        this.holdPosition = null;
        this._changeState(ALLY_STATES.FOLLOWING);
        this.mesh.visible = true;
        this.indicator.visible = true;
        this.mesh.rotation.x = 0;
    }
}

// --- ai/AllySquad.js ---

class AllySquad {
    constructor(scene) {
        this.scene = scene;
        this.allies = [];
        this.lastCommand = null;
        this.commandCooldown = 0;
    }

    init() {
        const configs = [
            { name: 'REAPER', role: 'assault', color: 0x4488ff, formationAngle: Math.PI * 0.7, x: 3, z: 2 },
            { name: 'DOC', role: 'medic', color: 0x44cc44, formationAngle: -Math.PI * 0.7, x: -3, z: 2 },
            { name: 'HAVOC', role: 'support', color: 0xff8844, formationAngle: Math.PI, x: 0, z: 4 }
        ];

        for (const config of configs) {
            const ally = new Ally(config, this.scene);
            this.allies.push(ally);
        }
    }

    update(dt, playerPos, enemies, gameState) {
        if (this.commandCooldown > 0) {
            this.commandCooldown -= dt;
            if (this.commandCooldown <= 0) {
                this.lastCommand = null;
            }
        }

        for (const ally of this.allies) {
            ally.update(dt, playerPos, enemies, this.allies, this.lastCommand, gameState);
        }
    }

    issueCommand(command) {
        this.lastCommand = command;
        this.commandCooldown = 0.5;
    }

    getAliveAllies() {
        return this.allies.filter(a => a.alive && !a.downed);
    }

    getDownedAllies() {
        return this.allies.filter(a => a.downed && a.alive);
    }

    getAllAllies() {
        return this.allies;
    }

    reset() {
        const positions = [
            { x: 3, z: 2 },
            { x: -3, z: 2 },
            { x: 0, z: 4 }
        ];
        for (let i = 0; i < this.allies.length; i++) {
            this.allies[i].reset(positions[i].x, positions[i].z);
        }
        this.lastCommand = null;
        this.commandCooldown = 0;
    }
}

// --- level/Level.js ---

class Level {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.spawnPoints = [];
        this.pickups = [];
        this.coverPoints = [];
        this.bounds = { minX: -50, maxX: 50, minZ: -50, maxZ: 50 };
    }

    build() {
        this._createGround();
        this._createWalls();
        this._createBuildings();
        this._createProps();
        this._createLighting();
        this._createPickups();
        this._defineSpawnPoints();
    }

    _createGround() {
        const groundGeo = new THREE.PlaneGeometry(120, 120, 20, 20);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.9,
            metalness: 0.1
        });

        const positions = groundGeo.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getY(i);
            positions.setZ(i, (Math.random() - 0.5) * 0.15);
        }
        groundGeo.computeVertexNormals();

        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const roadGeo = new THREE.PlaneGeometry(8, 100);
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.y = 0.01;
        this.scene.add(road);

        const road2 = road.clone();
        road2.rotation.z = Math.PI / 2;
        this.scene.add(road2);
    }

    _createWalls() {
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.8,
            metalness: 0.2
        });

        const wallConfigs = [
            { x: 0, z: -38, w: 80, h: 4, d: 1 },
            { x: 0, z: 38, w: 80, h: 4, d: 1 },
            { x: -38, z: 0, w: 1, h: 4, d: 80 },
            { x: 38, z: 0, w: 1, h: 4, d: 80 }
        ];

        for (const cfg of wallConfigs) {
            const geo = new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d);
            const wall = new THREE.Mesh(geo, wallMat);
            wall.position.set(cfg.x, cfg.h / 2, cfg.z);
            wall.castShadow = true;
            wall.receiveShadow = true;
            this.scene.add(wall);
            this.objects.push(wall);
        }
    }

    _createBuildings() {
        const buildingMat = new THREE.MeshStandardMaterial({
            color: 0x3a3a3a,
            roughness: 0.85,
            metalness: 0.15
        });

        const darkMat = new THREE.MeshStandardMaterial({
            color: 0x252525,
            roughness: 0.9,
            metalness: 0.1
        });

        const buildings = [
            { x: -20, z: -20, w: 12, h: 8, d: 10 },
            { x: -20, z: 15, w: 10, h: 6, d: 12 },
            { x: 22, z: -18, w: 14, h: 10, d: 10 },
            { x: 25, z: 20, w: 10, h: 7, d: 8 },
            { x: -15, z: -35, w: 8, h: 5, d: 6 },
            { x: 15, z: 35, w: 10, h: 6, d: 8 },
            { x: -35, z: 5, w: 6, h: 4, d: 12 },
            { x: 35, z: -5, w: 8, h: 5, d: 10 },
            { x: 0, z: -30, w: 6, h: 3, d: 6 },
            { x: -8, z: 30, w: 8, h: 4, d: 6 },
        ];

        for (const b of buildings) {
            const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
            const building = new THREE.Mesh(geo, Math.random() > 0.5 ? buildingMat : darkMat);
            building.position.set(b.x, b.h / 2, b.z);
            building.castShadow = true;
            building.receiveShadow = true;
            this.scene.add(building);
            this.objects.push(building);

            if (Math.random() > 0.4) {
                const windowGeo = new THREE.PlaneGeometry(b.w * 0.8, b.h * 0.15);
                const windowMat = new THREE.MeshStandardMaterial({
                    color: 0x1a1a2e,
                    emissive: 0x0a0a15,
                    emissiveIntensity: 0.3,
                    roughness: 0.5
                });

                const window1 = new THREE.Mesh(windowGeo, windowMat);
                window1.position.set(b.x, b.h * 0.7, b.z - b.d / 2 - 0.01);
                this.scene.add(window1);

                if (b.w > 6) {
                    const window2 = window1.clone();
                    window2.position.z = b.z + b.d / 2 + 0.01;
                    this.scene.add(window2);
                }
            }
        }
    }

    _createProps() {
        const concreteMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.95 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.7, metalness: 0.6 });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });

        const barriers = [
            { x: 8, z: -5, ry: 0 },
            { x: -8, z: 5, ry: 0.3 },
            { x: 5, z: 10, ry: -0.2 },
            { x: -5, z: -10, ry: 0.5 },
            { x: 12, z: 0, ry: 0.1 },
            { x: -12, z: 0, ry: -0.1 },
            { x: 0, z: 8, ry: Math.PI / 2 },
            { x: 0, z: -8, ry: Math.PI / 2 },
        ];

        for (const b of barriers) {
            const geo = new THREE.BoxGeometry(3, 1.0, 0.6);
            const barrier = new THREE.Mesh(geo, concreteMat);
            barrier.position.set(b.x, 0.5, b.z);
            barrier.rotation.y = b.ry;
            barrier.castShadow = true;
            barrier.receiveShadow = true;
            this.scene.add(barrier);
            this.objects.push(barrier);
            this.coverPoints.push(new THREE.Vector3(b.x, 0, b.z));
        }

        const barrelPositions = [
            { x: 15, z: -12 }, { x: -15, z: 12 }, { x: 10, z: 15 },
            { x: -10, z: -15 }, { x: 20, z: 5 }, { x: -20, z: -5 },
        ];

        for (const pos of barrelPositions) {
            const isExplosive = Math.random() > 0.6;
            const geo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8);
            const mat = isExplosive ?
                new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.7 }) :
                metalMat;
            const barrel = new THREE.Mesh(geo, mat);
            barrel.position.set(pos.x, 0.6, pos.z);
            barrel.castShadow = true;
            this.scene.add(barrel);
            this.objects.push(barrel);

            if (isExplosive) {
                barrel.userData.explosive = true;
                barrel.userData.health = 30;
            }
        }

        const cratePositions = [
            { x: -6, z: -3 }, { x: 6, z: 3 }, { x: -3, z: 6 },
            { x: 3, z: -6 }, { x: 14, z: -14 }, { x: -14, z: 14 },
        ];

        for (const pos of cratePositions) {
            const size = 0.8 + Math.random() * 0.4;
            const geo = new THREE.BoxGeometry(size, size, size);
            const crate = new THREE.Mesh(geo, woodMat);
            crate.position.set(pos.x, size / 2, pos.z);
            crate.rotation.y = Math.random() * Math.PI;
            crate.castShadow = true;
            this.scene.add(crate);
            this.objects.push(crate);
        }

        const wreckPositions = [
            { x: -10, z: -8, ry: 0.3 },
            { x: 12, z: 10, ry: -0.5 },
            { x: -25, z: -15, ry: 0.8 },
        ];

        for (const w of wreckPositions) {
            const group = new THREE.Group();

            const bodyGeo = new THREE.BoxGeometry(4, 1.5, 2);
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9 });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.75;
            group.add(body);

            const cabinGeo = new THREE.BoxGeometry(2, 1, 1.8);
            const cabin = new THREE.Mesh(cabinGeo, bodyMat);
            cabin.position.set(0.5, 1.75, 0);
            group.add(cabin);

            group.position.set(w.x, 0, w.z);
            group.rotation.y = w.ry;
            this.scene.add(group);
            this.objects.push(group);
        }

        const lightPolePositions = [
            { x: 10, z: -20 }, { x: -10, z: 20 }, { x: 20, z: 10 },
            { x: -20, z: -10 }, { x: 0, z: 0 },
        ];

        for (const pos of lightPolePositions) {
            const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 5, 6);
            const pole = new THREE.Mesh(poleGeo, metalMat);
            pole.position.set(pos.x, 2.5, pos.z);
            this.scene.add(pole);

            const lightGeo = new THREE.SphereGeometry(0.3, 8, 6);
            const lightMat = new THREE.MeshStandardMaterial({
                color: 0xffaa44,
                emissive: 0xffaa44,
                emissiveIntensity: 0.5
            });
            const light = new THREE.Mesh(lightGeo, lightMat);
            light.position.set(pos.x, 5.2, pos.z);
            this.scene.add(light);

            const pointLight = new THREE.PointLight(0xffaa44, 0.8, 15, 2);
            pointLight.position.set(pos.x, 5, pos.z);
            pointLight.castShadow = false;
            this.scene.add(pointLight);
        }
    }

    _createLighting() {
        const ambient = new THREE.AmbientLight(0x1a1a2e, 0.4);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xff8844, 0.6);
        dirLight.position.set(-30, 40, -20);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 100;
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -50;
        dirLight.shadow.bias = -0.001;
        this.scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0x4466aa, 0.15);
        fillLight.position.set(20, 30, 15);
        this.scene.add(fillLight);

        const fogColor = new THREE.Color(0x1a0a0a);
        this.scene.background = fogColor;
        this.scene.fog = new THREE.FogExp2(0x1a0a0a, 0.008);

        const hemisphereLight = new THREE.HemisphereLight(0x223355, 0x111111, 0.3);
        this.scene.add(hemisphereLight);
    }

    _createPickups() {
        const pickupConfigs = [
            { x: 10, z: -8, type: 'ammo' },
            { x: -10, z: 8, type: 'ammo' },
            { x: 5, z: 15, type: 'health' },
            { x: -5, z: -15, type: 'health' },
            { x: 0, z: -20, type: 'grenade' },
            { x: 15, z: 0, type: 'ammo' },
            { x: -15, z: 0, type: 'health' },
            { x: 20, z: -10, type: 'grenade' },
            { x: -20, z: 10, type: 'ammo' },
        ];

        const colors = {
            ammo: 0xffaa00,
            health: 0x00ff44,
            grenade: 0xff4444
        };

        for (const cfg of pickupConfigs) {
            const geo = new THREE.OctahedronGeometry(0.25, 0);
            const mat = new THREE.MeshStandardMaterial({
                color: colors[cfg.type],
                emissive: colors[cfg.type],
                emissiveIntensity: 0.4,
                roughness: 0.3
            });
            const pickup = new THREE.Mesh(geo, mat);
            pickup.position.set(cfg.x, 0.8, cfg.z);
            pickup.userData.type = cfg.type;
            pickup.userData.active = true;
            pickup.userData.respawnTimer = 0;
            this.scene.add(pickup);
            this.pickups.push(pickup);
        }
    }

    _defineSpawnPoints() {
        this.spawnPoints = [
            { x: -20, z: -20 },
            { x: -20, z: 0 },
            { x: -20, z: 20 },
            { x: 20, z: -20 },
            { x: 20, z: 0 },
            { x: 20, z: 20 },
            { x: 0, z: -20 },
            { x: 0, z: 20 },
            { x: -15, z: -18 },
            { x: 15, z: -18 },
            { x: -15, z: 18 },
            { x: 15, z: 18 },
            { x: -18, z: -15 },
            { x: 18, z: -15 },
            { x: -18, z: 15 },
            { x: 18, z: 15 },
            { x: -10, z: -22 },
            { x: 10, z: -22 },
            { x: -10, z: 22 },
            { x: 10, z: 22 },
            { x: -22, z: -10 },
            { x: 22, z: -10 },
            { x: -22, z: 10 },
            { x: 22, z: 10 },
        ];
    }

    updatePickups(dt, player) {
        for (const pickup of this.pickups) {
            if (!pickup.userData.active) {
                pickup.userData.respawnTimer -= dt;
                if (pickup.userData.respawnTimer <= 0) {
                    pickup.userData.active = true;
                    pickup.visible = true;
                }
                continue;
            }

            pickup.rotation.y += dt * 2;
            pickup.position.y = 0.8 + Math.sin(Date.now() * 0.003) * 0.15;

            if (player && player.alive) {
                const dist = pickup.position.distanceTo(player.position);
                if (dist < 1.5) {
                    pickup.userData.active = false;
                    pickup.visible = false;
                    pickup.userData.respawnTimer = 30;
                    return pickup.userData.type;
                }
            }
        }
        return null;
    }

    getSpawnPoints() {
        return this.spawnPoints;
    }

    getObjects() {
        return this.objects;
    }

    getCoverPoints() {
        return this.coverPoints;
    }
}

// --- level/CityLevel.js ---

class CityLevel {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.spawnPoints = [];
        this.pickups = [];
        this.coverPoints = [];
        this.bounds = { minX: -80, maxX: 80, minZ: -80, maxZ: 80 };
        this._pointLights = [];
    }

    build() {
        this._createGround();
        this._createStreets();
        this._createBuildings();
        this._createAlleys();
        this._createStreetLights();
        this._createNeonSigns();
        this._createCars();
        this._createProps();
        this._createPark();
        this._createLighting();
        this._createPickups();
        this._defineSpawnPoints();
    }

    // ─── GROUND ───────────────────────────────────────────────────
    _createGround() {
        const geo = new THREE.PlaneGeometry(180, 180, 1, 1);
        const mat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95, metalness: 0.05 });
        const ground = new THREE.Mesh(geo, mat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    // ─── STREETS (grid) ──────────────────────────────────────────
    _createStreets() {
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.92, metalness: 0.05 });
        const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.88 });
        const laneMat = new THREE.MeshStandardMaterial({ color: 0x444400, roughness: 0.85, emissive: 0x222200, emissiveIntensity: 0.08 });

        const streetWidth = 10;
        const sidewalkW = 2.5;
        const mapHalf = 80;

        // Main horizontal streets at z = -30, 0, 30
        const hStreets = [-30, 0, 30];
        for (const z of hStreets) {
            // Road surface
            const roadGeo = new THREE.PlaneGeometry(mapHalf * 2, streetWidth);
            const road = new THREE.Mesh(roadGeo, roadMat);
            road.rotation.x = -Math.PI / 2;
            road.position.set(0, 0.01, z);
            road.receiveShadow = true;
            this.scene.add(road);

            // Center dashed lane markings
            for (let x = -mapHalf + 3; x < mapHalf; x += 8) {
                const dashGeo = new THREE.PlaneGeometry(4, 0.15);
                const dash = new THREE.Mesh(dashGeo, laneMat);
                dash.rotation.x = -Math.PI / 2;
                dash.position.set(x, 0.02, z);
                this.scene.add(dash);
            }

            // Sidewalks (both sides)
            for (const side of [-1, 1]) {
                const swGeo = new THREE.BoxGeometry(mapHalf * 2, 0.15, sidewalkW);
                const sw = new THREE.Mesh(swGeo, sidewalkMat);
                sw.position.set(0, 0.075, z + side * (streetWidth / 2 + sidewalkW / 2));
                sw.receiveShadow = true;
                this.scene.add(sw);
                this.objects.push(sw);

                // Curb
                const curbGeo = new THREE.BoxGeometry(mapHalf * 2, 0.18, 0.3);
                const curb = new THREE.Mesh(curbGeo, new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 }));
                curb.position.set(0, 0.09, z + side * (streetWidth / 2));
                this.scene.add(curb);
            }
        }

        // Main vertical streets at x = -30, 0, 30
        const vStreets = [-30, 0, 30];
        for (const x of vStreets) {
            const roadGeo = new THREE.PlaneGeometry(streetWidth, mapHalf * 2);
            const road = new THREE.Mesh(roadGeo, roadMat);
            road.rotation.x = -Math.PI / 2;
            road.position.set(x, 0.015, 0);
            road.receiveShadow = true;
            this.scene.add(road);

            for (let z = -mapHalf + 3; z < mapHalf; z += 8) {
                const dashGeo = new THREE.PlaneGeometry(0.15, 4);
                const dash = new THREE.Mesh(dashGeo, laneMat);
                dash.rotation.x = -Math.PI / 2;
                dash.position.set(x, 0.025, z);
                this.scene.add(dash);
            }

            for (const side of [-1, 1]) {
                const swGeo = new THREE.BoxGeometry(sidewalkW, 0.15, mapHalf * 2);
                const sw = new THREE.Mesh(swGeo, sidewalkMat);
                sw.position.set(x + side * (streetWidth / 2 + sidewalkW / 2), 0.075, 0);
                sw.receiveShadow = true;
                this.scene.add(sw);
                this.objects.push(sw);

                const curbGeo = new THREE.BoxGeometry(0.3, 0.18, mapHalf * 2);
                const curb = new THREE.Mesh(curbGeo, new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 }));
                curb.position.set(x + side * (streetWidth / 2), 0.09, 0);
                this.scene.add(curb);
            }
        }

        // Crosswalks at intersections
        const intersections = [];
        for (const hx of vStreets) {
            for (const hz of hStreets) {
                intersections.push({ x: hx, z: hz });
            }
        }
        for (const inter of intersections) {
            for (let i = -4; i <= 4; i += 1.4) {
                const stripeGeo = new THREE.PlaneGeometry(0.6, streetWidth - 1);
                const stripe = new THREE.Mesh(stripeGeo, new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 }));
                stripe.rotation.x = -Math.PI / 2;
                stripe.rotation.z = Math.PI / 2;
                stripe.position.set(inter.x + i, 0.025, inter.z);
                this.scene.add(stripe);
            }
        }
    }

    // ─── BUILDINGS ───────────────────────────────────────────────
    _createBuildings() {
        const blockCenters = [];
        // Generate building blocks between the street grid
        const streetX = [-30, 0, 30];
        const streetZ = [-30, 0, 30];

        // Define block regions between streets
        const xRanges = [[-75, -35], [-25, -5], [5, 25], [35, 75]];
        const zRanges = [[-75, -35], [-25, -5], [5, 25], [35, 75]];

        const buildingColors = [
            0x2a2a30, 0x333338, 0x282830, 0x303035,
            0x383838, 0x252528, 0x2e2e33, 0x353540,
            0x3a3a3a, 0x2c2c30, 0x323238, 0x292930
        ];

        const windowLitColors = [
            0xffdd88, 0xffcc66, 0xffeedd, 0xaaccff,
            0xff9944, 0xeeddcc, 0xccddff, 0xffaa55
        ];

        let seed = 42;
        const seededRandom = () => {
            seed = (seed * 16807 + 0) % 2147483647;
            return (seed - 1) / 2147483646;
        };

        for (const [xMin, xMax] of xRanges) {
            for (const [zMin, zMax] of zRanges) {
                const blockW = xMax - xMin;
                const blockD = zMax - zMin;

                // Fill the block with buildings
                let cx = xMin + 2;
                while (cx < xMax - 4) {
                    let cz = zMin + 2;
                    while (cz < zMax - 4) {
                        const bw = 6 + Math.floor(seededRandom() * 10);
                        const bd = 6 + Math.floor(seededRandom() * 10);
                        const bh = 8 + Math.floor(seededRandom() * 28);

                        if (cx + bw > xMax - 1 || cz + bd > zMax - 1) {
                            cz += bd + 1.5;
                            continue;
                        }

                        const color = buildingColors[Math.floor(seededRandom() * buildingColors.length)];
                        const mat = new THREE.MeshStandardMaterial({
                            color,
                            roughness: 0.82 + seededRandom() * 0.1,
                            metalness: 0.08 + seededRandom() * 0.12
                        });

                        const geo = new THREE.BoxGeometry(bw, bh, bd);
                        const building = new THREE.Mesh(geo, mat);
                        building.position.set(cx + bw / 2, bh / 2, cz + bd / 2);
                        building.castShadow = true;
                        building.receiveShadow = true;
                        this.scene.add(building);
                        this.objects.push(building);

                        // ── Windows on all 4 faces ──
                        this._addWindows(building, bw, bh, bd, windowLitColors, seededRandom);

                        // ── Rooftop details ──
                        if (seededRandom() > 0.35) {
                            this._addRooftop(cx + bw / 2, bh, cz + bd / 2, bw, bd, seededRandom);
                        }

                        cz += bd + 1.5 + Math.floor(seededRandom() * 2);
                    }
                    cx += 1.5 + Math.floor(seededRandom() * 3);
                }
            }
        }
    }

    _addWindows(building, bw, bh, bd, litColors, rand) {
        const floorH = 3.5;
        const floors = Math.floor(bh / floorH);
        const winW = 1.2;
        const winH = 1.8;
        const gap = 2.0;

        const darkGlassMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a15,
            roughness: 0.3,
            metalness: 0.6,
            emissive: 0x000000,
            emissiveIntensity: 0
        });

        const faces = [
            { axis: 'z', sign: -1, size: bw },
            { axis: 'z', sign: 1, size: bw },
            { axis: 'x', sign: -1, size: bd },
            { axis: 'x', sign: 1, size: bd }
        ];

        for (const face of faces) {
            const wallSize = face.size;
            const cols = Math.max(1, Math.floor((wallSize - 1) / gap));

            for (let floor = 0; floor < floors; floor++) {
                for (let col = 0; col < cols; col++) {
                    const isLit = rand() > 0.55;
                    const winMat = isLit
                        ? new THREE.MeshStandardMaterial({
                            color: litColors[Math.floor(rand() * litColors.length)],
                            emissive: litColors[Math.floor(rand() * litColors.length)],
                            emissiveIntensity: 0.35 + rand() * 0.35,
                            roughness: 0.4,
                            metalness: 0.2,
                            transparent: true,
                            opacity: 0.9
                        })
                        : darkGlassMat;

                    const winGeo = new THREE.PlaneGeometry(winW, winH);
                    const win = new THREE.Mesh(winGeo, winMat);

                    const localX = -wallSize / 2 + (col + 0.5) * (wallSize / cols);
                    const localY = (floor + 0.5) * floorH + 1;

                    if (face.axis === 'z') {
                        win.position.set(
                            building.position.x + localX,
                            localY,
                            building.position.z + face.sign * (building.geometry.parameters.depth / 2 + 0.02)
                        );
                        win.rotation.y = face.sign > 0 ? Math.PI : 0;
                    } else {
                        win.position.set(
                            building.position.x + face.sign * (building.geometry.parameters.width / 2 + 0.02),
                            localY,
                            building.position.z + localX
                        );
                        win.rotation.y = face.sign > 0 ? -Math.PI / 2 : Math.PI / 2;
                    }

                    this.scene.add(win);
                }
            }
        }
    }

    _addRooftop(cx, topY, cz, bw, bd, rand) {
        const acMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7, metalness: 0.3 });

        // AC units
        const acCount = Math.floor(rand() * 3) + 1;
        for (let i = 0; i < acCount; i++) {
            const acGeo = new THREE.BoxGeometry(1.5 + rand(), 1.2, 1 + rand());
            const ac = new THREE.Mesh(acGeo, acMat);
            ac.position.set(
                cx + (rand() - 0.5) * (bw - 3),
                topY + 0.6,
                cz + (rand() - 0.5) * (bd - 3)
            );
            ac.castShadow = true;
            this.scene.add(ac);
            this.objects.push(ac);
        }

        // Water tower (on taller buildings)
        if (topY > 20 && rand() > 0.5) {
            const towerGroup = new THREE.Group();
            const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 4, 6);
            const legMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.85 });
            for (let lx = -1; lx <= 1; lx += 2) {
                for (let lz = -1; lz <= 1; lz += 2) {
                    const leg = new THREE.Mesh(legGeo, legMat);
                    leg.position.set(lx * 0.8, 2, lz * 0.8);
                    towerGroup.add(leg);
                }
            }
            const tankGeo = new THREE.CylinderGeometry(1.2, 1.4, 2.5, 10);
            const tankMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.8 });
            const tank = new THREE.Mesh(tankGeo, tankMat);
            tank.position.y = 5;
            tank.castShadow = true;
            towerGroup.add(tank);

            const roofGeo = new THREE.ConeGeometry(1.5, 1, 10);
            const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x3a2a15, roughness: 0.8 }));
            roof.position.y = 6.8;
            towerGroup.add(roof);

            towerGroup.position.set(cx, topY, cz);
            this.scene.add(towerGroup);
            this.objects.push(towerGroup);
        }
    }

    // ─── ALLEYS (dark narrow passages between blocks) ────────────
    _createAlleys() {
        const alleyMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.98 });

        // Some alley floors between building blocks
        const alleyPositions = [
            { x: -15, z: -15, w: 3, d: 18 },
            { x: 15, z: 10, w: 18, d: 3 },
            { x: -50, z: -15, w: 3, d: 18 },
            { x: 50, z: -15, w: 3, d: 18 },
            { x: -15, z: 50, w: 18, d: 3 },
        ];

        for (const a of alleyPositions) {
            const geo = new THREE.PlaneGeometry(a.w, a.d);
            const alley = new THREE.Mesh(geo, alleyMat);
            alley.rotation.x = -Math.PI / 2;
            alley.position.set(a.x, 0.02, a.z);
            this.scene.add(alley);
        }
    }

    // ─── STREET LIGHTS ───────────────────────────────────────────
    _createStreetLights() {
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6, metalness: 0.5 });
        const lampMat = new THREE.MeshStandardMaterial({
            color: 0xffcc66,
            emissive: 0xffaa33,
            emissiveIntensity: 0.8,
            roughness: 0.3
        });

        // Place lights along all streets
        const lightPositions = [];

        // Horizontal streets
        for (const z of [-30, 0, 30]) {
            for (let x = -70; x <= 70; x += 18) {
                lightPositions.push({ x, z: z - 7 });
                lightPositions.push({ x: x + 9, z: z + 7 });
            }
        }
        // Vertical streets
        for (const x of [-30, 0, 30]) {
            for (let z = -70; z <= 70; z += 18) {
                lightPositions.push({ x: x - 7, z });
                lightPositions.push({ x: x + 7, z: z + 9 });
            }
        }

        for (const pos of lightPositions) {
            // Pole
            const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 6, 6);
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.set(pos.x, 3, pos.z);
            pole.castShadow = true;
            this.scene.add(pole);

            // Arm
            const armGeo = new THREE.BoxGeometry(2.5, 0.08, 0.08);
            const arm = new THREE.Mesh(armGeo, poleMat);
            arm.position.set(pos.x + 1.2, 6, pos.z);
            this.scene.add(arm);

            // Lamp housing
            const housingGeo = new THREE.BoxGeometry(1.2, 0.2, 0.4);
            const housing = new THREE.Mesh(housingGeo, poleMat);
            housing.position.set(pos.x + 2.4, 5.9, pos.z);
            this.scene.add(housing);

            // Lamp glow
            const glowGeo = new THREE.PlaneGeometry(1.0, 0.3);
            const glow = new THREE.Mesh(glowGeo, lampMat);
            glow.rotation.x = Math.PI / 2;
            glow.position.set(pos.x + 2.4, 5.78, pos.z);
            this.scene.add(glow);

            // Actual point light (limited number for performance)
            if (this._pointLights.length < 40) {
                const pl = new THREE.PointLight(0xffaa44, 0.6, 18, 2);
                pl.position.set(pos.x + 2.4, 5.7, pos.z);
                pl.castShadow = false;
                this.scene.add(pl);
                this._pointLights.push(pl);
            }
        }
    }

    // ─── NEON SIGNS ──────────────────────────────────────────────
    _createNeonSigns() {
        const neonColors = [0xff0044, 0x00ccff, 0xff6600, 0x44ff44, 0xff00ff, 0xffff00, 0xff4488, 0x00ffcc];

        const signPositions = [
            { x: -45, z: -35, y: 8, text: 'BAR', color: 0xff0044 },
            { x: 35, z: -35, y: 12, text: 'HOTEL', color: 0x00ccff },
            { x: -35, z: 35, y: 10, text: 'GUNS', color: 0xff6600 },
            { x: 45, z: 35, y: 15, text: 'MEDS', color: 0x44ff44 },
            { x: -15, z: -5, y: 6, text: 'OPEN', color: 0xff00ff },
            { x: 15, z: 5, y: 8, text: 'CAFE', color: 0xffff00 },
            { x: -50, z: 0, y: 10, text: '24HR', color: 0xff4488 },
            { x: 50, z: -30, y: 14, text: 'SAFE', color: 0x00ffcc },
        ];

        for (const sign of signPositions) {
            const neonMat = new THREE.MeshStandardMaterial({
                color: sign.color,
                emissive: sign.color,
                emissiveIntensity: 1.2,
                roughness: 0.2,
                metalness: 0.1
            });

            // Sign backing plate
            const backMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
            const backGeo = new THREE.BoxGeometry(3.5, 1.2, 0.15);
            const back = new THREE.Mesh(backGeo, backMat);
            back.position.set(sign.x, sign.y, sign.z);
            this.scene.add(back);

            // Neon letters (simplified as glowing bars)
            const letterCount = sign.text.length;
            for (let i = 0; i < letterCount; i++) {
                const barGeo = new THREE.BoxGeometry(0.5, 0.8, 0.08);
                const bar = new THREE.Mesh(barGeo, neonMat);
                bar.position.set(
                    sign.x - (letterCount * 0.35) / 2 + i * 0.55 + 0.25,
                    sign.y,
                    sign.z + 0.12
                );
                this.scene.add(bar);
            }

            // Neon point light
            const nl = new THREE.PointLight(sign.color, 0.5, 12, 2);
            nl.position.set(sign.x, sign.y, sign.z + 1);
            this.scene.add(nl);

            // Flickering effect simulation - some lights slightly dimmer
            if (Math.random() > 0.6) {
                nl.intensity = 0.25;
            }
        }
    }

    // ─── CARS ────────────────────────────────────────────────────
    _createCars() {
        const carColors = [0x3a3a3a, 0x444466, 0x553333, 0x334433, 0x444444, 0x2a2a3a, 0x554433, 0x333344, 0x664444, 0x445555];

        const carPositions = [
            // Parked along horizontal streets
            { x: -50, z: -24, ry: 0 }, { x: -38, z: -24, ry: 0 },
            { x: -20, z: -24, ry: 0 }, { x: 10, z: -24, ry: 0 },
            { x: 40, z: -24, ry: 0 }, { x: 55, z: -24, ry: 0 },
            { x: -45, z: -36, ry: Math.PI }, { x: -10, z: -36, ry: Math.PI },
            { x: 20, z: -36, ry: Math.PI }, { x: 50, z: -36, ry: Math.PI },
            // Along other streets
            { x: -55, z: 6, ry: 0 }, { x: -40, z: 6, ry: 0 },
            { x: 15, z: 6, ry: 0 }, { x: 45, z: 6, ry: 0 },
            { x: -35, z: -6, ry: Math.PI }, { x: 0, z: -6, ry: Math.PI },
            { x: 35, z: -6, ry: Math.PI }, { x: 60, z: -6, ry: Math.PI },
            // Vertical street parking
            { x: -24, z: -50, ry: Math.PI / 2 }, { x: -24, z: -20, ry: Math.PI / 2 },
            { x: -24, z: 10, ry: Math.PI / 2 }, { x: -24, z: 45, ry: Math.PI / 2 },
            { x: -36, z: -40, ry: -Math.PI / 2 }, { x: -36, z: 15, ry: -Math.PI / 2 },
            { x: 6, z: -55, ry: Math.PI / 2 }, { x: 6, z: 10, ry: Math.PI / 2 },
            { x: -6, z: -45, ry: -Math.PI / 2 }, { x: -6, z: 20, ry: -Math.PI / 2 },
            // Wrecked / abandoned (in intersections or odd places)
            { x: 5, z: 5, ry: 0.4 }, { x: -5, z: -3, ry: -0.7 },
            { x: 32, z: 28, ry: 1.2 }, { x: -28, z: 32, ry: 2.1 },
        ];

        for (let i = 0; i < carPositions.length; i++) {
            const cp = carPositions[i];
            const isWreck = i >= carPositions.length - 4;
            const group = new THREE.Group();

            const color = carColors[i % carColors.length];
            const bodyMat = new THREE.MeshStandardMaterial({
                color: isWreck ? 0x2a2a2a : color,
                roughness: isWreck ? 0.95 : 0.6,
                metalness: isWreck ? 0.1 : 0.4
            });
            const glassMat = new THREE.MeshStandardMaterial({
                color: 0x1a2233,
                roughness: 0.2,
                metalness: 0.3,
                transparent: true,
                opacity: 0.6
            });
            const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });

            // Body
            const bodyGeo = new THREE.BoxGeometry(2.2, 1.0, 4.2);
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.7;
            body.castShadow = true;
            group.add(body);

            // Cabin
            const cabinGeo = new THREE.BoxGeometry(1.9, 0.8, 2.2);
            const cabin = new THREE.Mesh(cabinGeo, bodyMat);
            cabin.position.set(0, 1.5, -0.2);
            cabin.castShadow = true;
            group.add(cabin);

            // Windshield
            const windshieldGeo = new THREE.PlaneGeometry(1.7, 0.7);
            const windshield = new THREE.Mesh(windshieldGeo, glassMat);
            windshield.position.set(0, 1.5, 0.92);
            windshield.rotation.x = -0.25;
            group.add(windshield);

            // Rear window
            const rearWinGeo = new THREE.PlaneGeometry(1.7, 0.6);
            const rearWin = new THREE.Mesh(rearWinGeo, glassMat);
            rearWin.position.set(0, 1.5, -1.32);
            rearWin.rotation.x = 0.2;
            group.add(rearWin);

            // Side windows
            for (const side of [-1, 1]) {
                const sideWinGeo = new THREE.PlaneGeometry(1.8, 0.55);
                const sideWin = new THREE.Mesh(sideWinGeo, glassMat);
                sideWin.position.set(side * 1.01, 1.55, -0.2);
                sideWin.rotation.y = side * Math.PI / 2;
                group.add(sideWin);
            }

            // Tires
            const tireGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.22, 10);
            const tirePositions = [
                { x: -1.05, z: 1.3 }, { x: 1.05, z: 1.3 },
                { x: -1.05, z: -1.3 }, { x: 1.05, z: -1.3 }
            ];
            for (const tp of tirePositions) {
                const tire = new THREE.Mesh(tireGeo, tireMat);
                tire.position.set(tp.x, 0.3, tp.z);
                tire.rotation.z = Math.PI / 2;
                group.add(tire);
            }

            // Headlights
            const headlightMat = new THREE.MeshStandardMaterial({
                color: 0xffffcc,
                emissive: 0xffee88,
                emissiveIntensity: 0.2,
                roughness: 0.3
            });
            for (const side of [-1, 1]) {
                const hlGeo = new THREE.SphereGeometry(0.12, 6, 4);
                const hl = new THREE.Mesh(hlGeo, headlightMat);
                hl.position.set(side * 0.7, 0.7, 2.12);
                group.add(hl);
            }

            // Taillights
            const taillightMat = new THREE.MeshStandardMaterial({
                color: 0xff0000,
                emissive: 0xcc0000,
                emissiveIntensity: 0.15,
                roughness: 0.4
            });
            for (const side of [-1, 1]) {
                const tlGeo = new THREE.BoxGeometry(0.2, 0.1, 0.05);
                const tl = new THREE.Mesh(tlGeo, taillightMat);
                tl.position.set(side * 0.7, 0.7, -2.12);
                group.add(tl);
            }

            // Wreck effects
            if (isWreck) {
                group.rotation.x = (Math.random() - 0.5) * 0.15;
                group.rotation.z = (Math.random() - 0.5) * 0.2;

                // Broken glass shards
                for (let g = 0; g < 3; g++) {
                    const shardGeo = new THREE.BoxGeometry(0.3, 0.02, 0.2);
                    const shard = new THREE.Mesh(shardGeo, glassMat);
                    shard.position.set(
                        (Math.random() - 0.5) * 2,
                        0.02,
                        (Math.random() - 0.5) * 3
                    );
                    shard.rotation.y = Math.random() * Math.PI;
                    group.add(shard);
                }
            }

            group.position.set(cp.x, 0, cp.z);
            group.rotation.y = cp.ry;
            this.scene.add(group);
            this.objects.push(group);
        }
    }

    // ─── PROPS (dumpsters, hydrants, barriers, trash cans, etc.) ──
    _createProps() {
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7, metalness: 0.5 });
        const concreteMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.95 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
        const greenMat = new THREE.MeshStandardMaterial({ color: 0x2a4a2a, roughness: 0.85 });

        // Dumpsters
        const dumpsterPositions = [
            { x: -42, z: -18 }, { x: -12, z: 18 }, { x: 42, z: -18 },
            { x: 12, z: 18 }, { x: -18, z: 42 }, { x: 18, z: -42 },
            { x: -50, z: 50 }, { x: 50, z: -50 }, { x: -65, z: 15 },
            { x: 65, z: -15 }, { x: 0, z: -55 }, { x: -55, z: 0 },
        ];
        for (const dp of dumpsterPositions) {
            const group = new THREE.Group();
            const bodyGeo = new THREE.BoxGeometry(2.2, 1.4, 1.3);
            const body = new THREE.Mesh(bodyGeo, greenMat);
            body.position.y = 0.7;
            body.castShadow = true;
            group.add(body);

            const lidGeo = new THREE.BoxGeometry(2.2, 0.08, 1.3);
            const lid = new THREE.Mesh(lidGeo, greenMat);
            lid.position.set(0, 1.42, 0);
            lid.rotation.x = Math.random() > 0.5 ? -0.3 : 0;
            group.add(lid);

            group.position.set(dp.x, 0, dp.z);
            group.rotation.y = Math.random() * Math.PI;
            this.scene.add(group);
            this.objects.push(group);
        }

        // Fire hydrants
        const hydrantPositions = [
            { x: -37, z: -15 }, { x: -37, z: 15 }, { x: 37, z: -15 },
            { x: 37, z: 15 }, { x: -15, z: -37 }, { x: 15, z: -37 },
            { x: -15, z: 37 }, { x: 15, z: 37 },
        ];
        for (const hp of hydrantPositions) {
            const group = new THREE.Group();
            const baseGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.4, 8);
            const base = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.6 }));
            base.position.y = 0.2;
            group.add(base);

            const bodyGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.7, 8);
            const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.6 }));
            body.position.y = 0.75;
            group.add(body);

            const capGeo = new THREE.SphereGeometry(0.15, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
            const cap = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.6 }));
            cap.position.y = 1.1;
            group.add(cap);

            // Side nozzles
            for (const side of [-1, 1]) {
                const nozzleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 6);
                nozzleGeo.rotateZ(Math.PI / 2);
                const nozzle = new THREE.Mesh(nozzleGeo, metalMat);
                nozzle.position.set(side * 0.22, 0.7, 0);
                group.add(nozzle);
            }

            group.position.set(hp.x, 0, hp.z);
            this.scene.add(group);
            this.objects.push(group);
        }

        // Concrete barriers / jersey barriers
        const barrierPositions = [
            { x: -5, z: -5, ry: 0.3 }, { x: 5, z: 5, ry: -0.4 },
            { x: -32, z: 0, ry: 0 }, { x: 32, z: 0, ry: 0 },
            { x: 0, z: -32, ry: Math.PI / 2 }, { x: 0, z: 32, ry: Math.PI / 2 },
            { x: -45, z: -45, ry: 0.5 }, { x: 45, z: 45, ry: -0.5 },
            { x: -60, z: -15, ry: 0.2 }, { x: 60, z: 15, ry: -0.2 },
        ];
        for (const bp of barrierPositions) {
            const geo = new THREE.BoxGeometry(3.5, 1.0, 0.6);
            const barrier = new THREE.Mesh(geo, concreteMat);
            barrier.position.set(bp.x, 0.5, bp.z);
            barrier.rotation.y = bp.ry;
            barrier.castShadow = true;
            barrier.receiveShadow = true;
            this.scene.add(barrier);
            this.objects.push(barrier);
            this.coverPoints.push(new THREE.Vector3(bp.x, 0, bp.z));
        }

        // Trash cans
        const trashPositions = [
            { x: -35, z: -13 }, { x: 35, z: -13 }, { x: -13, z: -35 },
            { x: 13, z: 35 }, { x: -48, z: 13 }, { x: 48, z: -13 },
        ];
        for (const tp of trashPositions) {
            const geo = new THREE.CylinderGeometry(0.3, 0.28, 0.9, 8);
            const can = new THREE.Mesh(geo, darkMat);
            can.position.set(tp.x, 0.45, tp.z);
            can.castShadow = true;
            this.scene.add(can);
            this.objects.push(can);
        }

        // Newspaper boxes
        const newsPositions = [
            { x: -36, z: -8 }, { x: 36, z: 8 }, { x: -8, z: -36 }, { x: 8, z: 36 },
        ];
        for (const np of newsPositions) {
            const geo = new THREE.BoxGeometry(0.5, 1.0, 0.35);
            const box = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x336633, roughness: 0.7 }));
            box.position.set(np.x, 0.5, np.z);
            box.castShadow = true;
            this.scene.add(box);
            this.objects.push(box);
        }

        // Bus stop shelters
        const shelterPositions = [
            { x: -50, z: -36, ry: 0 }, { x: 20, z: 6, ry: Math.PI },
        ];
        for (const sp of shelterPositions) {
            const group = new THREE.Group();

            // Posts
            const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 3, 6);
            const postMat = metalMat;
            for (const px of [-1.5, 1.5]) {
                const post = new THREE.Mesh(postGeo, postMat);
                post.position.set(px, 1.5, 0);
                group.add(post);
            }

            // Roof
            const roofGeo = new THREE.BoxGeometry(3.5, 0.08, 1.8);
            const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.5, metalness: 0.3, transparent: true, opacity: 0.7 }));
            roof.position.y = 3;
            group.add(roof);

            // Glass back panel
            const glassGeo = new THREE.PlaneGeometry(3.2, 2.5);
            const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a2233, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.4 });
            const glass = new THREE.Mesh(glassGeo, glassMat);
            glass.position.set(0, 1.5, -0.88);
            group.add(glass);

            // Bench
            const benchGeo = new THREE.BoxGeometry(2.5, 0.08, 0.5);
            const bench = new THREE.Mesh(benchGeo, new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.85 }));
            bench.position.set(0, 0.6, 0.3);
            group.add(bench);

            group.position.set(sp.x, 0, sp.z);
            group.rotation.y = sp.ry;
            this.scene.add(group);
            this.objects.push(group);
        }
    }

    // ─── PARK (central green area) ───────────────────────────────
    _createPark() {
        // Grass area
        const grassMat = new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 0.95 });
        const grassGeo = new THREE.PlaneGeometry(16, 16);
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.rotation.x = -Math.PI / 2;
        grass.position.set(-15, 0.03, 15);
        grass.receiveShadow = true;
        this.scene.add(grass);

        // Trees
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x1a4a1a, roughness: 0.9 });
        const darkLeafMat = new THREE.MeshStandardMaterial({ color: 0x143514, roughness: 0.9 });

        const treePositions = [
            { x: -20, z: 10 }, { x: -10, z: 20 }, { x: -20, z: 20 },
            { x: -10, z: 10 }, { x: -15, z: 15 }, { x: -20, z: 15 },
            { x: -10, z: 15 }, { x: -15, z: 10 }, { x: -15, z: 20 },
        ];

        for (const tp of treePositions) {
            const group = new THREE.Group();

            const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 3, 6);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 1.5;
            trunk.castShadow = true;
            group.add(trunk);

            const canopyGeo = new THREE.SphereGeometry(1.8, 8, 6);
            const canopy = new THREE.Mesh(canopyGeo, Math.random() > 0.5 ? leafMat : darkLeafMat);
            canopy.position.y = 4;
            canopy.scale.set(1, 0.8, 1);
            canopy.castShadow = true;
            group.add(canopy);

            // Second canopy layer
            const canopy2Geo = new THREE.SphereGeometry(1.2, 8, 6);
            const canopy2 = new THREE.Mesh(canopy2Geo, darkLeafMat);
            canopy2.position.y = 5.2;
            canopy2.scale.set(0.8, 0.7, 0.8);
            group.add(canopy2);

            group.position.set(tp.x, 0, tp.z);
            this.scene.add(group);
            this.objects.push(group);
        }

        // Park benches
        const benchMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.85 });
        const benchPositions = [
            { x: -15, z: 12, ry: 0 }, { x: -12, z: 18, ry: Math.PI / 2 },
        ];
        for (const bp of benchPositions) {
            const group = new THREE.Group();

            // Seat
            const seatGeo = new THREE.BoxGeometry(1.8, 0.08, 0.5);
            const seat = new THREE.Mesh(seatGeo, benchMat);
            seat.position.y = 0.55;
            group.add(seat);

            // Backrest
            const backGeo = new THREE.BoxGeometry(1.8, 0.6, 0.08);
            const back = new THREE.Mesh(backGeo, benchMat);
            back.position.set(0, 0.85, -0.22);
            group.add(back);

            // Legs
            const legGeo = new THREE.BoxGeometry(0.08, 0.55, 0.5);
            for (const lx of [-0.7, 0.7]) {
                const leg = new THREE.Mesh(legGeo, metalMat);
                leg.position.set(lx, 0.275, 0);
                group.add(leg);
            }

            group.position.set(bp.x, 0, bp.z);
            group.rotation.y = bp.ry;
            this.scene.add(group);
            this.objects.push(group);
            this.coverPoints.push(new THREE.Vector3(bp.x, 0, bp.z));
        }

        // Fountain in center of park
        const fountainGroup = new THREE.Group();
        const baseGeo = new THREE.CylinderGeometry(2.5, 3, 0.6, 12);
        const fountainMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.7 });
        const fBase = new THREE.Mesh(baseGeo, fountainMat);
        fBase.position.y = 0.3;
        fountainGroup.add(fBase);

        const poolGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.4, 12);
        const waterMat = new THREE.MeshStandardMaterial({ color: 0x1a3a5a, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.7 });
        const pool = new THREE.Mesh(poolGeo, waterMat);
        pool.position.y = 0.5;
        fountainGroup.add(pool);

        const pillarGeo = new THREE.CylinderGeometry(0.3, 0.4, 2, 8);
        const pillar = new THREE.Mesh(pillarGeo, fountainMat);
        pillar.position.y = 1.5;
        fountainGroup.add(pillar);

        fountainGroup.position.set(-15, 0, 15);
        this.scene.add(fountainGroup);
        this.objects.push(fountainGroup);

        // Fountain light
        const fLight = new THREE.PointLight(0x4488cc, 0.4, 10, 2);
        fLight.position.set(-15, 2, 15);
        this.scene.add(fLight);
    }

    // ─── AMBIENT LIGHTING ────────────────────────────────────────
    _createLighting() {
        // Ambient — enough to keep shadows from being pure black
        const ambient = new THREE.AmbientLight(0x151525, 0.45);
        this.scene.add(ambient);

        // Moonlight — brighter so distant buildings are silhouetted, not invisible
        const moonLight = new THREE.DirectionalLight(0x6688bb, 0.55);
        moonLight.position.set(-40, 60, -30);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 2048;
        moonLight.shadow.mapSize.height = 2048;
        moonLight.shadow.camera.near = 0.5;
        moonLight.shadow.camera.far = 180;
        moonLight.shadow.camera.left = -90;
        moonLight.shadow.camera.right = 90;
        moonLight.shadow.camera.top = 90;
        moonLight.shadow.camera.bottom = -90;
        moonLight.shadow.bias = -0.001;
        this.scene.add(moonLight);

        // Warm city-glow fill from the other side
        const warmFill = new THREE.DirectionalLight(0xff9955, 0.2);
        warmFill.position.set(30, 25, 20);
        this.scene.add(warmFill);

        // Hemisphere — brighter sky so rooftops aren't black
        const hemiLight = new THREE.HemisphereLight(0x223355, 0x111111, 0.35);
        this.scene.add(hemiLight);

        // Thinner fog so you can actually see down streets
        const fogColor = new THREE.Color(0x060610);
        this.scene.background = fogColor;
        this.scene.fog = new THREE.FogExp2(0x060610, 0.003);
    }

    // ─── PICKUPS ─────────────────────────────────────────────────
    _createPickups() {
        const pickupConfigs = [
            // Street level pickups
            { x: -40, z: -8, type: 'ammo' },
            { x: 40, z: 8, type: 'ammo' },
            { x: -8, z: -40, type: 'health' },
            { x: 8, z: 40, type: 'health' },
            { x: 0, z: -15, type: 'grenade' },
            { x: -15, z: 0, type: 'ammo' },
            { x: 15, z: 0, type: 'health' },
            { x: -50, z: -50, type: 'grenade' },
            { x: 50, z: 50, type: 'ammo' },
            // Park area
            { x: -15, z: 15, type: 'health' },
            // Far corners
            { x: -65, z: -65, type: 'ammo' },
            { x: 65, z: 65, type: 'health' },
            { x: -65, z: 65, type: 'grenade' },
            { x: 65, z: -65, type: 'ammo' },
            // Mid-block
            { x: -15, z: -15, type: 'health' },
            { x: 15, z: 15, type: 'ammo' },
        ];

        const colors = {
            ammo: 0xffaa00,
            health: 0x00ff44,
            grenade: 0xff4444
        };

        for (const cfg of pickupConfigs) {
            const geo = new THREE.OctahedronGeometry(0.3, 0);
            const mat = new THREE.MeshStandardMaterial({
                color: colors[cfg.type],
                emissive: colors[cfg.type],
                emissiveIntensity: 0.5,
                roughness: 0.3
            });
            const pickup = new THREE.Mesh(geo, mat);
            pickup.position.set(cfg.x, 1.0, cfg.z);
            pickup.userData.type = cfg.type;
            pickup.userData.active = true;
            pickup.userData.respawnTimer = 0;
            this.scene.add(pickup);
            this.pickups.push(pickup);
        }
    }

    // ─── SPAWN POINTS ────────────────────────────────────────────
    _defineSpawnPoints() {
        this.spawnPoints = [
            // Edge spawns (zombies come from outside the playable area)
            { x: -70, z: -70 }, { x: -70, z: 0 }, { x: -70, z: 70 },
            { x: 70, z: -70 }, { x: 70, z: 0 }, { x: 70, z: 70 },
            { x: 0, z: -70 }, { x: 0, z: 70 },
            // Street corner spawns
            { x: -35, z: -35 }, { x: -35, z: 0 }, { x: -35, z: 35 },
            { x: 35, z: -35 }, { x: 35, z: 0 }, { x: 35, z: 35 },
            { x: 0, z: -35 }, { x: 0, z: 35 },
            // Deep city spawns
            { x: -55, z: -55 }, { x: 55, z: 55 },
            { x: -55, z: 55 }, { x: 55, z: -55 },
            { x: -20, z: -55 }, { x: 20, z: 55 },
            { x: -55, z: 20 }, { x: 55, z: -20 },
            // Alley spawns
            { x: -15, z: -15 }, { x: 15, z: 15 },
            { x: -15, z: 15 }, { x: 15, z: -15 },
            // Park area
            { x: -25, z: 25 }, { x: -5, z: 25 },
        ];
    }

    // ─── PICKUP UPDATE ───────────────────────────────────────────
    updatePickups(dt, player) {
        for (const pickup of this.pickups) {
            if (!pickup.userData.active) {
                pickup.userData.respawnTimer -= dt;
                if (pickup.userData.respawnTimer <= 0) {
                    pickup.userData.active = true;
                    pickup.visible = true;
                }
                continue;
            }

            pickup.rotation.y += dt * 2;
            pickup.position.y = 1.0 + Math.sin(Date.now() * 0.003) * 0.2;

            if (player && player.alive) {
                const dist = pickup.position.distanceTo(player.position);
                if (dist < 2.0) {
                    pickup.userData.active = false;
                    pickup.visible = false;
                    pickup.userData.respawnTimer = 25;
                    return pickup.userData.type;
                }
            }
        }
        return null;
    }

    getSpawnPoints() { return this.spawnPoints; }
    getObjects() { return this.objects; }
    getCoverPoints() { return this.coverPoints; }
}

// --- wave/WaveManager.js ---

const WAVE_STATES = {
    WAITING: 'waiting',
    ACTIVE: 'active',
    BETWEEN: 'between',
    COMPLETE: 'complete'
};

class WaveManager {
    constructor() {
        this.currentWave = 0;
        this.state = WAVE_STATES.WAITING;
        this.enemiesRemaining = 0;
        this.totalEnemies = 0;
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.betweenTimer = 0;
        this.betweenDuration = 5;
        this.difficulty = 1.0;
        this.maxWaves = 15;
    }

    getWaveConfig(waveNum) {
        const base = Math.floor(10 + waveNum * 5);
        const runnerCount = Math.max(6, Math.floor(base * 0.5));
        const crawlerCount = waveNum >= 2 ? Math.floor(base * 0.2) : 0;
        const spitterCount = waveNum >= 3 ? Math.floor(base * 0.12) : 0;
        const tankCount = waveNum >= 4 ? Math.floor(waveNum / 2) : 0;
        const exploderCount = waveNum >= 5 ? Math.floor(waveNum / 3) : 0;

        return {
            wave: waveNum,
            types: [
                { type: 'runner', count: runnerCount },
                { type: 'crawler', count: crawlerCount },
                { type: 'spitter', count: spitterCount },
                { type: 'tank', count: tankCount },
                { type: 'exploder', count: exploderCount }
            ].filter(t => t.count > 0),
            spawnDelay: Math.max(0.15, 0.8 - waveNum * 0.04),
            healthMultiplier: 1 + (waveNum - 1) * 0.18,
            speedMultiplier: 1 + (waveNum - 1) * 0.04,
        };
    }

    startWave(zombieManager, spawnPoints) {
        this.currentWave++;
        this.state = WAVE_STATES.ACTIVE;

        const config = this.getWaveConfig(this.currentWave);
        this.difficulty = config.healthMultiplier;

        this.spawnQueue = [];
        for (const entry of config.types) {
            for (let i = 0; i < entry.count; i++) {
                this.spawnQueue.push(entry.type);
            }
        }

        for (let i = this.spawnQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
        }

        this.totalEnemies = this.spawnQueue.length;
        this.enemiesRemaining = this.totalEnemies;
        this.spawnTimer = 0;
        this.spawnDelay = config.spawnDelay;

        return config;
    }

    update(dt, zombieManager, spawnPoints) {
        switch (this.state) {
            case WAVE_STATES.ACTIVE:
                this._updateActive(dt, zombieManager, spawnPoints);
                break;
            case WAVE_STATES.BETWEEN:
                this._updateBetween(dt);
                break;
        }
    }

    _updateActive(dt, zombieManager, spawnPoints) {
        if (this.spawnQueue.length > 0) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnTimer = this.spawnDelay;

                const type = this.spawnQueue.shift();
                const point = spawnPoints[MathUtils.randomInt(0, spawnPoints.length - 1)];
                const offset = MathUtils.randomPointInCircle(6);
                zombieManager.spawn(type, point.x + offset.x, point.z + offset.z);
            }
        }

        const aliveCount = zombieManager.getAliveCount();
        this.enemiesRemaining = this.spawnQueue.length + aliveCount;

        if (this.spawnQueue.length === 0 && aliveCount === 0) {
            this.state = WAVE_STATES.BETWEEN;
            this.betweenTimer = this.betweenDuration;
        }
    }

    _updateBetween(dt) {
        this.betweenTimer -= dt;
        if (this.betweenTimer <= 0) {
            this.state = WAVE_STATES.WAITING;
        }
    }

    isWaveComplete() {
        return this.state === WAVE_STATES.BETWEEN;
    }

    isWaiting() {
        return this.state === WAVE_STATES.WAITING;
    }

    isActive() {
        return this.state === WAVE_STATES.ACTIVE;
    }

    isBetween() {
        return this.state === WAVE_STATES.BETWEEN;
    }

    getProgress() {
        if (this.totalEnemies === 0) return 0;
        return 1 - (this.enemiesRemaining / this.totalEnemies);
    }

    shouldStartNext() {
        return this.state === WAVE_STATES.WAITING && this.currentWave < this.maxWaves;
    }

    isGameComplete() {
        return this.currentWave >= this.maxWaves && this.state === WAVE_STATES.WAITING;
    }

    reset() {
        this.currentWave = 0;
        this.state = WAVE_STATES.WAITING;
        this.enemiesRemaining = 0;
        this.totalEnemies = 0;
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.betweenTimer = 0;
        this.difficulty = 1.0;
    }
}

// --- ui/UIManager.js ---

class UIManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.elements = {};
        this.killFeedEntries = [];
        this.maxKillFeed = 5;
        this.damageNumbers = [];
        this._cacheElements();
        this._createDamageNumberContainer();
    }

    _cacheElements() {
        const ids = [
            'loading-screen', 'loading-bar', 'loading-text',
            'main-menu', 'controls-screen', 'settings-screen', 'map-select-screen', 'map-grid',
            'hud', 'crosshair', 'hit-marker', 'damage-vignette',
            'health-bar', 'health-text',
            'weapon-name', 'ammo-current', 'ammo-reserve',
            'wave-label', 'wave-enemies', 'objective-text',
            'fps-counter', 'kill-feed', 'interaction-prompt', 'interaction-text',
            'pause-menu', 'game-over-screen', 'victory-screen',
            'go-waves', 'go-kills', 'go-headshots', 'go-accuracy',
            'v-waves', 'v-kills', 'v-headshots', 'v-score',
            'wave-announce', 'wave-announce-text', 'wave-announce-sub',
            'squad-wheel',
            'setting-volume', 'setting-sensitivity', 'setting-fov', 'setting-fps',
            'ally-health-0', 'ally-health-1', 'ally-health-2',
            'ally-status-0', 'ally-status-1', 'ally-status-2',
            'shop-panel', 'shop-currency', 'shop-items'
        ];

        for (const id of ids) {
            this.elements[id] = document.getElementById(id);
        }

        this.elements['teammate-cards'] = document.querySelectorAll('.teammate-card');
    }

    get(id) {
        return this.elements[id];
    }

    show(id) {
        const el = this.elements[id];
        if (el) el.classList.remove('hidden');
    }

    hide(id) {
        const el = this.elements[id];
        if (el) el.classList.add('hidden');
    }

    setHTML(id, html) {
        const el = this.elements[id];
        if (el) el.innerHTML = html;
    }

    setStyle(id, prop, value) {
        const el = this.elements[id];
        if (el) el.style[prop] = value;
    }

    updateLoading(progress, text) {
        this.setStyle('loading-bar', 'width', `${progress}%`);
        if (text) this.setHTML('loading-text', text);
    }

    hideLoading() {
        this.hide('loading-screen');
    }

    showMenu(menuId) {
        this.hide('main-menu');
        this.hide('controls-screen');
        this.hide('settings-screen');
        this.hide('map-select-screen');
        this.hide('pause-menu');
        this.hide('game-over-screen');
        this.hide('victory-screen');
        if (menuId) this.show(menuId);
    }

    updateHUD(player, weapon, allies, waveManager, fps, weaponIndex, crosshairSpread) {
        if (!player) return;

        const healthPct = (player.health / player.maxHealth) * 100;
        this.setStyle('health-bar', 'width', `${healthPct}%`);
        this.setHTML('health-text', Math.ceil(player.health));

        if (healthPct < 25) {
            this.setStyle('health-bar', 'background', '#c62828');
        } else if (healthPct < 50) {
            this.setStyle('health-bar', 'background', '#ff9800');
        } else {
            this.setStyle('health-bar', 'background', 'linear-gradient(90deg, #c62828, #e53935)');
        }

        if (weapon) {
            this.setHTML('weapon-name', weapon.name);
            this.setHTML('ammo-current', weapon.currentAmmo);
            this.setHTML('ammo-reserve', weapon.reserveAmmo);

            if (weapon.currentAmmo <= 0) {
                this.setStyle('ammo-current', 'color', '#c62828');
            } else if (weapon.currentAmmo <= weapon.magazineSize * 0.3) {
                this.setStyle('ammo-current', 'color', '#ff9800');
            } else {
                this.setStyle('ammo-current', 'color', '#fff');
            }

            if (weapon.reloading) {
                this.setHTML('weapon-name', `${weapon.name} - RELOADING`);
            }
        }

        const slots = document.querySelectorAll('.weapon-slot');
        slots.forEach((slot, i) => {
            slot.classList.toggle('active', i === (weaponIndex || 0));
        });

        this._updateCrosshairSpread(crosshairSpread || 0);

        if (allies) {
            for (let i = 0; i < allies.length; i++) {
                const ally = allies[i];
                const card = this.elements['teammate-cards']?.[i];

                if (!ally.alive) {
                    this.setStyle(`ally-health-${i}`, 'width', '0%');
                    this.setHTML(`ally-status-${i}`, 'DEAD');
                    if (card) card.classList.add('downed');
                    continue;
                }

                const healthPct = (ally.health / ally.maxHealth) * 100;
                this.setStyle(`ally-health-${i}`, 'width', `${healthPct}%`);

                if (ally.downed) {
                    this.setStyle(`ally-health-${i}`, 'background', '#c62828');
                    this.setHTML(`ally-status-${i}`, `DOWNED ${Math.ceil(ally.downTimer)}s`);
                    if (card) card.classList.add('downed');
                } else {
                    this.setStyle(`ally-health-${i}`, 'background', '#4caf50');
                    this.setHTML(`ally-status-${i}`, ally.getStatusText());
                    if (card) card.classList.remove('downed');
                }
            }
        }

        if (waveManager) {
            this.setHTML('wave-label', `WAVE ${waveManager.currentWave}`);
            this.setHTML('wave-enemies', `ENEMIES: ${waveManager.enemiesRemaining}`);

            if (waveManager.isBetween()) {
                this.setHTML('objective-text', 'WAVE CLEAR - PREPARE FOR NEXT');
            } else if (waveManager.isActive()) {
                this.setHTML('objective-text', 'ELIMINATE ALL HOSTILES');
            }
        }

        if (fps !== undefined && this.gameState.settings.showFPS) {
            this.show('fps-counter');
            this.setHTML('fps-counter', `FPS: ${fps}`);
        } else {
            this.hide('fps-counter');
        }
    }

    showHitMarker(headshot = false) {
        const el = this.elements['hit-marker'];
        if (!el) return;
        el.classList.remove('hidden', 'headshot');
        if (headshot) el.classList.add('headshot');
        void el.offsetWidth;
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = 'hitFlash 0.15s ease-out';
        setTimeout(() => el.classList.add('hidden'), 150);
    }

    showDamageVignette(intensity) {
        this.setStyle('damage-vignette', 'opacity', Math.min(1, intensity));
        setTimeout(() => {
            this.setStyle('damage-vignette', 'opacity', '0');
        }, 200);
    }

    _updateCrosshairSpread(spread) {
        const base = 8;
        const spreadPx = base + spread * 40;
        ['top', 'bottom'].forEach(dir => {
            const el = document.querySelector(`.crosshair-${dir}`);
            if (el) el.style.height = `${spreadPx}px`;
        });
        ['left', 'right'].forEach(dir => {
            const el = document.querySelector(`.crosshair-${dir}`);
            if (el) el.style.width = `${spreadPx}px`;
        });
    }

    showShop(currency, upgrades) {
        const panel = this.elements['shop-panel'];
        if (!panel) return;
        this.setHTML('shop-currency', `CURRENCY: ${currency}`);
        const itemsEl = this.elements['shop-items'];
        if (!itemsEl) return;
        itemsEl.innerHTML = '';
        for (const upg of upgrades) {
            const item = document.createElement('div');
            item.className = 'shop-item';
            const canAfford = currency >= upg.cost && !upg.maxed;
            item.innerHTML = `
                <div class="shop-item-name">${upg.name}</div>
                <div class="shop-item-desc">${upg.desc}</div>
                <div class="shop-item-cost">${upg.maxed ? 'MAXED' : canAfford ? upg.cost + ' CR' : upg.cost + ' CR'}</div>
            `;
            item.classList.toggle('can-afford', canAfford);
            item.classList.toggle('maxed', upg.maxed);
            item.dataset.index = upgrades.indexOf(upg);
            item.addEventListener('click', () => {
                if (canAfford && this.gameState && this.gameState._purchaseUpgrade) {
                    this.gameState._purchaseUpgrade(upgrades.indexOf(upg));
                }
            });
            itemsEl.appendChild(item);
        }
        panel.classList.remove('hidden');
    }

    hideShop() {
        const panel = this.elements['shop-panel'];
        if (panel) panel.classList.add('hidden');
    }

    updateShopCurrency(currency) {
        this.setHTML('shop-currency', `CURRENCY: ${currency}`);
    }

    showDamageDirection(attackerPos, playerPos, playerRotation) {
        if (!attackerPos || !playerPos) return;

        const dx = attackerPos.x - playerPos.x;
        const dz = attackerPos.z - playerPos.z;
        const angle = Math.atan2(dx, dz) - playerRotation.y;

        const normalizedAngle = ((angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

        const arrows = ['damage-top', 'damage-right', 'damage-bottom', 'damage-left'];
        const directions = [
            { id: 'damage-top', range: [-Math.PI * 0.75, -Math.PI * 0.25] },
            { id: 'damage-right', range: [-Math.PI * 0.25, Math.PI * 0.25] },
            { id: 'damage-bottom', range: [Math.PI * 0.25, Math.PI * 0.75] },
            { id: 'damage-left', range: [Math.PI * 0.75, Math.PI * 1.0] }
        ];

        for (const dir of directions) {
            const el = document.querySelector(`.${dir.id}`);
            if (!el) continue;

            let inRange = false;
            if (dir.id === 'damage-left') {
                inRange = normalizedAngle >= dir.range[0] || normalizedAngle <= -Math.PI * 0.75;
            } else {
                inRange = normalizedAngle >= dir.range[0] && normalizedAngle <= dir.range[1];
            }

            if (inRange) {
                el.classList.add('active');
                setTimeout(() => el.classList.remove('active'), 400);
            }
        }
    }

    addKillFeed(message) {
        const feed = this.elements['kill-feed'];
        if (!feed) return;

        const entry = document.createElement('div');
        entry.className = 'kill-entry';
        entry.textContent = message;
        feed.appendChild(entry);

        this.killFeedEntries.push(entry);
        while (this.killFeedEntries.length > this.maxKillFeed) {
            const old = this.killFeedEntries.shift();
            if (old.parentNode) old.parentNode.removeChild(old);
        }

        setTimeout(() => {
            if (entry.parentNode) entry.parentNode.removeChild(entry);
            const idx = this.killFeedEntries.indexOf(entry);
            if (idx >= 0) this.killFeedEntries.splice(idx, 1);
        }, 3000);
    }

    showWaveAnnounce(waveNum, subtitle) {
        this.setHTML('wave-announce-text', `WAVE ${waveNum}`);
        this.setHTML('wave-announce-sub', subtitle || 'PREPARE YOURSELF');
        this.show('wave-announce');
        setTimeout(() => this.hide('wave-announce'), 3000);
    }

    showStreakAnnounce(count) {
        const messages = {
            5: 'BLOODLUST!',
            10: 'UNSTOPPABLE!',
            15: 'RAMPAGE!',
            20: 'GODLIKE!',
            25: 'LEGENDARY!'
        };
        const msg = messages[count] || `${count} KILL STREAK!`;
        this.setHTML('wave-announce-text', msg);
        this.setHTML('wave-announce-sub', `${count} CONSECUTIVE KILLS`);
        this.show('wave-announce');
        setTimeout(() => this.hide('wave-announce'), 2000);
    }

    showGameOver(stats) {
        this.setHTML('go-waves', stats.wavesCompleted);
        this.setHTML('go-kills', stats.kills);
        this.setHTML('go-headshots', stats.headshots);
        this.setHTML('go-accuracy', `${stats.accuracy}%`);
        this.show('game-over-screen');
    }

    showVictory(stats) {
        this.setHTML('v-waves', stats.wavesCompleted);
        this.setHTML('v-kills', stats.kills);
        this.setHTML('v-headshots', stats.headshots);
        this.setHTML('v-score', stats.score);
        this.show('victory-screen');
    }

    showSquadWheel() {
        this.show('squad-wheel');
    }

    hideSquadWheel() {
        this.hide('squad-wheel');
    }

    updateSettings(settings) {
        if (this.elements['setting-volume']) {
            this.elements['setting-volume'].value = settings.volume * 100;
        }
        if (this.elements['setting-sensitivity']) {
            this.elements['setting-sensitivity'].value = settings.sensitivity;
        }
        if (this.elements['setting-fov']) {
            this.elements['setting-fov'].value = settings.fov;
        }
        if (this.elements['setting-fps']) {
            this.elements['setting-fps'].checked = settings.showFPS;
        }
    }

    showInteraction(text) {
        this.setHTML('interaction-text', text);
        this.show('interaction-prompt');
    }

    hideInteraction() {
        this.hide('interaction-prompt');
    }

    _createDamageNumberContainer() {
        this.damageNumberContainer = document.createElement('div');
        this.damageNumberContainer.id = 'damage-numbers';
        this.damageNumberContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:110;';
        document.getElementById('game-container').appendChild(this.damageNumberContainer);
    }

    showDamageNumber(worldPos, damage, isHeadshot, camera, rendererDom) {
        const vec = worldPos.clone();
        vec.project(camera);

        const x = (vec.x * 0.5 + 0.5) * rendererDom.clientWidth;
        const y = (-(vec.y * 0.5) + 0.5) * rendererDom.clientHeight;

        if (vec.z > 1) return; // Behind camera

        const el = document.createElement('div');
        el.className = 'damage-number' + (isHeadshot ? ' headshot-dmg' : '');
        el.textContent = Math.round(damage);
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.color = isHeadshot ? '#ff4444' : '#ffffff';
        el.style.fontSize = isHeadshot ? '28px' : '20px';
        this.damageNumberContainer.appendChild(el);

        const entry = { el, timer: 1.0, startY: y };
        this.damageNumbers.push(entry);

        setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
            const idx = this.damageNumbers.indexOf(entry);
            if (idx >= 0) this.damageNumbers.splice(idx, 1);
        }, 1000);
    }

    updateDamageNumbers(dt) {
        for (const entry of this.damageNumbers) {
            entry.timer -= dt;
            const t = 1 - entry.timer;
            entry.el.style.transform = `translate(-50%, -50%) translateY(${-t * 60}px)`;
            entry.el.style.opacity = Math.max(0, 1 - t * 1.2);
        }
    }

    showLowHealthPulse(healthPct) {
        let pulseEl = document.getElementById('low-health-pulse');
        if (!pulseEl) {
            pulseEl = document.createElement('div');
            pulseEl.id = 'low-health-pulse';
            pulseEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:95;background:radial-gradient(ellipse at center, transparent 30%, rgba(180,0,0,0.4) 100%);opacity:0;transition:opacity 0.3s;';
            document.getElementById('game-container').appendChild(pulseEl);
        }

        if (healthPct < 25) {
            const intensity = 1 - (healthPct / 25);
            const pulse = 0.3 + Math.sin(Date.now() * 0.008) * 0.15 * intensity;
            pulseEl.style.opacity = pulse * intensity;
        } else {
            pulseEl.style.opacity = '0';
        }
    }

    hideAll() {
        this.hide('hud');
        this.hide('main-menu');
        this.hide('controls-screen');
        this.hide('settings-screen');
        this.hide('map-select-screen');
        this.hide('pause-menu');
        this.hide('game-over-screen');
        this.hide('victory-screen');
        this.hide('wave-announce');
        this.hide('squad-wheel');
        this.hide('interaction-prompt');
        this.hide('shop-panel');
    }
}

// --- game/GameState.js ---

class GameState {
    constructor() {
        this.state = 'loading';
        this.previousState = null;

        this.stats = {
            kills: 0,
            headshots: 0,
            shotsFired: 0,
            shotsHit: 0,
            wavesCompleted: 0,
            damageDealt: 0,
            damageTaken: 0,
            revives: 0,
            score: 0
        };

        this.wave = 0;
        this.difficulty = 1.0;
        this.currency = 0;
        this.paused = false;

        this.settings = {
            volume: 0.7,
            sensitivity: 5,
            fov: 75,
            showFPS: false
        };
    }

    changeState(newState) {
        this.previousState = this.state;
        this.state = newState;
    }

    reset() {
        this.stats = {
            kills: 0, headshots: 0, shotsFired: 0, shotsHit: 0,
            wavesCompleted: 0, damageDealt: 0, damageTaken: 0,
            revives: 0, score: 0
        };
        this.wave = 0;
        this.difficulty = 1.0;
        this.currency = 0;
        this.paused = false;
    }

    addKill(headshot = false) {
        this.stats.kills++;
        if (headshot) this.stats.headshots++;
        this.stats.score += headshot ? 150 : 100;
        this.currency += headshot ? 15 : 10;
    }

    addShot(hit = false) {
        this.stats.shotsFired++;
        if (hit) this.stats.shotsHit++;
    }

    getAccuracy() {
        if (this.stats.shotsFired === 0) return 0;
        return Math.round((this.stats.shotsHit / this.stats.shotsFired) * 100);
    }

    getSettings() {
        return this.settings;
    }

    updateSetting(key, value) {
        if (key in this.settings) {
            this.settings[key] = value;
        }
    }
}

// --- game/Game.js ---

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(this.canvas);
        this.input = new Input();
        this.audio = new AudioSystem();
        this.gameState = new GameState();
        this.ui = new UIManager(this.gameState);

        this.player = new Player(this.renderer.camera, this.renderer.scene);
        this.player.onDamage = (amount, attackerPos) => {
            this.ui.showDamageVignette(amount / 30);
            this.ui.showDamageDirection(attackerPos, this.player.position, this.player.rotation);
            this.cameraShake.shake(amount * 0.003);
            this.audio.play('damage');
        };
        this.weaponSystem = new WeaponSystem(this.gameState);
        this.allySquad = new AllySquad(this.renderer.scene);
        this.zombieManager = new ZombieManager(this.renderer.scene);
        this.level = null;
        this.selectedMap = 'outpost';
        this.waveManager = new WaveManager();
        this.particles = new ParticleSystem(this.renderer.scene);
        this.bulletSystem = new BulletSystem(this.renderer.scene, this.particles);
        this.cameraShake = new CameraShake();

        this.renderer.scene.__gameRef = this;

        this.raycaster = new THREE.Raycaster();
        this.clock = new THREE.Clock();

        this.footstepTimer = 0;
        this.footstepInterval = 0.4;
        this.growlTimer = 0;
        this.growlInterval = 5;

        this.frameCount = 0;
        this.fpsTimer = 0;
        this.currentFPS = 60;

        this.timeScale = 1.0;
        this.timeScaleTarget = 1.0;
        this.slowMotionTimer = 0;

        this.killStreak = 0;
        this.killStreakTimer = 0;
        this.killStreakDecay = 3;

        this.muzzleFlashTimer = 0;

        this.crosshairSpread = 0;
        this.crosshairSpreadTarget = 0;

        this.upgrades = [];
        this.shopOpen = false;
        this._initUpgrades();

        this.combatIntensity = 0;
        this.tensionBase = 0.3;
        this._waveCompleteHandled = false;

        this.gameState._purchaseUpgrade = (index) => this._purchaseUpgrade(index);

        this.embedded = false;
        try { this.embedded = window.self !== window.top; } catch(e) { this.embedded = true; }
        if (/[?&]embed=1(?:&|$)/.test(location.search)) this.embedded = true;

        this._bindEvents();
    }

    _initUpgrades() {
        this.upgrades = [
            { name: 'MEDKIT', desc: 'Restore 50 HP', cost: 50, maxed: false, fn: () => { this.player.heal(50); } },
            { name: 'VITALITY', desc: '+25 Max Health', cost: 100, maxed: false, fn: () => { this.player.maxHealth += 25; this.player.heal(25); }, level: 0, maxLevel: 3 },
            { name: 'ARMOR', desc: 'Reduce damage 10%', cost: 150, maxed: false, fn: () => { this.player.armor = Math.min(0.5, (this.player.armor || 0) + 0.1); }, level: 0, maxLevel: 3 },
            { name: 'AMMO RESERVE', desc: '+40 reserve ammo', cost: 75, maxed: false, fn: () => { for (const w of this.weaponSystem.weapons) w.addReserve(40); }, level: 0, maxLevel: 4 },
            { name: 'SHARPENED', desc: '+15% weapon damage', cost: 125, maxed: false, fn: () => { for (const w of this.weaponSystem.weapons) { w.damage = Math.floor(w.damage * 1.15); } }, level: 0, maxLevel: 3 },
            { name: 'GRENADES', desc: '+2 grenades', cost: 50, maxed: false, fn: () => { this.weaponSystem.addGrenade(); this.weaponSystem.addGrenade(); }, level: 0, maxLevel: 5 },
        ];
    }

    _bindEvents() {
        document.getElementById('btn-select-map').addEventListener('click', () => {
            this.ui.showMenu('map-select-screen');
        });
        document.getElementById('btn-map-start').addEventListener('click', () => this.startGame());
        document.getElementById('btn-map-back').addEventListener('click', () => this.ui.showMenu('main-menu'));
        document.getElementById('btn-controls').addEventListener('click', () => this.ui.showMenu('controls-screen'));
        document.getElementById('btn-settings').addEventListener('click', () => {
            this.ui.showMenu('settings-screen');
            this.ui.updateSettings(this.gameState.settings);
        });
        document.getElementById('btn-controls-back').addEventListener('click', () => this.ui.showMenu('main-menu'));
        document.getElementById('btn-settings-back').addEventListener('click', () => this.ui.showMenu('main-menu'));

        // Map selection cards
        document.querySelectorAll('.map-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedMap = card.dataset.map;
            });
        });
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-restart').addEventListener('click', () => this.restartGame());
        document.getElementById('btn-quit').addEventListener('click', () => this.quitToMenu());
        document.getElementById('btn-retry').addEventListener('click', () => this.restartGame());
        document.getElementById('btn-go-menu').addEventListener('click', () => this.quitToMenu());
        document.getElementById('btn-v-next').addEventListener('click', () => this.restartGame());
        document.getElementById('btn-v-menu').addEventListener('click', () => this.quitToMenu());

        document.getElementById('setting-volume').addEventListener('input', (e) => {
            const val = e.target.value / 100;
            this.gameState.updateSetting('volume', val);
            this.audio.setVolume(val);
        });

        document.getElementById('setting-sensitivity').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.gameState.updateSetting('sensitivity', val);
            this.input.setSensitivity(val);
        });

        document.getElementById('setting-fov').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.gameState.updateSetting('fov', val);
            this.renderer.setFOV(val);
        });

        document.getElementById('setting-fps').addEventListener('change', (e) => {
            this.gameState.updateSetting('showFPS', e.target.checked);
        });

        document.querySelectorAll('.wheel-option').forEach(option => {
            option.addEventListener('click', () => {
                const cmd = option.dataset.command;
                this.allySquad.issueCommand(cmd);
                this.ui.hideSquadWheel();
            });
        });

        this.canvas.addEventListener('click', () => {
            if (this.gameState.state === 'playing' && !this.input.isLocked()) {
                this.input.requestPointerLock(this.canvas);
                this.audio.init();
            }
        });
    }

    async init() {
        this.ui.updateLoading(10, 'BUILDING LEVEL...');
        await this._delay(100);

        this.level = new Level(this.renderer.scene);
        this.level.build();

        this.ui.updateLoading(30, 'INITIALIZING AI...');
        await this._delay(100);

        this.allySquad.init();

        this.ui.updateLoading(50, 'LOADING WEAPONS...');
        await this._delay(100);

        this.ui.updateLoading(70, 'PREPARING ZOMBIES...');
        await this._delay(100);

        this.ui.updateLoading(90, 'FINALIZING...');
        await this._delay(200);

        this.ui.updateLoading(100, 'READY');
        await this._delay(300);

        this.ui.hideLoading();
        this.ui.showMenu('main-menu');
        this.gameState.changeState('menu');

        this._gameLoop();
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _gameLoop() {
        requestAnimationFrame(() => this._gameLoop());

        const rawDt = Math.min(this.clock.getDelta(), 0.05);

        this.frameCount++;
        this.fpsTimer += rawDt;
        if (this.fpsTimer >= 1.0) {
            this.currentFPS = this.frameCount;
            this.frameCount = 0;
            this.fpsTimer = 0;
        }

        if (this.slowMotionTimer > 0) {
            this.slowMotionTimer -= rawDt;
            this.timeScaleTarget = 1.0;
        }
        this.timeScale += (this.timeScaleTarget - this.timeScale) * rawDt * 8;

        const dt = rawDt * this.timeScale;

        switch (this.gameState.state) {
            case 'playing':
                this._updatePlaying(dt);
                break;
            case 'paused':
                break;
        }

        this.renderer.render();
        this.input.update();
    }

    _updatePlaying(dt) {
        if (this.gameState.paused) return;

        this._updateShopLogic(dt);

        this._handleInput(dt);

        this.player.update(dt, this.input);
        this.weaponSystem.update(dt);

        const allTargets = [this.player, ...this.allySquad.getAliveAllies()];
        this.zombieManager.update(dt, allTargets);
        this.allySquad.update(dt, this.player.position, this.zombieManager.getAliveZombies(), this.gameState);

        this.waveManager.update(dt, this.zombieManager, this.level.getSpawnPoints());
        this._handleWaveEvents();

        const pickup = this.level.updatePickups(dt, this.player);
        if (pickup) this._handlePickup(pickup);

        this.particles.update(dt);
        this.bulletSystem.update(dt, this.level.getObjects());
        this.cameraShake.update(dt);
        this.cameraShake.applyTo(this.renderer.camera);

        this._updateFootsteps(dt);
        this._updateAmbientGrowls(dt);

        if (this.killStreakTimer > 0) {
            this.killStreakTimer -= dt;
            if (this.killStreakTimer <= 0) {
                this.killStreak = 0;
            }
        }

        if (this.muzzleFlashTimer > 0) {
            this.muzzleFlashTimer -= dt;
        }

        this.crosshairSpreadTarget = this.muzzleFlashTimer > 0 ? 0.8 : 0;
        this.crosshairSpreadTarget = this.player.aiming ? this.crosshairSpreadTarget * 0.3 : this.crosshairSpreadTarget;
        this.crosshairSpread += (this.crosshairSpreadTarget - this.crosshairSpread) * dt * 12;

        const nearbyZombies = this.zombieManager.getAliveZombies().filter(z =>
            z.position.distanceTo(this.player.position) < 15
        ).length;
        const targetIntensity = nearbyZombies > 5 ? 1 : nearbyZombies > 3 ? 0.7 : nearbyZombies > 1 ? 0.4 : 0.1;
        this.combatIntensity += (targetIntensity - this.combatIntensity) * dt * 3;
        if (this.audio.ctx && this.audio.ambientGain) {
            this.audio.ambientGain.gain.value = this.tensionBase + this.combatIntensity * 0.3;
        }

        if ((!this.player.alive || this.player.downed) && this.gameState.state === 'playing') {
            this._gameOver();
        }

        if (this.waveManager.isGameComplete() && this.gameState.state === 'playing') {
            this._victory();
        }

        this.ui.updateHUD(this.player, this.weaponSystem.getCurrent(), this.allySquad.getAllAllies(), this.waveManager, this.currentFPS, this.weaponSystem.currentIndex, this.crosshairSpread);

        // Update damage numbers and low health pulse
        this.ui.updateDamageNumbers(dt);
        this.ui.showLowHealthPulse((this.player.health / this.player.maxHealth) * 100);
    }

    _handleInput(dt) {
        if (this.input.isKeyJustPressed('Escape')) {
            if (this.shopOpen) {
                this._closeShop();
                return;
            }
            this.togglePause();
            return;
        }

        if (!this.input.isLocked()) return;

        if (this.shopOpen) return;

        const weapon = this.weaponSystem.getCurrent();
        if (weapon?.shouldFire(this.input.isMouseDown(0), this.input.isMouseJustPressed(0))) {
            this._fireWeapon();
        }

        if (this.input.isKeyJustPressed('KeyR')) {
            if (this.weaponSystem.reload()) {
                this.audio.play('reload');
            }
        }

        if (this.input.isKeyJustPressed('Digit1')) { this.weaponSystem.switchTo(0); this.player.switchViewmodel(0); this.player.playViewmodelSwap(); }
        if (this.input.isKeyJustPressed('Digit2')) { this.weaponSystem.switchTo(1); this.player.switchViewmodel(1); this.player.playViewmodelSwap(); }
        if (this.input.isKeyJustPressed('Digit3')) { this.weaponSystem.switchTo(2); this.player.switchViewmodel(2); this.player.playViewmodelSwap(); }

        if (this.input.isKeyJustPressed('KeyG')) {
            this._throwGrenade();
        }

        if (this.input.isKeyJustPressed('KeyV')) {
            this._meleeShove();
        }

        if (this.input.isKeyJustPressed('KeyQ')) {
            this.allySquad.issueCommand('follow');
            this.audio.play('allyCallout');
        }
        if (this.input.isKeyJustPressed('KeyE')) {
            if (!this._handleRevive()) {
                this.allySquad.issueCommand('hold');
            }
            this.audio.play('allyCallout');
        }
        if (this.input.isKeyJustPressed('KeyF')) {
            this.allySquad.issueCommand('focus');
            this.audio.play('allyCallout');
        }
        if (this.input.isKeyJustPressed('KeyX')) {
            this.allySquad.issueCommand('regroup');
            this.audio.play('allyCallout');
        }

        if (this.input.isKeyJustPressed('KeyT')) {
            this.player.toggleFlashlight();
        }

        if (this.input.isKeyJustPressed('Tab')) {
            this.ui.showSquadWheel();
        }
        if (!this.input.isKeyDown('Tab') && this.ui.get('squad-wheel') && !this.ui.get('squad-wheel').classList.contains('hidden')) {
            this.ui.hideSquadWheel();
        }
    }

            _fireWeapon() {
        const weapon = this.weaponSystem.getCurrent();
        if (!weapon || weapon.reloading) return;
        const result = this.weaponSystem.fire(this.player.aiming);
        if (!result) {
            if (weapon.currentAmmo <= 0) { this.audio.play('empty'); this.weaponSystem.reload(); this.audio.play('reload'); }
            return;
        }
        this.gameState.addShot();
        this.audio.play(weapon.name.includes('870') ? 'shotgunShot' : weapon.name.includes('1911') ? 'pistolShot' : 'rifleShot');
        this.muzzleFlashTimer = 0.05;
        this.player.applyRecoil(result.recoilX, result.recoilY);
        this.cameraShake.shake(0.03 + result.recoilY * 0.5);
        const recoilAmount = weapon.name.includes('870') ? 3.0 : weapon.name.includes('1911') ? 1.5 : 1.2;
        this.player.applyViewmodelRecoil(recoilAmount);
        const lookDir = this.player.getLookDirection();
        const cameraPos = this.renderer.camera.position;
        const origin = cameraPos.clone().add(lookDir.clone().multiplyScalar(1.0));
        const right = new THREE.Vector3().crossVectors(lookDir, new THREE.Vector3(0, 1, 0)).normalize();
        const barrelPos = cameraPos.clone().add(right.clone().multiplyScalar(0.3)).add(lookDir.clone().multiplyScalar(0.1));
        const tracerColor = weapon.name.includes('870') ? 0xff8844 : weapon.name.includes('1911') ? 0xffcc44 : 0xffdd66;
        const bulletSpeed = weapon.name.includes('870') ? 180 : weapon.name.includes('1911') ? 160 : 200;
        for (const pellet of result.pellets) {
            const dir = lookDir.clone();
            dir.x += pellet.spreadX;
            dir.y += pellet.spreadY;
            dir.normalize();
            this.bulletSystem.fire(origin.clone(), dir, bulletSpeed, result.range, tracerColor, barrelPos);
            let hitDist = result.range;
            let hitZombie = null;
            let hitPoint = null;
            let hitIsHead = false;
            for (const zombie of this.zombieManager.getAliveZombies()) {
                const s = zombie.scale || 1;
                const bodyCenter = zombie.position.clone();
                bodyCenter.y = 1.0 * s;
                const bodyRadius = 0.5 * s;
                const headCenter = zombie.position.clone();
                headCenter.y = 1.8 * s;
                const headRadius = 0.28 * s;
                const bodyHit = this._raySphereIntersect(origin, dir, bodyCenter, bodyRadius);
                const headHit = this._raySphereIntersect(origin, dir, headCenter, headRadius);
                let closestT = Infinity;
                let isHead = false;
                if (bodyHit !== null && bodyHit < closestT) { closestT = bodyHit; isHead = false; }
                if (headHit !== null && headHit < closestT) { closestT = headHit; isHead = true; }
                if (closestT < hitDist && closestT > 0) { hitDist = closestT; hitZombie = zombie; hitPoint = origin.clone().add(dir.clone().multiplyScalar(closestT)); hitIsHead = isHead; }
            }
            this.raycaster.set(origin, dir);
            this.raycaster.far = result.range;
            this.raycaster.near = 0;
            const wallHits = this.raycaster.intersectObjects(this.level.getObjects(), true);
            let wallHitDist = result.range;
            if (wallHits.length > 0) wallHitDist = wallHits[0].distance;
            if (hitZombie && hitDist < wallHitDist) {
                const isHeadshot = hitIsHead;
                hitZombie.takeDamage(result.damage, this.player.position, isHeadshot);
                this.gameState.addShot(true);
                this.ui.showHitMarker(isHeadshot);
                this.audio.play(isHeadshot ? 'headshot' : 'hit');
                this.particles.emitBlood(hitPoint, dir.clone().negate());
                const dmgAmount = isHeadshot ? result.damage * hitZombie.headshotMultiplier * (1 - hitZombie.armor) : result.damage * (1 - hitZombie.armor);
                this.ui.showDamageNumber(hitPoint.clone(), dmgAmount, isHeadshot, this.renderer.camera, this.renderer.renderer.domElement);
                if (!hitZombie.alive) {
                    this.gameState.addKill(isHeadshot);
                    this.audio.play('zombieDeath');
                    this.killStreak++;
                    this.killStreakTimer = this.killStreakDecay;
                    if (isHeadshot) { this.slowMotionTimer = 0.15; this.cameraShake.shake(0.08); }
                    if (this.killStreak >= 5 && this.killStreak % 5 === 0) { this.ui.showStreakAnnounce(this.killStreak); this.slowMotionTimer = 0.25; }
                    this.ui.addKillFeed(this.weaponSystem.getCurrent().name + ' > ' + hitZombie.type.toUpperCase() + (isHeadshot ? ' (HEADSHOT)' : ''));
                } else if (isHeadshot) { this.cameraShake.shake(0.05); }
            } else if (wallHits.length > 0) { this.particles.emitSparks(wallHits[0].point); }
        }
    }
    _raySphereIntersect(origin, dir, center, radius) {
        const oc = origin.clone().sub(center);
        const a = dir.dot(dir);
        const b = 2 * oc.dot(dir);
        const c = oc.dot(oc) - radius * radius;
        const disc = b * b - 4 * a * c;
        if (disc < 0) return null;
        const t = (-b - Math.sqrt(disc)) / (2 * a);
        return t > 0.01 ? t : null;
    }

    

    

    _throwGrenade() {
        if (!this.weaponSystem.throwGrenade()) return;

        const forward = this.player.getLookDirection();
        const pos = this.renderer.camera.position.clone().add(forward.clone().multiplyScalar(2));

        this.particles.emitExplosion(pos);

        const targets = [this.player, ...this.allySquad.getAliveAllies(), ...this.zombieManager.getAliveZombies()];
        for (const target of targets) {
            const dist = pos.distanceTo(target.position);
            if (dist < 6) {
                const falloff = 1 - (dist / 6);
                const dmg = target === this.player ? 40 * falloff : 80 * falloff;
                target.takeDamage(dmg, pos);
            }
        }

        this.audio.play('grenade');
        this.cameraShake.shake(0.15);
    }

    _meleeShove() {
        this.audio.play('melee');

        for (const zombie of this.zombieManager.getAliveZombies()) {
            const dist = this.player.position.distanceTo(zombie.position);
            if (dist < 2.5) {
                const pushDir = zombie.position.clone().sub(this.player.position).normalize();
                zombie.position.add(pushDir.multiplyScalar(2));
                zombie.takeDamage(15, this.player.position, false);
            }
        }
    }

    _handleRevive() {
        for (const ally of this.allySquad.getDownedAllies()) {
            const dist = this.player.position.distanceTo(ally.position);
            if (dist < 2.5) {
                ally.revive();
                this.gameState.stats.revives++;
                this.audio.play('pickup');
                this.ui.addKillFeed(`Revived ${ally.name}`);
                return true;
            }
        }
        return false;
    }

    _handlePickup(type) {
        switch (type) {
            case 'ammo':
                this.weaponSystem.getCurrent().addReserve(30);
                this.audio.play('pickup');
                break;
            case 'health':
                this.player.heal(25);
                this.audio.play('pickup');
                break;
            case 'grenade':
                this.weaponSystem.addGrenade();
                this.audio.play('pickup');
                break;
        }
    }

    _handleWaveEvents() {
        if (this.waveManager.isWaveComplete() && !this._waveCompleteHandled) {
            this._waveCompleteHandled = true;
            this.gameState.stats.wavesCompleted = this.waveManager.currentWave;
            this.audio.play('waveEnd');
            this.ui.addKillFeed(`Wave ${this.waveManager.currentWave} complete!`);
        }

        if (this.waveManager.shouldStartNext()) {
            this._waveCompleteHandled = false;
            const config = this.waveManager.startWave(this.zombieManager, this.level.getSpawnPoints());
            this.audio.play('waveStart');
            this.ui.showWaveAnnounce(this.waveManager.currentWave);
        }
    }

    _updateFootsteps(dt) {
        if (!this.player.isMoving() || !this.player.onGround) return;
        this.footstepTimer -= dt;
        if (this.footstepTimer <= 0) {
            this.footstepTimer = this.player.sprinting ? 0.3 : this.footstepInterval;
            this.audio.play('footstep', 0.3);
        }
    }

    _updateAmbientGrowls(dt) {
        this.growlTimer -= dt;
        if (this.growlTimer <= 0) {
            this.growlTimer = this.growlInterval + Math.random() * 5;
            const zombies = this.zombieManager.getAliveZombies();
            if (zombies.length > 0) {
                const zombie = zombies[MathUtils.randomInt(0, zombies.length - 1)];
                this.audio.playPositional('zombieGrowl', zombie.position, this.player.position, 0.3);
            }
        }
    }

    _buildSelectedMap() {
        // Clear ALL scene children except the camera
        const toRemove = [];
        this.renderer.scene.traverse(child => {
            if (child !== this.renderer.scene && child !== this.renderer.camera && child.parent === this.renderer.scene) {
                toRemove.push(child);
            }
        });
        for (const obj of toRemove) {
            this.renderer.scene.remove(obj);
        }

        // Re-add the camera (it was removed as a child)
        if (!this.renderer.camera.parent) {
            this.renderer.scene.add(this.renderer.camera);
        }

        // Build the selected map
        if (this.selectedMap === 'city') {
            this.level = new CityLevel(this.renderer.scene);
        } else {
            this.level = new Level(this.renderer.scene);
        }
        this.level.build();
    }

    startGame() {
        this.gameState.reset();
        this.gameState.changeState('playing');

        this.ui.hideAll();
        this.ui.show('hud');

        // Clean up existing entities before rebuilding scene
        this.zombieManager.clear();
        this.particles.clear();
        this.bulletSystem.clear();

        // Rebuild the selected map (clears scene and builds new geometry)
        this._buildSelectedMap();

        // Reinitialize ally squad (meshes were removed from scene)
        this.allySquad = new AllySquad(this.renderer.scene);
        this.allySquad.init();

        this.player.reset();
        this.weaponSystem.reset();
        this.waveManager.reset();
        this.cameraShake.reset();
        this._initUpgrades();
        this.shopOpen = false;
        this._waveCompleteHandled = false;

        this.renderer.camera.position.copy(this.player.position);
        this.renderer.setFOV(this.gameState.settings.fov);
        this.input.setSensitivity(this.gameState.settings.sensitivity);
        this.audio.setVolume(this.gameState.settings.volume);

        this.audio.init();
        this.audio.startAmbient();

        this.input.requestPointerLock(this.canvas);

        // Hide embed overlay on game start
        var embedOverlay = document.getElementById('embed-overlay');
        if (embedOverlay) embedOverlay.style.display = 'none';

        this.waveManager.startWave(this.zombieManager, this.level.getSpawnPoints());
        this.ui.showWaveAnnounce(1, 'SURVIVE THE HORDE');
    }

    restartGame() {
        this.ui.hideAll();
        this.startGame();
    }

    togglePause() {
        if (this.gameState.state !== 'playing' && this.gameState.state !== 'paused') return;

        this.gameState.paused = !this.gameState.paused;

        if (this.gameState.paused) {
            this.gameState.changeState('paused');
            this.ui.show('pause-menu');
            this.input.exitPointerLock();
        } else {
            this.gameState.changeState('playing');
            this.ui.hide('pause-menu');
            this.input.requestPointerLock(this.canvas);
        }
    }

    quitToMenu() {
        this.gameState.changeState('menu');
        this.ui.hideAll();
        this.ui.showMenu('main-menu');
        this.input.exitPointerLock();
        this.zombieManager.clear();
        this.particles.clear();
        this.bulletSystem.clear();
    }

    _gameOver() {
        if (this.player.downed) this.player.die();
        this.gameState.changeState('gameover');
        this.input.exitPointerLock();
        this.ui.hide('hud');
        this.ui.showGameOver({
            wavesCompleted: this.gameState.stats.wavesCompleted,
            kills: this.gameState.stats.kills,
            headshots: this.gameState.stats.headshots,
            accuracy: this.gameState.getAccuracy()
        });
    }

    _victory() {
        this.gameState.changeState('victory');
        this.input.exitPointerLock();
        this.ui.hide('hud');
        this.ui.showVictory({
            wavesCompleted: this.gameState.stats.wavesCompleted,
            kills: this.gameState.stats.kills,
            headshots: this.gameState.stats.headshots,
            score: this.gameState.stats.score
        });
    }

    _openShop() {
        this.shopOpen = true;
        this.input.exitPointerLock();
        this._updateShopUI();
    }

    _closeShop() {
        this.shopOpen = false;
        this.ui.hideShop();
        this.ui.hide('interaction-prompt');
        this.ui.show('hud');
        if (this.gameState.state === 'playing') {
            this.input.requestPointerLock(this.canvas);
        }
    }

    _updateShopLogic(dt) {
        if (!this.shopOpen && this.waveManager.isBetween()) {
            this.ui.showInteraction('Press B - Supply Depot');
            if (this.input.isKeyJustPressed('KeyB')) {
                this._openShop();
            }
        } else if (!this.shopOpen) {
            this.ui.hide('interaction-prompt');
        }
        if (this.shopOpen) {
            if (!this.waveManager.isBetween()) {
                this._closeShop();
            } else if (this.input.isKeyJustPressed('KeyB')) {
                this._closeShop();
            }
        }
    }

    _updateShopUI() {
        this.ui.hide('hud');
        this.ui.showShop(this.gameState.currency, this._getUpgradeStates());
    }

    _getUpgradeStates() {
        return this.upgrades.map(u => ({
            name: u.name,
            desc: u.desc,
            cost: u.cost * ((u.level || 0) + 1),
            maxed: u.level !== undefined && u.level >= u.maxLevel
        }));
    }

    _purchaseUpgrade(index) {
        const upgrade = this.upgrades[index];
        if (!upgrade) return;
        const cost = upgrade.cost * ((upgrade.level || 0) + 1);
        if (this.gameState.currency < cost) return;
        if (upgrade.maxed) return;
        if (upgrade.level !== undefined && upgrade.level >= upgrade.maxLevel) return;

        this.gameState.currency -= cost;
        upgrade.fn();
        upgrade.level = (upgrade.level || 0) + 1;
        if (upgrade.level >= upgrade.maxLevel) upgrade.maxed = true;

        this.audio.play('pickup');
        this._updateShopUI();
    }
}

// --- main.js init ---

async function initGame() {
    try {
        if (!window.THREE) { throw new Error("Three.js not loaded"); }
        const game = new Game();
        await game.init();
        window.__deadZoneGame = game;
    } catch (err) {
        console.error("Game initialization failed:", err);
        var loadingText = document.getElementById("loading-text");
        if (loadingText) { loadingText.textContent = "ERROR: " + err.message; loadingText.style.color = "#ff4444"; }
        var loadingBar = document.getElementById("loading-bar");
        if (loadingBar) { loadingBar.style.background = "#ff4444"; }
    }
}

initGame();
