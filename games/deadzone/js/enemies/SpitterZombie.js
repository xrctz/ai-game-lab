const THREE = window.THREE;
import { Zombie, ZOMBIE_STATES } from './Zombie.js';

export class SpitterZombie extends Zombie {
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
