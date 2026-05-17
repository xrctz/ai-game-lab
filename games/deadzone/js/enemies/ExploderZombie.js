import { Zombie, ZOMBIE_STATES } from './Zombie.js';

const THREE = window.THREE;

export class ExploderZombie extends Zombie {
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
