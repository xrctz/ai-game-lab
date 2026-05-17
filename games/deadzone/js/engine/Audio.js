export class AudioSystem {
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
