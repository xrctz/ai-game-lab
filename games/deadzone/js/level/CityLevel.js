const THREE = window.THREE;

export class CityLevel {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.spawnPoints = [];
        this.pickups = [];
        this.coverPoints = [];
        this.bounds = { minX: -80, maxX: 80, minZ: -80, maxZ: 80 };
        this._pointLights = [];
    }

    build() {
        this._createGround();
        this._createStreets();
        this._createBuildings();
        this._createAlleys();
        this._createStreetLights();
        this._createNeonSigns();
        this._createCars();
        this._createProps();
        this._createPark();
        this._createLighting();
        this._createPickups();
        this._defineSpawnPoints();
    }

    // ─── GROUND ───────────────────────────────────────────────────
    _createGround() {
        const geo = new THREE.PlaneGeometry(180, 180, 1, 1);
        const mat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95, metalness: 0.05 });
        const ground = new THREE.Mesh(geo, mat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    // ─── STREETS (grid) ──────────────────────────────────────────
    _createStreets() {
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.92, metalness: 0.05 });
        const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.88 });
        const laneMat = new THREE.MeshStandardMaterial({ color: 0x444400, roughness: 0.85, emissive: 0x222200, emissiveIntensity: 0.08 });

        const streetWidth = 10;
        const sidewalkW = 2.5;
        const mapHalf = 80;

        // Main horizontal streets at z = -30, 0, 30
        const hStreets = [-30, 0, 30];
        for (const z of hStreets) {
            // Road surface
            const roadGeo = new THREE.PlaneGeometry(mapHalf * 2, streetWidth);
            const road = new THREE.Mesh(roadGeo, roadMat);
            road.rotation.x = -Math.PI / 2;
            road.position.set(0, 0.01, z);
            road.receiveShadow = true;
            this.scene.add(road);

            // Center dashed lane markings
            for (let x = -mapHalf + 3; x < mapHalf; x += 8) {
                const dashGeo = new THREE.PlaneGeometry(4, 0.15);
                const dash = new THREE.Mesh(dashGeo, laneMat);
                dash.rotation.x = -Math.PI / 2;
                dash.position.set(x, 0.02, z);
                this.scene.add(dash);
            }

            // Sidewalks (both sides)
            for (const side of [-1, 1]) {
                const swGeo = new THREE.BoxGeometry(mapHalf * 2, 0.15, sidewalkW);
                const sw = new THREE.Mesh(swGeo, sidewalkMat);
                sw.position.set(0, 0.075, z + side * (streetWidth / 2 + sidewalkW / 2));
                sw.receiveShadow = true;
                this.scene.add(sw);
                this.objects.push(sw);

                // Curb
                const curbGeo = new THREE.BoxGeometry(mapHalf * 2, 0.18, 0.3);
                const curb = new THREE.Mesh(curbGeo, new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 }));
                curb.position.set(0, 0.09, z + side * (streetWidth / 2));
                this.scene.add(curb);
            }
        }

        // Main vertical streets at x = -30, 0, 30
        const vStreets = [-30, 0, 30];
        for (const x of vStreets) {
            const roadGeo = new THREE.PlaneGeometry(streetWidth, mapHalf * 2);
            const road = new THREE.Mesh(roadGeo, roadMat);
            road.rotation.x = -Math.PI / 2;
            road.position.set(x, 0.015, 0);
            road.receiveShadow = true;
            this.scene.add(road);

            for (let z = -mapHalf + 3; z < mapHalf; z += 8) {
                const dashGeo = new THREE.PlaneGeometry(0.15, 4);
                const dash = new THREE.Mesh(dashGeo, laneMat);
                dash.rotation.x = -Math.PI / 2;
                dash.position.set(x, 0.025, z);
                this.scene.add(dash);
            }

            for (const side of [-1, 1]) {
                const swGeo = new THREE.BoxGeometry(sidewalkW, 0.15, mapHalf * 2);
                const sw = new THREE.Mesh(swGeo, sidewalkMat);
                sw.position.set(x + side * (streetWidth / 2 + sidewalkW / 2), 0.075, 0);
                sw.receiveShadow = true;
                this.scene.add(sw);
                this.objects.push(sw);

                const curbGeo = new THREE.BoxGeometry(0.3, 0.18, mapHalf * 2);
                const curb = new THREE.Mesh(curbGeo, new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 }));
                curb.position.set(x + side * (streetWidth / 2), 0.09, 0);
                this.scene.add(curb);
            }
        }

        // Crosswalks at intersections
        const intersections = [];
        for (const hx of vStreets) {
            for (const hz of hStreets) {
                intersections.push({ x: hx, z: hz });
            }
        }
        for (const inter of intersections) {
            for (let i = -4; i <= 4; i += 1.4) {
                const stripeGeo = new THREE.PlaneGeometry(0.6, streetWidth - 1);
                const stripe = new THREE.Mesh(stripeGeo, new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 }));
                stripe.rotation.x = -Math.PI / 2;
                stripe.rotation.z = Math.PI / 2;
                stripe.position.set(inter.x + i, 0.025, inter.z);
                this.scene.add(stripe);
            }
        }
    }

    // ─── BUILDINGS ───────────────────────────────────────────────
    _createBuildings() {
        const blockCenters = [];
        // Generate building blocks between the street grid
        const streetX = [-30, 0, 30];
        const streetZ = [-30, 0, 30];

        // Define block regions between streets
        const xRanges = [[-75, -35], [-25, -5], [5, 25], [35, 75]];
        const zRanges = [[-75, -35], [-25, -5], [5, 25], [35, 75]];

        const buildingColors = [
            0x2a2a30, 0x333338, 0x282830, 0x303035,
            0x383838, 0x252528, 0x2e2e33, 0x353540,
            0x3a3a3a, 0x2c2c30, 0x323238, 0x292930
        ];

        const windowLitColors = [
            0xffdd88, 0xffcc66, 0xffeedd, 0xaaccff,
            0xff9944, 0xeeddcc, 0xccddff, 0xffaa55
        ];

        let seed = 42;
        const seededRandom = () => {
            seed = (seed * 16807 + 0) % 2147483647;
            return (seed - 1) / 2147483646;
        };

        for (const [xMin, xMax] of xRanges) {
            for (const [zMin, zMax] of zRanges) {
                const blockW = xMax - xMin;
                const blockD = zMax - zMin;

                // Fill the block with buildings
                let cx = xMin + 2;
                while (cx < xMax - 4) {
                    let cz = zMin + 2;
                    while (cz < zMax - 4) {
                        const bw = 6 + Math.floor(seededRandom() * 10);
                        const bd = 6 + Math.floor(seededRandom() * 10);
                        const bh = 8 + Math.floor(seededRandom() * 28);

                        if (cx + bw > xMax - 1 || cz + bd > zMax - 1) {
                            cz += bd + 1.5;
                            continue;
                        }

                        const color = buildingColors[Math.floor(seededRandom() * buildingColors.length)];
                        const mat = new THREE.MeshStandardMaterial({
                            color,
                            roughness: 0.82 + seededRandom() * 0.1,
                            metalness: 0.08 + seededRandom() * 0.12
                        });

                        const geo = new THREE.BoxGeometry(bw, bh, bd);
                        const building = new THREE.Mesh(geo, mat);
                        building.position.set(cx + bw / 2, bh / 2, cz + bd / 2);
                        building.castShadow = true;
                        building.receiveShadow = true;
                        this.scene.add(building);
                        this.objects.push(building);

                        // ── Windows on all 4 faces ──
                        this._addWindows(building, bw, bh, bd, windowLitColors, seededRandom);

                        // ── Rooftop details ──
                        if (seededRandom() > 0.35) {
                            this._addRooftop(cx + bw / 2, bh, cz + bd / 2, bw, bd, seededRandom);
                        }

                        cz += bd + 1.5 + Math.floor(seededRandom() * 2);
                    }
                    cx += 1.5 + Math.floor(seededRandom() * 3);
                }
            }
        }
    }

    _addWindows(building, bw, bh, bd, litColors, rand) {
        const floorH = 3.5;
        const floors = Math.floor(bh / floorH);
        const winW = 1.2;
        const winH = 1.8;
        const gap = 2.0;

        const darkGlassMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a15,
            roughness: 0.3,
            metalness: 0.6,
            emissive: 0x000000,
            emissiveIntensity: 0
        });

        const faces = [
            { axis: 'z', sign: -1, size: bw },
            { axis: 'z', sign: 1, size: bw },
            { axis: 'x', sign: -1, size: bd },
            { axis: 'x', sign: 1, size: bd }
        ];

        for (const face of faces) {
            const wallSize = face.size;
            const cols = Math.max(1, Math.floor((wallSize - 1) / gap));

            for (let floor = 0; floor < floors; floor++) {
                for (let col = 0; col < cols; col++) {
                    const isLit = rand() > 0.55;
                    const winMat = isLit
                        ? new THREE.MeshStandardMaterial({
                            color: litColors[Math.floor(rand() * litColors.length)],
                            emissive: litColors[Math.floor(rand() * litColors.length)],
                            emissiveIntensity: 0.35 + rand() * 0.35,
                            roughness: 0.4,
                            metalness: 0.2,
                            transparent: true,
                            opacity: 0.9
                        })
                        : darkGlassMat;

                    const winGeo = new THREE.PlaneGeometry(winW, winH);
                    const win = new THREE.Mesh(winGeo, winMat);

                    const localX = -wallSize / 2 + (col + 0.5) * (wallSize / cols);
                    const localY = (floor + 0.5) * floorH + 1;

                    if (face.axis === 'z') {
                        win.position.set(
                            building.position.x + localX,
                            localY,
                            building.position.z + face.sign * (building.geometry.parameters.depth / 2 + 0.02)
                        );
                        win.rotation.y = face.sign > 0 ? Math.PI : 0;
                    } else {
                        win.position.set(
                            building.position.x + face.sign * (building.geometry.parameters.width / 2 + 0.02),
                            localY,
                            building.position.z + localX
                        );
                        win.rotation.y = face.sign > 0 ? -Math.PI / 2 : Math.PI / 2;
                    }

                    this.scene.add(win);
                }
            }
        }
    }

    _addRooftop(cx, topY, cz, bw, bd, rand) {
        const acMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7, metalness: 0.3 });

        // AC units
        const acCount = Math.floor(rand() * 3) + 1;
        for (let i = 0; i < acCount; i++) {
            const acGeo = new THREE.BoxGeometry(1.5 + rand(), 1.2, 1 + rand());
            const ac = new THREE.Mesh(acGeo, acMat);
            ac.position.set(
                cx + (rand() - 0.5) * (bw - 3),
                topY + 0.6,
                cz + (rand() - 0.5) * (bd - 3)
            );
            ac.castShadow = true;
            this.scene.add(ac);
            this.objects.push(ac);
        }

        // Water tower (on taller buildings)
        if (topY > 20 && rand() > 0.5) {
            const towerGroup = new THREE.Group();
            const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 4, 6);
            const legMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.85 });
            for (let lx = -1; lx <= 1; lx += 2) {
                for (let lz = -1; lz <= 1; lz += 2) {
                    const leg = new THREE.Mesh(legGeo, legMat);
                    leg.position.set(lx * 0.8, 2, lz * 0.8);
                    towerGroup.add(leg);
                }
            }
            const tankGeo = new THREE.CylinderGeometry(1.2, 1.4, 2.5, 10);
            const tankMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.8 });
            const tank = new THREE.Mesh(tankGeo, tankMat);
            tank.position.y = 5;
            tank.castShadow = true;
            towerGroup.add(tank);

            const roofGeo = new THREE.ConeGeometry(1.5, 1, 10);
            const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x3a2a15, roughness: 0.8 }));
            roof.position.y = 6.8;
            towerGroup.add(roof);

            towerGroup.position.set(cx, topY, cz);
            this.scene.add(towerGroup);
            this.objects.push(towerGroup);
        }
    }

    // ─── ALLEYS (dark narrow passages between blocks) ────────────
    _createAlleys() {
        const alleyMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.98 });

        // Some alley floors between building blocks
        const alleyPositions = [
            { x: -15, z: -15, w: 3, d: 18 },
            { x: 15, z: 10, w: 18, d: 3 },
            { x: -50, z: -15, w: 3, d: 18 },
            { x: 50, z: -15, w: 3, d: 18 },
            { x: -15, z: 50, w: 18, d: 3 },
        ];

        for (const a of alleyPositions) {
            const geo = new THREE.PlaneGeometry(a.w, a.d);
            const alley = new THREE.Mesh(geo, alleyMat);
            alley.rotation.x = -Math.PI / 2;
            alley.position.set(a.x, 0.02, a.z);
            this.scene.add(alley);
        }
    }

    // ─── STREET LIGHTS ───────────────────────────────────────────
    _createStreetLights() {
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6, metalness: 0.5 });
        const lampMat = new THREE.MeshStandardMaterial({
            color: 0xffcc66,
            emissive: 0xffaa33,
            emissiveIntensity: 0.8,
            roughness: 0.3
        });

        // Place lights along all streets
        const lightPositions = [];

        // Horizontal streets
        for (const z of [-30, 0, 30]) {
            for (let x = -70; x <= 70; x += 18) {
                lightPositions.push({ x, z: z - 7 });
                lightPositions.push({ x: x + 9, z: z + 7 });
            }
        }
        // Vertical streets
        for (const x of [-30, 0, 30]) {
            for (let z = -70; z <= 70; z += 18) {
                lightPositions.push({ x: x - 7, z });
                lightPositions.push({ x: x + 7, z: z + 9 });
            }
        }

        for (const pos of lightPositions) {
            // Pole
            const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 6, 6);
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.set(pos.x, 3, pos.z);
            pole.castShadow = true;
            this.scene.add(pole);

            // Arm
            const armGeo = new THREE.BoxGeometry(2.5, 0.08, 0.08);
            const arm = new THREE.Mesh(armGeo, poleMat);
            arm.position.set(pos.x + 1.2, 6, pos.z);
            this.scene.add(arm);

            // Lamp housing
            const housingGeo = new THREE.BoxGeometry(1.2, 0.2, 0.4);
            const housing = new THREE.Mesh(housingGeo, poleMat);
            housing.position.set(pos.x + 2.4, 5.9, pos.z);
            this.scene.add(housing);

            // Lamp glow
            const glowGeo = new THREE.PlaneGeometry(1.0, 0.3);
            const glow = new THREE.Mesh(glowGeo, lampMat);
            glow.rotation.x = Math.PI / 2;
            glow.position.set(pos.x + 2.4, 5.78, pos.z);
            this.scene.add(glow);

            // Actual point light (limited number for performance)
            if (this._pointLights.length < 40) {
                const pl = new THREE.PointLight(0xffaa44, 0.6, 18, 2);
                pl.position.set(pos.x + 2.4, 5.7, pos.z);
                pl.castShadow = false;
                this.scene.add(pl);
                this._pointLights.push(pl);
            }
        }
    }

    // ─── NEON SIGNS ──────────────────────────────────────────────
    _createNeonSigns() {
        const neonColors = [0xff0044, 0x00ccff, 0xff6600, 0x44ff44, 0xff00ff, 0xffff00, 0xff4488, 0x00ffcc];

        const signPositions = [
            { x: -45, z: -35, y: 8, text: 'BAR', color: 0xff0044 },
            { x: 35, z: -35, y: 12, text: 'HOTEL', color: 0x00ccff },
            { x: -35, z: 35, y: 10, text: 'GUNS', color: 0xff6600 },
            { x: 45, z: 35, y: 15, text: 'MEDS', color: 0x44ff44 },
            { x: -15, z: -5, y: 6, text: 'OPEN', color: 0xff00ff },
            { x: 15, z: 5, y: 8, text: 'CAFE', color: 0xffff00 },
            { x: -50, z: 0, y: 10, text: '24HR', color: 0xff4488 },
            { x: 50, z: -30, y: 14, text: 'SAFE', color: 0x00ffcc },
        ];

        for (const sign of signPositions) {
            const neonMat = new THREE.MeshStandardMaterial({
                color: sign.color,
                emissive: sign.color,
                emissiveIntensity: 1.2,
                roughness: 0.2,
                metalness: 0.1
            });

            // Sign backing plate
            const backMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
            const backGeo = new THREE.BoxGeometry(3.5, 1.2, 0.15);
            const back = new THREE.Mesh(backGeo, backMat);
            back.position.set(sign.x, sign.y, sign.z);
            this.scene.add(back);

            // Neon letters (simplified as glowing bars)
            const letterCount = sign.text.length;
            for (let i = 0; i < letterCount; i++) {
                const barGeo = new THREE.BoxGeometry(0.5, 0.8, 0.08);
                const bar = new THREE.Mesh(barGeo, neonMat);
                bar.position.set(
                    sign.x - (letterCount * 0.35) / 2 + i * 0.55 + 0.25,
                    sign.y,
                    sign.z + 0.12
                );
                this.scene.add(bar);
            }

            // Neon point light
            const nl = new THREE.PointLight(sign.color, 0.5, 12, 2);
            nl.position.set(sign.x, sign.y, sign.z + 1);
            this.scene.add(nl);

            // Flickering effect simulation - some lights slightly dimmer
            if (Math.random() > 0.6) {
                nl.intensity = 0.25;
            }
        }
    }

    // ─── CARS ────────────────────────────────────────────────────
    _createCars() {
        const carColors = [0x3a3a3a, 0x444466, 0x553333, 0x334433, 0x444444, 0x2a2a3a, 0x554433, 0x333344, 0x664444, 0x445555];

        const carPositions = [
            // Parked along horizontal streets
            { x: -50, z: -24, ry: 0 }, { x: -38, z: -24, ry: 0 },
            { x: -20, z: -24, ry: 0 }, { x: 10, z: -24, ry: 0 },
            { x: 40, z: -24, ry: 0 }, { x: 55, z: -24, ry: 0 },
            { x: -45, z: -36, ry: Math.PI }, { x: -10, z: -36, ry: Math.PI },
            { x: 20, z: -36, ry: Math.PI }, { x: 50, z: -36, ry: Math.PI },
            // Along other streets
            { x: -55, z: 6, ry: 0 }, { x: -40, z: 6, ry: 0 },
            { x: 15, z: 6, ry: 0 }, { x: 45, z: 6, ry: 0 },
            { x: -35, z: -6, ry: Math.PI }, { x: 0, z: -6, ry: Math.PI },
            { x: 35, z: -6, ry: Math.PI }, { x: 60, z: -6, ry: Math.PI },
            // Vertical street parking
            { x: -24, z: -50, ry: Math.PI / 2 }, { x: -24, z: -20, ry: Math.PI / 2 },
            { x: -24, z: 10, ry: Math.PI / 2 }, { x: -24, z: 45, ry: Math.PI / 2 },
            { x: -36, z: -40, ry: -Math.PI / 2 }, { x: -36, z: 15, ry: -Math.PI / 2 },
            { x: 6, z: -55, ry: Math.PI / 2 }, { x: 6, z: 10, ry: Math.PI / 2 },
            { x: -6, z: -45, ry: -Math.PI / 2 }, { x: -6, z: 20, ry: -Math.PI / 2 },
            // Wrecked / abandoned (in intersections or odd places)
            { x: 5, z: 5, ry: 0.4 }, { x: -5, z: -3, ry: -0.7 },
            { x: 32, z: 28, ry: 1.2 }, { x: -28, z: 32, ry: 2.1 },
        ];

        for (let i = 0; i < carPositions.length; i++) {
            const cp = carPositions[i];
            const isWreck = i >= carPositions.length - 4;
            const group = new THREE.Group();

            const color = carColors[i % carColors.length];
            const bodyMat = new THREE.MeshStandardMaterial({
                color: isWreck ? 0x2a2a2a : color,
                roughness: isWreck ? 0.95 : 0.6,
                metalness: isWreck ? 0.1 : 0.4
            });
            const glassMat = new THREE.MeshStandardMaterial({
                color: 0x1a2233,
                roughness: 0.2,
                metalness: 0.3,
                transparent: true,
                opacity: 0.6
            });
            const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });

            // Body
            const bodyGeo = new THREE.BoxGeometry(2.2, 1.0, 4.2);
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.7;
            body.castShadow = true;
            group.add(body);

            // Cabin
            const cabinGeo = new THREE.BoxGeometry(1.9, 0.8, 2.2);
            const cabin = new THREE.Mesh(cabinGeo, bodyMat);
            cabin.position.set(0, 1.5, -0.2);
            cabin.castShadow = true;
            group.add(cabin);

            // Windshield
            const windshieldGeo = new THREE.PlaneGeometry(1.7, 0.7);
            const windshield = new THREE.Mesh(windshieldGeo, glassMat);
            windshield.position.set(0, 1.5, 0.92);
            windshield.rotation.x = -0.25;
            group.add(windshield);

            // Rear window
            const rearWinGeo = new THREE.PlaneGeometry(1.7, 0.6);
            const rearWin = new THREE.Mesh(rearWinGeo, glassMat);
            rearWin.position.set(0, 1.5, -1.32);
            rearWin.rotation.x = 0.2;
            group.add(rearWin);

            // Side windows
            for (const side of [-1, 1]) {
                const sideWinGeo = new THREE.PlaneGeometry(1.8, 0.55);
                const sideWin = new THREE.Mesh(sideWinGeo, glassMat);
                sideWin.position.set(side * 1.01, 1.55, -0.2);
                sideWin.rotation.y = side * Math.PI / 2;
                group.add(sideWin);
            }

            // Tires
            const tireGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.22, 10);
            const tirePositions = [
                { x: -1.05, z: 1.3 }, { x: 1.05, z: 1.3 },
                { x: -1.05, z: -1.3 }, { x: 1.05, z: -1.3 }
            ];
            for (const tp of tirePositions) {
                const tire = new THREE.Mesh(tireGeo, tireMat);
                tire.position.set(tp.x, 0.3, tp.z);
                tire.rotation.z = Math.PI / 2;
                group.add(tire);
            }

            // Headlights
            const headlightMat = new THREE.MeshStandardMaterial({
                color: 0xffffcc,
                emissive: 0xffee88,
                emissiveIntensity: 0.2,
                roughness: 0.3
            });
            for (const side of [-1, 1]) {
                const hlGeo = new THREE.SphereGeometry(0.12, 6, 4);
                const hl = new THREE.Mesh(hlGeo, headlightMat);
                hl.position.set(side * 0.7, 0.7, 2.12);
                group.add(hl);
            }

            // Taillights
            const taillightMat = new THREE.MeshStandardMaterial({
                color: 0xff0000,
                emissive: 0xcc0000,
                emissiveIntensity: 0.15,
                roughness: 0.4
            });
            for (const side of [-1, 1]) {
                const tlGeo = new THREE.BoxGeometry(0.2, 0.1, 0.05);
                const tl = new THREE.Mesh(tlGeo, taillightMat);
                tl.position.set(side * 0.7, 0.7, -2.12);
                group.add(tl);
            }

            // Wreck effects
            if (isWreck) {
                group.rotation.x = (Math.random() - 0.5) * 0.15;
                group.rotation.z = (Math.random() - 0.5) * 0.2;

                // Broken glass shards
                for (let g = 0; g < 3; g++) {
                    const shardGeo = new THREE.BoxGeometry(0.3, 0.02, 0.2);
                    const shard = new THREE.Mesh(shardGeo, glassMat);
                    shard.position.set(
                        (Math.random() - 0.5) * 2,
                        0.02,
                        (Math.random() - 0.5) * 3
                    );
                    shard.rotation.y = Math.random() * Math.PI;
                    group.add(shard);
                }
            }

            group.position.set(cp.x, 0, cp.z);
            group.rotation.y = cp.ry;
            this.scene.add(group);
            this.objects.push(group);
        }
    }

    // ─── PROPS (dumpsters, hydrants, barriers, trash cans, etc.) ──
    _createProps() {
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7, metalness: 0.5 });
        const concreteMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.95 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
        const greenMat = new THREE.MeshStandardMaterial({ color: 0x2a4a2a, roughness: 0.85 });

        // Dumpsters
        const dumpsterPositions = [
            { x: -42, z: -18 }, { x: -12, z: 18 }, { x: 42, z: -18 },
            { x: 12, z: 18 }, { x: -18, z: 42 }, { x: 18, z: -42 },
            { x: -50, z: 50 }, { x: 50, z: -50 }, { x: -65, z: 15 },
            { x: 65, z: -15 }, { x: 0, z: -55 }, { x: -55, z: 0 },
        ];
        for (const dp of dumpsterPositions) {
            const group = new THREE.Group();
            const bodyGeo = new THREE.BoxGeometry(2.2, 1.4, 1.3);
            const body = new THREE.Mesh(bodyGeo, greenMat);
            body.position.y = 0.7;
            body.castShadow = true;
            group.add(body);

            const lidGeo = new THREE.BoxGeometry(2.2, 0.08, 1.3);
            const lid = new THREE.Mesh(lidGeo, greenMat);
            lid.position.set(0, 1.42, 0);
            lid.rotation.x = Math.random() > 0.5 ? -0.3 : 0;
            group.add(lid);

            group.position.set(dp.x, 0, dp.z);
            group.rotation.y = Math.random() * Math.PI;
            this.scene.add(group);
            this.objects.push(group);
        }

        // Fire hydrants
        const hydrantPositions = [
            { x: -37, z: -15 }, { x: -37, z: 15 }, { x: 37, z: -15 },
            { x: 37, z: 15 }, { x: -15, z: -37 }, { x: 15, z: -37 },
            { x: -15, z: 37 }, { x: 15, z: 37 },
        ];
        for (const hp of hydrantPositions) {
            const group = new THREE.Group();
            const baseGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.4, 8);
            const base = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.6 }));
            base.position.y = 0.2;
            group.add(base);

            const bodyGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.7, 8);
            const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.6 }));
            body.position.y = 0.75;
            group.add(body);

            const capGeo = new THREE.SphereGeometry(0.15, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
            const cap = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.6 }));
            cap.position.y = 1.1;
            group.add(cap);

            // Side nozzles
            for (const side of [-1, 1]) {
                const nozzleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 6);
                nozzleGeo.rotateZ(Math.PI / 2);
                const nozzle = new THREE.Mesh(nozzleGeo, metalMat);
                nozzle.position.set(side * 0.22, 0.7, 0);
                group.add(nozzle);
            }

            group.position.set(hp.x, 0, hp.z);
            this.scene.add(group);
            this.objects.push(group);
        }

        // Concrete barriers / jersey barriers
        const barrierPositions = [
            { x: -5, z: -5, ry: 0.3 }, { x: 5, z: 5, ry: -0.4 },
            { x: -32, z: 0, ry: 0 }, { x: 32, z: 0, ry: 0 },
            { x: 0, z: -32, ry: Math.PI / 2 }, { x: 0, z: 32, ry: Math.PI / 2 },
            { x: -45, z: -45, ry: 0.5 }, { x: 45, z: 45, ry: -0.5 },
            { x: -60, z: -15, ry: 0.2 }, { x: 60, z: 15, ry: -0.2 },
        ];
        for (const bp of barrierPositions) {
            const geo = new THREE.BoxGeometry(3.5, 1.0, 0.6);
            const barrier = new THREE.Mesh(geo, concreteMat);
            barrier.position.set(bp.x, 0.5, bp.z);
            barrier.rotation.y = bp.ry;
            barrier.castShadow = true;
            barrier.receiveShadow = true;
            this.scene.add(barrier);
            this.objects.push(barrier);
            this.coverPoints.push(new THREE.Vector3(bp.x, 0, bp.z));
        }

        // Trash cans
        const trashPositions = [
            { x: -35, z: -13 }, { x: 35, z: -13 }, { x: -13, z: -35 },
            { x: 13, z: 35 }, { x: -48, z: 13 }, { x: 48, z: -13 },
        ];
        for (const tp of trashPositions) {
            const geo = new THREE.CylinderGeometry(0.3, 0.28, 0.9, 8);
            const can = new THREE.Mesh(geo, darkMat);
            can.position.set(tp.x, 0.45, tp.z);
            can.castShadow = true;
            this.scene.add(can);
            this.objects.push(can);
        }

        // Newspaper boxes
        const newsPositions = [
            { x: -36, z: -8 }, { x: 36, z: 8 }, { x: -8, z: -36 }, { x: 8, z: 36 },
        ];
        for (const np of newsPositions) {
            const geo = new THREE.BoxGeometry(0.5, 1.0, 0.35);
            const box = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x336633, roughness: 0.7 }));
            box.position.set(np.x, 0.5, np.z);
            box.castShadow = true;
            this.scene.add(box);
            this.objects.push(box);
        }

        // Bus stop shelters
        const shelterPositions = [
            { x: -50, z: -36, ry: 0 }, { x: 20, z: 6, ry: Math.PI },
        ];
        for (const sp of shelterPositions) {
            const group = new THREE.Group();

            // Posts
            const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 3, 6);
            const postMat = metalMat;
            for (const px of [-1.5, 1.5]) {
                const post = new THREE.Mesh(postGeo, postMat);
                post.position.set(px, 1.5, 0);
                group.add(post);
            }

            // Roof
            const roofGeo = new THREE.BoxGeometry(3.5, 0.08, 1.8);
            const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.5, metalness: 0.3, transparent: true, opacity: 0.7 }));
            roof.position.y = 3;
            group.add(roof);

            // Glass back panel
            const glassGeo = new THREE.PlaneGeometry(3.2, 2.5);
            const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a2233, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.4 });
            const glass = new THREE.Mesh(glassGeo, glassMat);
            glass.position.set(0, 1.5, -0.88);
            group.add(glass);

            // Bench
            const benchGeo = new THREE.BoxGeometry(2.5, 0.08, 0.5);
            const bench = new THREE.Mesh(benchGeo, new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.85 }));
            bench.position.set(0, 0.6, 0.3);
            group.add(bench);

            group.position.set(sp.x, 0, sp.z);
            group.rotation.y = sp.ry;
            this.scene.add(group);
            this.objects.push(group);
        }
    }

    // ─── PARK (central green area) ───────────────────────────────
    _createPark() {
        // Grass area
        const grassMat = new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 0.95 });
        const grassGeo = new THREE.PlaneGeometry(16, 16);
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.rotation.x = -Math.PI / 2;
        grass.position.set(-15, 0.03, 15);
        grass.receiveShadow = true;
        this.scene.add(grass);

        // Trees
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x1a4a1a, roughness: 0.9 });
        const darkLeafMat = new THREE.MeshStandardMaterial({ color: 0x143514, roughness: 0.9 });

        const treePositions = [
            { x: -20, z: 10 }, { x: -10, z: 20 }, { x: -20, z: 20 },
            { x: -10, z: 10 }, { x: -15, z: 15 }, { x: -20, z: 15 },
            { x: -10, z: 15 }, { x: -15, z: 10 }, { x: -15, z: 20 },
        ];

        for (const tp of treePositions) {
            const group = new THREE.Group();

            const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 3, 6);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 1.5;
            trunk.castShadow = true;
            group.add(trunk);

            const canopyGeo = new THREE.SphereGeometry(1.8, 8, 6);
            const canopy = new THREE.Mesh(canopyGeo, Math.random() > 0.5 ? leafMat : darkLeafMat);
            canopy.position.y = 4;
            canopy.scale.set(1, 0.8, 1);
            canopy.castShadow = true;
            group.add(canopy);

            // Second canopy layer
            const canopy2Geo = new THREE.SphereGeometry(1.2, 8, 6);
            const canopy2 = new THREE.Mesh(canopy2Geo, darkLeafMat);
            canopy2.position.y = 5.2;
            canopy2.scale.set(0.8, 0.7, 0.8);
            group.add(canopy2);

            group.position.set(tp.x, 0, tp.z);
            this.scene.add(group);
            this.objects.push(group);
        }

        // Park benches
        const benchMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.85 });
        const benchPositions = [
            { x: -15, z: 12, ry: 0 }, { x: -12, z: 18, ry: Math.PI / 2 },
        ];
        for (const bp of benchPositions) {
            const group = new THREE.Group();

            // Seat
            const seatGeo = new THREE.BoxGeometry(1.8, 0.08, 0.5);
            const seat = new THREE.Mesh(seatGeo, benchMat);
            seat.position.y = 0.55;
            group.add(seat);

            // Backrest
            const backGeo = new THREE.BoxGeometry(1.8, 0.6, 0.08);
            const back = new THREE.Mesh(backGeo, benchMat);
            back.position.set(0, 0.85, -0.22);
            group.add(back);

            // Legs
            const legGeo = new THREE.BoxGeometry(0.08, 0.55, 0.5);
            for (const lx of [-0.7, 0.7]) {
                const leg = new THREE.Mesh(legGeo, metalMat);
                leg.position.set(lx, 0.275, 0);
                group.add(leg);
            }

            group.position.set(bp.x, 0, bp.z);
            group.rotation.y = bp.ry;
            this.scene.add(group);
            this.objects.push(group);
            this.coverPoints.push(new THREE.Vector3(bp.x, 0, bp.z));
        }

        // Fountain in center of park
        const fountainGroup = new THREE.Group();
        const baseGeo = new THREE.CylinderGeometry(2.5, 3, 0.6, 12);
        const fountainMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.7 });
        const fBase = new THREE.Mesh(baseGeo, fountainMat);
        fBase.position.y = 0.3;
        fountainGroup.add(fBase);

        const poolGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.4, 12);
        const waterMat = new THREE.MeshStandardMaterial({ color: 0x1a3a5a, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.7 });
        const pool = new THREE.Mesh(poolGeo, waterMat);
        pool.position.y = 0.5;
        fountainGroup.add(pool);

        const pillarGeo = new THREE.CylinderGeometry(0.3, 0.4, 2, 8);
        const pillar = new THREE.Mesh(pillarGeo, fountainMat);
        pillar.position.y = 1.5;
        fountainGroup.add(pillar);

        fountainGroup.position.set(-15, 0, 15);
        this.scene.add(fountainGroup);
        this.objects.push(fountainGroup);

        // Fountain light
        const fLight = new THREE.PointLight(0x4488cc, 0.4, 10, 2);
        fLight.position.set(-15, 2, 15);
        this.scene.add(fLight);
    }

    // ─── AMBIENT LIGHTING ────────────────────────────────────────
    _createLighting() {
        // Ambient — enough to keep shadows from being pure black
        const ambient = new THREE.AmbientLight(0x151525, 0.45);
        this.scene.add(ambient);

        // Moonlight — brighter so distant buildings are silhouetted, not invisible
        const moonLight = new THREE.DirectionalLight(0x6688bb, 0.55);
        moonLight.position.set(-40, 60, -30);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 2048;
        moonLight.shadow.mapSize.height = 2048;
        moonLight.shadow.camera.near = 0.5;
        moonLight.shadow.camera.far = 180;
        moonLight.shadow.camera.left = -90;
        moonLight.shadow.camera.right = 90;
        moonLight.shadow.camera.top = 90;
        moonLight.shadow.camera.bottom = -90;
        moonLight.shadow.bias = -0.001;
        this.scene.add(moonLight);

        // Warm city-glow fill from the other side
        const warmFill = new THREE.DirectionalLight(0xff9955, 0.2);
        warmFill.position.set(30, 25, 20);
        this.scene.add(warmFill);

        // Hemisphere — brighter sky so rooftops aren't black
        const hemiLight = new THREE.HemisphereLight(0x223355, 0x111111, 0.35);
        this.scene.add(hemiLight);

        // Thinner fog so you can actually see down streets
        const fogColor = new THREE.Color(0x060610);
        this.scene.background = fogColor;
        this.scene.fog = new THREE.FogExp2(0x060610, 0.003);
    }

    // ─── PICKUPS ─────────────────────────────────────────────────
    _createPickups() {
        const pickupConfigs = [
            // Street level pickups
            { x: -40, z: -8, type: 'ammo' },
            { x: 40, z: 8, type: 'ammo' },
            { x: -8, z: -40, type: 'health' },
            { x: 8, z: 40, type: 'health' },
            { x: 0, z: -15, type: 'grenade' },
            { x: -15, z: 0, type: 'ammo' },
            { x: 15, z: 0, type: 'health' },
            { x: -50, z: -50, type: 'grenade' },
            { x: 50, z: 50, type: 'ammo' },
            // Park area
            { x: -15, z: 15, type: 'health' },
            // Far corners
            { x: -65, z: -65, type: 'ammo' },
            { x: 65, z: 65, type: 'health' },
            { x: -65, z: 65, type: 'grenade' },
            { x: 65, z: -65, type: 'ammo' },
            // Mid-block
            { x: -15, z: -15, type: 'health' },
            { x: 15, z: 15, type: 'ammo' },
        ];

        const colors = {
            ammo: 0xffaa00,
            health: 0x00ff44,
            grenade: 0xff4444
        };

        for (const cfg of pickupConfigs) {
            const geo = new THREE.OctahedronGeometry(0.3, 0);
            const mat = new THREE.MeshStandardMaterial({
                color: colors[cfg.type],
                emissive: colors[cfg.type],
                emissiveIntensity: 0.5,
                roughness: 0.3
            });
            const pickup = new THREE.Mesh(geo, mat);
            pickup.position.set(cfg.x, 1.0, cfg.z);
            pickup.userData.type = cfg.type;
            pickup.userData.active = true;
            pickup.userData.respawnTimer = 0;
            this.scene.add(pickup);
            this.pickups.push(pickup);
        }
    }

    // ─── SPAWN POINTS ────────────────────────────────────────────
    _defineSpawnPoints() {
        this.spawnPoints = [
            // Edge spawns (zombies come from outside the playable area)
            { x: -70, z: -70 }, { x: -70, z: 0 }, { x: -70, z: 70 },
            { x: 70, z: -70 }, { x: 70, z: 0 }, { x: 70, z: 70 },
            { x: 0, z: -70 }, { x: 0, z: 70 },
            // Street corner spawns
            { x: -35, z: -35 }, { x: -35, z: 0 }, { x: -35, z: 35 },
            { x: 35, z: -35 }, { x: 35, z: 0 }, { x: 35, z: 35 },
            { x: 0, z: -35 }, { x: 0, z: 35 },
            // Deep city spawns
            { x: -55, z: -55 }, { x: 55, z: 55 },
            { x: -55, z: 55 }, { x: 55, z: -55 },
            { x: -20, z: -55 }, { x: 20, z: 55 },
            { x: -55, z: 20 }, { x: 55, z: -20 },
            // Alley spawns
            { x: -15, z: -15 }, { x: 15, z: 15 },
            { x: -15, z: 15 }, { x: 15, z: -15 },
            // Park area
            { x: -25, z: 25 }, { x: -5, z: 25 },
        ];
    }

    // ─── PICKUP UPDATE ───────────────────────────────────────────
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
            pickup.position.y = 1.0 + Math.sin(Date.now() * 0.003) * 0.2;

            if (player && player.alive) {
                const dist = pickup.position.distanceTo(player.position);
                if (dist < 2.0) {
                    pickup.userData.active = false;
                    pickup.visible = false;
                    pickup.userData.respawnTimer = 25;
                    return pickup.userData.type;
                }
            }
        }
        return null;
    }

    getSpawnPoints() { return this.spawnPoints; }
    getObjects() { return this.objects; }
    getCoverPoints() { return this.coverPoints; }
}