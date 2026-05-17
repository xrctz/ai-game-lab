const THREE = window.THREE;

export class Level {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.spawnPoints = [];
        this.pickups = [];
        this.coverPoints = [];
        this.bounds = { minX: -50, maxX: 50, minZ: -50, maxZ: 50 };
    }

    build() {
        this._createGround();
        this._createWalls();
        this._createBuildings();
        this._createProps();
        this._createLighting();
        this._createPickups();
        this._defineSpawnPoints();
    }

    _createGround() {
        const groundGeo = new THREE.PlaneGeometry(120, 120, 20, 20);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.9,
            metalness: 0.1
        });

        const positions = groundGeo.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getY(i);
            positions.setZ(i, (Math.random() - 0.5) * 0.15);
        }
        groundGeo.computeVertexNormals();

        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const roadGeo = new THREE.PlaneGeometry(8, 100);
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.y = 0.01;
        this.scene.add(road);

        const road2 = road.clone();
        road2.rotation.z = Math.PI / 2;
        this.scene.add(road2);
    }

    _createWalls() {
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.8,
            metalness: 0.2
        });

        const wallConfigs = [
            { x: 0, z: -38, w: 80, h: 4, d: 1 },
            { x: 0, z: 38, w: 80, h: 4, d: 1 },
            { x: -38, z: 0, w: 1, h: 4, d: 80 },
            { x: 38, z: 0, w: 1, h: 4, d: 80 }
        ];

        for (const cfg of wallConfigs) {
            const geo = new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d);
            const wall = new THREE.Mesh(geo, wallMat);
            wall.position.set(cfg.x, cfg.h / 2, cfg.z);
            wall.castShadow = true;
            wall.receiveShadow = true;
            this.scene.add(wall);
            this.objects.push(wall);
        }
    }

    _createBuildings() {
        const buildingMat = new THREE.MeshStandardMaterial({
            color: 0x3a3a3a,
            roughness: 0.85,
            metalness: 0.15
        });

        const darkMat = new THREE.MeshStandardMaterial({
            color: 0x252525,
            roughness: 0.9,
            metalness: 0.1
        });

        const buildings = [
            { x: -20, z: -20, w: 12, h: 8, d: 10 },
            { x: -20, z: 15, w: 10, h: 6, d: 12 },
            { x: 22, z: -18, w: 14, h: 10, d: 10 },
            { x: 25, z: 20, w: 10, h: 7, d: 8 },
            { x: -15, z: -35, w: 8, h: 5, d: 6 },
            { x: 15, z: 35, w: 10, h: 6, d: 8 },
            { x: -35, z: 5, w: 6, h: 4, d: 12 },
            { x: 35, z: -5, w: 8, h: 5, d: 10 },
            { x: 0, z: -30, w: 6, h: 3, d: 6 },
            { x: -8, z: 30, w: 8, h: 4, d: 6 },
        ];

        for (const b of buildings) {
            const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
            const building = new THREE.Mesh(geo, Math.random() > 0.5 ? buildingMat : darkMat);
            building.position.set(b.x, b.h / 2, b.z);
            building.castShadow = true;
            building.receiveShadow = true;
            this.scene.add(building);
            this.objects.push(building);

            if (Math.random() > 0.4) {
                const windowGeo = new THREE.PlaneGeometry(b.w * 0.8, b.h * 0.15);
                const windowMat = new THREE.MeshStandardMaterial({
                    color: 0x1a1a2e,
                    emissive: 0x0a0a15,
                    emissiveIntensity: 0.3,
                    roughness: 0.5
                });

                const window1 = new THREE.Mesh(windowGeo, windowMat);
                window1.position.set(b.x, b.h * 0.7, b.z - b.d / 2 - 0.01);
                this.scene.add(window1);

                if (b.w > 6) {
                    const window2 = window1.clone();
                    window2.position.z = b.z + b.d / 2 + 0.01;
                    this.scene.add(window2);
                }
            }
        }
    }

    _createProps() {
        const concreteMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.95 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.7, metalness: 0.6 });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });

        const barriers = [
            { x: 8, z: -5, ry: 0 },
            { x: -8, z: 5, ry: 0.3 },
            { x: 5, z: 10, ry: -0.2 },
            { x: -5, z: -10, ry: 0.5 },
            { x: 12, z: 0, ry: 0.1 },
            { x: -12, z: 0, ry: -0.1 },
            { x: 0, z: 8, ry: Math.PI / 2 },
            { x: 0, z: -8, ry: Math.PI / 2 },
        ];

        for (const b of barriers) {
            const geo = new THREE.BoxGeometry(3, 1.0, 0.6);
            const barrier = new THREE.Mesh(geo, concreteMat);
            barrier.position.set(b.x, 0.5, b.z);
            barrier.rotation.y = b.ry;
            barrier.castShadow = true;
            barrier.receiveShadow = true;
            this.scene.add(barrier);
            this.objects.push(barrier);
            this.coverPoints.push(new THREE.Vector3(b.x, 0, b.z));
        }

        const barrelPositions = [
            { x: 15, z: -12 }, { x: -15, z: 12 }, { x: 10, z: 15 },
            { x: -10, z: -15 }, { x: 20, z: 5 }, { x: -20, z: -5 },
        ];

        for (const pos of barrelPositions) {
            const isExplosive = Math.random() > 0.6;
            const geo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8);
            const mat = isExplosive ?
                new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.7 }) :
                metalMat;
            const barrel = new THREE.Mesh(geo, mat);
            barrel.position.set(pos.x, 0.6, pos.z);
            barrel.castShadow = true;
            this.scene.add(barrel);
            this.objects.push(barrel);

            if (isExplosive) {
                barrel.userData.explosive = true;
                barrel.userData.health = 30;
            }
        }

        const cratePositions = [
            { x: -6, z: -3 }, { x: 6, z: 3 }, { x: -3, z: 6 },
            { x: 3, z: -6 }, { x: 14, z: -14 }, { x: -14, z: 14 },
        ];

        for (const pos of cratePositions) {
            const size = 0.8 + Math.random() * 0.4;
            const geo = new THREE.BoxGeometry(size, size, size);
            const crate = new THREE.Mesh(geo, woodMat);
            crate.position.set(pos.x, size / 2, pos.z);
            crate.rotation.y = Math.random() * Math.PI;
            crate.castShadow = true;
            this.scene.add(crate);
            this.objects.push(crate);
        }

        const wreckPositions = [
            { x: -10, z: -8, ry: 0.3 },
            { x: 12, z: 10, ry: -0.5 },
            { x: -25, z: -15, ry: 0.8 },
        ];

        for (const w of wreckPositions) {
            const group = new THREE.Group();

            const bodyGeo = new THREE.BoxGeometry(4, 1.5, 2);
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9 });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.75;
            group.add(body);

            const cabinGeo = new THREE.BoxGeometry(2, 1, 1.8);
            const cabin = new THREE.Mesh(cabinGeo, bodyMat);
            cabin.position.set(0.5, 1.75, 0);
            group.add(cabin);

            group.position.set(w.x, 0, w.z);
            group.rotation.y = w.ry;
            this.scene.add(group);
            this.objects.push(group);
        }

        const lightPolePositions = [
            { x: 10, z: -20 }, { x: -10, z: 20 }, { x: 20, z: 10 },
            { x: -20, z: -10 }, { x: 0, z: 0 },
        ];

        for (const pos of lightPolePositions) {
            const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 5, 6);
            const pole = new THREE.Mesh(poleGeo, metalMat);
            pole.position.set(pos.x, 2.5, pos.z);
            this.scene.add(pole);

            const lightGeo = new THREE.SphereGeometry(0.3, 8, 6);
            const lightMat = new THREE.MeshStandardMaterial({
                color: 0xffaa44,
                emissive: 0xffaa44,
                emissiveIntensity: 0.5
            });
            const light = new THREE.Mesh(lightGeo, lightMat);
            light.position.set(pos.x, 5.2, pos.z);
            this.scene.add(light);

            const pointLight = new THREE.PointLight(0xffaa44, 0.8, 15, 2);
            pointLight.position.set(pos.x, 5, pos.z);
            pointLight.castShadow = false;
            this.scene.add(pointLight);
        }
    }

    _createLighting() {
        const ambient = new THREE.AmbientLight(0x1a1a2e, 0.4);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xff8844, 0.6);
        dirLight.position.set(-30, 40, -20);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 100;
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -50;
        dirLight.shadow.bias = -0.001;
        this.scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0x4466aa, 0.15);
        fillLight.position.set(20, 30, 15);
        this.scene.add(fillLight);

        const fogColor = new THREE.Color(0x1a0a0a);
        this.scene.background = fogColor;
        this.scene.fog = new THREE.FogExp2(0x1a0a0a, 0.008);

        const hemisphereLight = new THREE.HemisphereLight(0x223355, 0x111111, 0.3);
        this.scene.add(hemisphereLight);
    }

    _createPickups() {
        const pickupConfigs = [
            { x: 10, z: -8, type: 'ammo' },
            { x: -10, z: 8, type: 'ammo' },
            { x: 5, z: 15, type: 'health' },
            { x: -5, z: -15, type: 'health' },
            { x: 0, z: -20, type: 'grenade' },
            { x: 15, z: 0, type: 'ammo' },
            { x: -15, z: 0, type: 'health' },
            { x: 20, z: -10, type: 'grenade' },
            { x: -20, z: 10, type: 'ammo' },
        ];

        const colors = {
            ammo: 0xffaa00,
            health: 0x00ff44,
            grenade: 0xff4444
        };

        for (const cfg of pickupConfigs) {
            const geo = new THREE.OctahedronGeometry(0.25, 0);
            const mat = new THREE.MeshStandardMaterial({
                color: colors[cfg.type],
                emissive: colors[cfg.type],
                emissiveIntensity: 0.4,
                roughness: 0.3
            });
            const pickup = new THREE.Mesh(geo, mat);
            pickup.position.set(cfg.x, 0.8, cfg.z);
            pickup.userData.type = cfg.type;
            pickup.userData.active = true;
            pickup.userData.respawnTimer = 0;
            this.scene.add(pickup);
            this.pickups.push(pickup);
        }
    }

    _defineSpawnPoints() {
        this.spawnPoints = [
            { x: -20, z: -20 },
            { x: -20, z: 0 },
            { x: -20, z: 20 },
            { x: 20, z: -20 },
            { x: 20, z: 0 },
            { x: 20, z: 20 },
            { x: 0, z: -20 },
            { x: 0, z: 20 },
            { x: -15, z: -18 },
            { x: 15, z: -18 },
            { x: -15, z: 18 },
            { x: 15, z: 18 },
            { x: -18, z: -15 },
            { x: 18, z: -15 },
            { x: -18, z: 15 },
            { x: 18, z: 15 },
            { x: -10, z: -22 },
            { x: 10, z: -22 },
            { x: -10, z: 22 },
            { x: 10, z: 22 },
            { x: -22, z: -10 },
            { x: 22, z: -10 },
            { x: -22, z: 10 },
            { x: 22, z: 10 },
        ];
    }

    updatePickups(dt, player) {
        for (const pickup of this.pickups) {
            if (!pickup.userData.active) {
                pickup.userData.respawnTimer -= dt;
                if (pickup.userData.respawnTimer <= 0) {
                    pickup.userData.active = true;
                    pickup.visible = true;
                }
                continue;
            }

            pickup.rotation.y += dt * 2;
            pickup.position.y = 0.8 + Math.sin(Date.now() * 0.003) * 0.15;

            if (player && player.alive) {
                const dist = pickup.position.distanceTo(player.position);
                if (dist < 1.5) {
                    pickup.userData.active = false;
                    pickup.visible = false;
                    pickup.userData.respawnTimer = 30;
                    return pickup.userData.type;
                }
            }
        }
        return null;
    }

    getSpawnPoints() {
        return this.spawnPoints;
    }

    getObjects() {
        return this.objects;
    }

    getCoverPoints() {
        return this.coverPoints;
    }
}
