const THREE = window.THREE;
import { RunnerZombie } from './RunnerZombie.js';
import { TankZombie } from './TankZombie.js';
import { SpitterZombie } from './SpitterZombie.js';
import { CrawlerZombie } from './CrawlerZombie.js';
import { ExploderZombie } from './ExploderZombie.js';
import { MathUtils } from '../utils/MathUtils.js';

export class ZombieManager {
    constructor(scene) {
        this.scene = scene;
        this.zombies = [];
        this.maxZombies = 80;
        this._recentSpawns = [];
        this._maxRecentSpawns = 6;
    }

    pickSpawnPosition(spawnPoints) {
        if (!spawnPoints || spawnPoints.length === 0) {
            const offset = MathUtils.randomPointInCircle(8);
            return { x: offset.x, z: offset.z };
        }

        const alive = this.zombies.filter(z => z.alive);
        let bestPoint = spawnPoints[0];
        let bestScore = -Infinity;

        const shuffled = spawnPoints.slice().sort(() => Math.random() - 0.5);
        for (const point of shuffled) {
            let score = MathUtils.randomRange(0, 2);

            for (const recent of this._recentSpawns) {
                const dist = MathUtils.distance2D(point.x, point.z, recent.x, recent.z);
                if (dist < 4) score -= (4 - dist) * 3;
            }

            for (const zombie of alive) {
                const dist = MathUtils.distance2D(point.x, point.z, zombie.position.x, zombie.position.z);
                if (dist < 3) score -= (3 - dist) * 2;
            }

            if (score > bestScore) {
                bestScore = score;
                bestPoint = point;
            }
        }

        const offset = MathUtils.randomPointInCircle(5 + Math.random() * 3);
        const pos = { x: bestPoint.x + offset.x, z: bestPoint.z + offset.z };

        this._recentSpawns.push({ x: pos.x, z: pos.z });
        if (this._recentSpawns.length > this._maxRecentSpawns) {
            this._recentSpawns.shift();
        }

        return pos;
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
                const pos = this.pickSpawnPosition(spawnPoints);
                const zombie = this.spawn(entry.type, pos.x, pos.z);
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
        this._recentSpawns = [];
    }
}
