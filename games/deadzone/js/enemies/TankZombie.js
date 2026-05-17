import { Zombie } from './Zombie.js';

const THREE = window.THREE;

export class TankZombie extends Zombie {
    constructor(x, z, scene) {
        super({
            type: 'tank',
            health: 900,
            speed: 1.4,
            damage: 45,
            attackRange: 2.2,
            attackCooldown: 1.8,
            detectionRange: 30,
            staggerThreshold: 150,
            headshotMultiplier: 1.8,
            scoreValue: 300,
            armor: 0.25,
            bodyColor: 0x3d2b1f,
            skinColor: 0x5a7a5a,
            eyeColor: 0xff4400,
            scale: 1.5,
            x, z
        }, scene);
    }

    _createMesh() {
        const group = super._createMesh();
        const s = this.scale;

        const armorMat = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.5,
            metalness: 0.4,
        });

        // Shoulder armor plates
        const shoulderPlateGeo = new THREE.BoxGeometry(0.25 * s, 0.15 * s, 0.3 * s);
        const leftShoulderPlate = new THREE.Mesh(shoulderPlateGeo, armorMat);
        leftShoulderPlate.position.set(-0.42 * s, 1.5 * s, 0);
        leftShoulderPlate.castShadow = true;
        group.add(leftShoulderPlate);

        const rightShoulderPlate = new THREE.Mesh(shoulderPlateGeo, armorMat.clone());
        rightShoulderPlate.position.set(0.42 * s, 1.5 * s, 0);
        rightShoulderPlate.castShadow = true;
        group.add(rightShoulderPlate);

        // Chest armor plate
        const chestPlateGeo = new THREE.BoxGeometry(0.5 * s, 0.35 * s, 0.06 * s);
        const chestPlate = new THREE.Mesh(chestPlateGeo, armorMat.clone());
        chestPlate.position.set(0, 1.3 * s, 0.17 * s);
        chestPlate.castShadow = true;
        group.add(chestPlate);

        // Back hump / mutation
        const humpGeo = new THREE.SphereGeometry(0.25 * s, 8, 6);
        const humpMat = new THREE.MeshStandardMaterial({
            color: 0x6a5a4a,
            roughness: 0.7,
        });
        const hump = new THREE.Mesh(humpGeo, humpMat);
        hump.position.set(0, 1.55 * s, -0.2 * s);
        hump.scale.set(1, 0.8, 1);
        group.add(hump);

        // Thick metal chain around neck
        const chainGeo = new THREE.TorusGeometry(0.18 * s, 0.02 * s, 6, 12);
        const chainMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.3,
            metalness: 0.7,
        });
        const chain = new THREE.Mesh(chainGeo, chainMat);
        chain.position.set(0, 1.6 * s, 0);
        chain.rotation.x = Math.PI / 2;
        group.add(chain);

        // Bolts / studs on armor
        const boltGeo = new THREE.SphereGeometry(0.025 * s, 6, 4);
        const boltMat = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            metalness: 0.6,
            roughness: 0.3,
        });
        const boltPositions = [
            [-0.2 * s, 1.42 * s, 0.2 * s],
            [0.2 * s, 1.42 * s, 0.2 * s],
            [0, 1.2 * s, 0.2 * s],
            [-0.42 * s, 1.55 * s, 0.12 * s],
            [0.42 * s, 1.55 * s, 0.12 * s],
        ];
        for (const pos of boltPositions) {
            const bolt = new THREE.Mesh(boltGeo, boltMat);
            bolt.position.set(...pos);
            group.add(bolt);
        }

        // Mutated extra fingers / growths on hands
        const growthGeo = new THREE.ConeGeometry(0.04 * s, 0.12 * s, 5);
        const growthMat = new THREE.MeshStandardMaterial({
            color: 0x7a6a5a,
            roughness: 0.8,
        });
        const leftGrowth = new THREE.Mesh(growthGeo, growthMat);
        leftGrowth.position.set(-0.42 * s, 0.8 * s, -0.18 * s);
        leftGrowth.rotation.x = 0.5;
        group.add(leftGrowth);

        const rightGrowth = new THREE.Mesh(growthGeo, growthMat.clone());
        rightGrowth.position.set(0.42 * s, 0.8 * s, -0.18 * s);
        rightGrowth.rotation.x = 0.5;
        group.add(rightGrowth);

        // Head cage / helmet fragment
        const helmetGeo = new THREE.SphereGeometry(0.22 * s, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const helmetMat = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.4,
            metalness: 0.5,
        });
        const helmet = new THREE.Mesh(helmetGeo, helmetMat);
        helmet.position.set(0, 1.82 * s, 0);
        group.add(helmet);

        // Faint orange glow so the massive tank is visible in the dark
        const tankGlow = new THREE.PointLight(0xff4400, 0.35, 10, 2);
        tankGlow.position.set(0, 1.6 * s, 0);
        group.add(tankGlow);

        return group;
    }
}
