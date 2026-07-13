const THREE = window.THREE;
import { ObjectPool } from '../utils/ObjectPool.js';

export class ParticleSystem {
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
            150
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
        const dir = direction ? direction.clone().normalize() : new THREE.Vector3(0, 0, 1);
        this.emit({
            position,
            velocity: dir.clone().multiplyScalar(4),
            count: 10,
            spread: 2.5,
            upForce: 2.5,
            life: 0.55,
            size: 0.05,
            color: 0xcc1111
        });
        this.emit({
            position: position.clone().add(new THREE.Vector3(0, 0.05, 0)),
            velocity: dir.clone().multiplyScalar(2),
            count: 5,
            spread: 4,
            upForce: 1.5,
            life: 0.35,
            size: 0.035,
            color: 0x660000
        });
    }

    emitHitImpact(position, direction) {
        const dir = direction ? direction.clone().normalize() : new THREE.Vector3();
        this.emit({
            position,
            velocity: dir.clone().multiplyScalar(3),
            count: 4,
            spread: 1.5,
            upForce: 1.2,
            life: 0.25,
            size: 0.04,
            color: 0xff3333
        });
        this.emit({
            position,
            count: 3,
            spread: 2,
            upForce: 0.8,
            life: 0.2,
            size: 0.025,
            color: 0xffaa44,
            gravity: false
        });
    }

    emitDeathBurst(position, type = 'runner') {
        const isHeavy = type === 'tank' || type === 'exploder';
        const count = isHeavy ? 28 : 18;
        this.emit({
            position,
            count,
            spread: isHeavy ? 6 : 4.5,
            upForce: isHeavy ? 4 : 3,
            life: 0.7,
            size: isHeavy ? 0.07 : 0.055,
            color: 0xbb0000
        });
        this.emit({
            position: position.clone().add(new THREE.Vector3(0, 0.15, 0)),
            count: isHeavy ? 12 : 8,
            spread: 3,
            upForce: 2,
            life: 0.9,
            size: 0.04,
            color: 0x331111,
            gravity: true
        });
        if (type === 'exploder') {
            this.emit({
                position,
                count: 10,
                spread: 5,
                upForce: 5,
                life: 0.5,
                size: 0.06,
                color: 0xff6600,
                gravity: false
            });
        }
    }

    emitSparks(position) {
        this.emit({
            position,
            count: 6,
            spread: 5,
            upForce: 4,
            life: 0.35,
            size: 0.035,
            color: 0xffcc00,
            gravity: true
        });
        this.emit({
            position,
            count: 3,
            spread: 2,
            upForce: 1,
            life: 0.2,
            size: 0.02,
            color: 0xffffff,
            gravity: false
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

export { ParticleSystem };
