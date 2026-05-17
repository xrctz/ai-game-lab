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
