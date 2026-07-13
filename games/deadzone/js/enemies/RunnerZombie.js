import { Zombie } from './Zombie.js';

const THREE = window.THREE;

export class RunnerZombie extends Zombie {
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

        this.attackWindup = 0.12 + Math.random() * 0.28;
        this.attackCooldown = 0.65 + Math.random() * 0.4;
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
