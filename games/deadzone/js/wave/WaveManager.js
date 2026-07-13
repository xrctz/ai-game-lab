import { MathUtils } from '../utils/MathUtils.js';

const WAVE_STATES = {
    WAITING: 'waiting',
    ACTIVE: 'active',
    BETWEEN: 'between',
    COMPLETE: 'complete'
};

export class WaveManager {
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
        const base = 8 + waveNum * 6;
        const t = MathUtils.clamp(waveNum / this.maxWaves, 0, 1);

        const runnerCount = Math.max(4, Math.floor(base * (0.48 - t * 0.12)));
        const crawlerCount = waveNum >= 1
            ? Math.max(waveNum === 1 ? 2 : 0, Math.floor(base * (waveNum >= 4 ? 0.22 : 0.14)))
            : 0;
        const spitterCount = waveNum >= 2 ? Math.floor(base * (0.07 + waveNum * 0.012)) : 0;
        const tankCount = waveNum >= 3 ? Math.max(1, Math.floor((waveNum - 2) * 0.55 + t * 2)) : 0;
        const exploderCount = waveNum >= 4 ? Math.max(0, Math.floor((waveNum - 3) * 0.55)) : 0;

        return {
            wave: waveNum,
            types: [
                { type: 'runner', count: runnerCount },
                { type: 'crawler', count: crawlerCount },
                { type: 'spitter', count: spitterCount },
                { type: 'tank', count: tankCount },
                { type: 'exploder', count: exploderCount }
            ].filter(t => t.count > 0),
            spawnDelay: Math.max(0.12, 0.75 - waveNum * 0.035),
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
                const spawnPos = zombieManager.pickSpawnPosition(spawnPoints);
                zombieManager.spawn(type, spawnPos.x, spawnPos.z);
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

export { WAVE_STATES };
