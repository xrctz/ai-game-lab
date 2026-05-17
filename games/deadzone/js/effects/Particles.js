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

export { ParticleSystem };
