import { Zombie, ZOMBIE_STATES } from './Zombie.js';
import { MathUtils } from '../utils/MathUtils.js';

const THREE = window.THREE;

export class CrawlerZombie extends Zombie {
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
