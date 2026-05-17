const THREE = window.THREE;
import { MathUtils } from '../utils/MathUtils.js';

export class Player {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;

        this.position = new THREE.Vector3(0, 1.7, 0);
        this.velocity = new THREE.Vector3();
        this.rotation = { x: 0, y: 0 };

        this.health = 100;
        this.maxHealth = 100;
        this.armor = 0;
        this.alive = true;
        this.downed = false;
        this.downTimer = 0;
        this.downDuration = 15;

        this.speed = 6;
        this.sprintMultiplier = 1.6;
        this.crouchMultiplier = 0.5;
        this.jumpForce = 7;
        this.gravity = -20;
        this.onGround = true;
        this.height = 1.7;
        this.crouchHeight = 1.0;
        this.currentHeight = 1.7;

        this.sprinting = false;
        this.crouching = false;
        this.aiming = false;

        this.recoilX = 0;
        this.recoilY = 0;
        this.recoilRecovery = 5;

        this.hitDirection = new THREE.Vector3();

        this.bobPhase = 0;
        this.bobAmplitude = 0;
        this.bobX = 0;
        this.bobY = 0;

        this.onDamage = null;

        this._moveForward = false;
        this._moveBackward = false;
        this._moveLeft = false;
        this._moveRight = false;

        // Viewmodel (first-person weapon)
        this.viewmodel = null;
        this.viewmodelRecoilOffset = 0;
        this.viewmodelBobX = 0;
        this.viewmodelBobY = 0;
        this.viewmodelSwapTimer = 0;
        this.viewmodelSwapDuration = 0.3;

        // Flashlight
        this.flashlight = null;
        this.flashlightOn = true;

        this._createViewmodel();
        this._createFlashlight();
    }

    _createViewmodel() {
        // Build weapon-specific models
        this._gunModels = [
            this._buildM4Carbine(),
            this._buildRemington870(),
            this._buildM1911()
        ];

        // Weapon-specific viewmodel positions (hip / ADS)
        this._viewmodelConfigs = [
            { hipX: 0.25, hipY: -0.22, hipZ: -0.4,  adsX: 0.12, adsY: -0.18, adsZ: -0.35 },  // M4 Carbine
            { hipX: 0.25, hipY: -0.20, hipZ: -0.38, adsX: 0.14, adsY: -0.17, adsZ: -0.33 },  // Remington 870
            { hipX: 0.22, hipY: -0.20, hipZ: -0.32, adsX: 0.10, adsY: -0.16, adsZ: -0.28 }   // M1911
        ];

        this._currentViewmodelIndex = 0;
        this.viewmodel = this._gunModels[0];
        this.viewmodel.position.set(0.25, -0.22, -0.4);
        this.viewmodel.rotation.set(0, 0, 0);
        this.camera.add(this.viewmodel);
    }

    switchViewmodel(index) {
        if (index < 0 || index >= this._gunModels.length) return;
        if (this.viewmodel) {
            this.camera.remove(this.viewmodel);
        }
        this.viewmodel = this._gunModels[index];
        this._currentViewmodelIndex = index;

        // Weapon-specific viewmodel positions (hip / ADS)
        this._viewmodelConfigs = [
            { hipX: 0.25, hipY: -0.22, hipZ: -0.4,  adsX: 0.12, adsY: -0.18, adsZ: -0.35 },  // M4 Carbine
            { hipX: 0.25, hipY: -0.20, hipZ: -0.38, adsX: 0.14, adsY: -0.17, adsZ: -0.33 },  // Remington 870
            { hipX: 0.22, hipY: -0.20, hipZ: -0.32, adsX: 0.10, adsY: -0.16, adsZ: -0.28 }   // M1911
        ];
        const cfg = this._viewmodelConfigs[index] || this._viewmodelConfigs[0];
        this.viewmodel.position.set(cfg.hipX, cfg.hipY, cfg.hipZ);
        this.viewmodel.rotation.set(0, 0, 0);
        this.camera.add(this.viewmodel);
    }

    _buildM4Carbine() {
        const group = new THREE.Group();

        const receiverMat = new THREE.MeshStandardMaterial({ color: 0x2d2d2d, roughness: 0.35, metalness: 0.85, emissive: 0x111111, emissiveIntensity: 0.15 });
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.25, metalness: 0.9, emissive: 0x0a0a0a, emissiveIntensity: 0.15 });
        const railMat = new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.3, metalness: 0.8, emissive: 0x0f0f0f, emissiveIntensity: 0.15 });
        const gripMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.15, emissive: 0x0a0a0a, emissiveIntensity: 0.15 });
        const stockMat = new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 0.6, metalness: 0.3, emissive: 0x0d0d0d, emissiveIntensity: 0.15 });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.5, metalness: 0.4, emissive: 0x2a1e06, emissiveIntensity: 0.2 });
        const magMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.45, metalness: 0.7, emissive: 0x0b0b0b, emissiveIntensity: 0.15 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.9, emissive: 0x060606, emissiveIntensity: 0.1 });

        // === UPPER RECEIVER ===
        const upperGeo = new THREE.BoxGeometry(0.052, 0.055, 0.22);
        const upper = new THREE.Mesh(upperGeo, receiverMat);
        upper.position.set(0, 0.015, -0.06);
        group.add(upper);

        // Upper receiver top rail (Picatinny)
        const upperRailGeo = new THREE.BoxGeometry(0.036, 0.006, 0.22);
        const upperRail = new THREE.Mesh(upperRailGeo, railMat);
        upperRail.position.set(0, 0.046, -0.06);
        group.add(upperRail);
        // Rail segments
        for (let i = 0; i < 8; i++) {
            const segGeo = new THREE.BoxGeometry(0.038, 0.003, 0.008);
            const seg = new THREE.Mesh(segGeo, receiverMat);
            seg.position.set(0, 0.05, -0.15 + i * 0.018);
            group.add(seg);
        }

        // === LOWER RECEIVER ===
        const lowerGeo = new THREE.BoxGeometry(0.056, 0.04, 0.16);
        const lower = new THREE.Mesh(lowerGeo, receiverMat);
        lower.position.set(0, -0.02, -0.03);
        group.add(lower);

        // Magazine well flare
        const wellGeo = new THREE.BoxGeometry(0.058, 0.012, 0.06);
        const well = new THREE.Mesh(wellGeo, receiverMat);
        well.position.set(0, -0.042, -0.04);
        group.add(well);

        // Takedown pins
        for (let i = 0; i < 2; i++) {
            const pinGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.06, 6);
            pinGeo.rotateZ(Math.PI / 2);
            const pin = new THREE.Mesh(pinGeo, accentMat);
            pin.position.set(0, 0.015, -0.14 + i * 0.14);
            group.add(pin);
        }

        // === BARREL ASSEMBLY ===
        const barrelGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.36, 10);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.position.set(0, 0.02, -0.37);
        group.add(barrel);

        // Barrel inner (visible bore)
        const boreGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.005, 8);
        boreGeo.rotateX(Math.PI / 2);
        const boreInner = new THREE.Mesh(boreGeo, darkMat);
        boreInner.position.set(0, 0.02, -0.555);
        group.add(boreInner);

        // === GAS BLOCK & FRONT SIGHT ===
        const gasBlockGeo = new THREE.BoxGeometry(0.028, 0.028, 0.03);
        const gasBlock = new THREE.Mesh(gasBlockGeo, receiverMat);
        gasBlock.position.set(0, 0.035, -0.38);
        group.add(gasBlock);

        // Gas tube
        const gasTubeGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.12, 6);
        gasTubeGeo.rotateX(Math.PI / 2);
        const gasTube = new THREE.Mesh(gasTubeGeo, barrelMat);
        gasTube.position.set(0, 0.04, -0.32);
        group.add(gasTube);

        // Front sight base
        const frontBaseGeo = new THREE.BoxGeometry(0.025, 0.015, 0.018);
        const frontBase = new THREE.Mesh(frontBaseGeo, barrelMat);
        frontBase.position.set(0, 0.04, -0.52);
        group.add(frontBase);

        // Front sight post
        const frontPostGeo = new THREE.BoxGeometry(0.006, 0.035, 0.006);
        const frontPost = new THREE.Mesh(frontPostGeo, barrelMat);
        frontPost.position.set(0, 0.055, -0.52);
        group.add(frontPost);

        // Front sight ears (protective wings)
        for (let side = -1; side <= 1; side += 2) {
            const earGeo = new THREE.BoxGeometry(0.004, 0.025, 0.012);
            const ear = new THREE.Mesh(earGeo, barrelMat);
            ear.position.set(side * 0.01, 0.055, -0.52);
            group.add(ear);
        }

        // === HANDGUARD (Quad Rail) ===
        const hgBodyGeo = new THREE.BoxGeometry(0.04, 0.04, 0.2);
        const hgBody = new THREE.Mesh(hgBodyGeo, receiverMat);
        hgBody.position.set(0, 0.02, -0.25);
        group.add(hgBody);

        // Top rail
        const topRailGeo = new THREE.BoxGeometry(0.032, 0.008, 0.2);
        const topRail = new THREE.Mesh(topRailGeo, railMat);
        topRail.position.set(0, 0.05, -0.25);
        group.add(topRail);

        // Bottom rail
        const bottomRail = new THREE.Mesh(topRailGeo, railMat);
        bottomRail.position.set(0, -0.01, -0.25);
        group.add(bottomRail);

        // Side rails
        const sideRailGeo = new THREE.BoxGeometry(0.008, 0.035, 0.2);
        const leftRail = new THREE.Mesh(sideRailGeo, railMat);
        leftRail.position.set(-0.022, 0.02, -0.25);
        group.add(leftRail);
        const rightRail = new THREE.Mesh(sideRailGeo, railMat);
        rightRail.position.set(0.022, 0.02, -0.25);
        group.add(rightRail);

        // Rail covers (polymer panels on sides)
        for (let side = -1; side <= 1; side += 2) {
            const coverGeo = new THREE.BoxGeometry(0.006, 0.028, 0.14);
            const cover = new THREE.Mesh(coverGeo, gripMat);
            cover.position.set(side * 0.025, 0.02, -0.25);
            group.add(cover);
            // Cover texture ridges
            for (let i = 0; i < 5; i++) {
                const ridgeGeo2 = new THREE.BoxGeometry(0.007, 0.002, 0.14);
                const ridge2 = new THREE.Mesh(ridgeGeo2, gripMat);
                ridge2.position.set(side * 0.025, 0.01 + i * 0.008, -0.25);
                group.add(ridge2);
            }
        }

        // Bottom rail cover
        const botCoverGeo = new THREE.BoxGeometry(0.028, 0.006, 0.14);
        const botCover = new THREE.Mesh(botCoverGeo, gripMat);
        botCover.position.set(0, -0.013, -0.25);
        group.add(botCover);

        // Barrel cooling vents (holes visible between rail and barrel)
        for (let i = 0; i < 6; i++) {
            const ventGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.042, 6);
            ventGeo.rotateZ(Math.PI / 2);
            const vent = new THREE.Mesh(ventGeo, darkMat);
            vent.position.set(0, 0.02, -0.18 - i * 0.025);
            group.add(vent);
        }

        // Handguard cap (front)
        const hgCapGeo = new THREE.BoxGeometry(0.044, 0.044, 0.008);
        const hgCap = new THREE.Mesh(hgCapGeo, receiverMat);
        hgCap.position.set(0, 0.02, -0.35);
        group.add(hgCap);

        // === CARRY HANDLE / REAR SIGHT ===
        const carryBaseGeo = new THREE.BoxGeometry(0.04, 0.018, 0.09);
        const carryBase = new THREE.Mesh(carryBaseGeo, receiverMat);
        carryBase.position.set(0, 0.05, -0.01);
        group.add(carryBase);

        // Carry handle walls
        for (let side = -1; side <= 1; side += 2) {
            const wallGeo = new THREE.BoxGeometry(0.004, 0.015, 0.09);
            const wall = new THREE.Mesh(wallGeo, receiverMat);
            wall.position.set(side * 0.018, 0.062, -0.01);
            group.add(wall);
        }

        // Carry handle top
        const carryTopGeo = new THREE.BoxGeometry(0.04, 0.004, 0.09);
        const carryTop = new THREE.Mesh(carryTopGeo, receiverMat);
        carryTop.position.set(0, 0.07, -0.01);
        group.add(carryTop);

        // Rear sight aperture
        const rearSightGeo = new THREE.BoxGeometry(0.03, 0.015, 0.005);
        const rearSight = new THREE.Mesh(rearSightGeo, barrelMat);
        rearSight.position.set(0, 0.065, -0.04);
        group.add(rearSight);

        // Rear sight peep hole
        const peepGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.006, 8);
        peepGeo.rotateX(Math.PI / 2);
        const peep = new THREE.Mesh(peepGeo, darkMat);
        peep.position.set(0, 0.065, -0.042);
        group.add(peep);

        // === EJECTION PORT & CONTROLS ===
        const ejectGeo = new THREE.BoxGeometry(0.03, 0.015, 0.04);
        const eject = new THREE.Mesh(ejectGeo, darkMat);
        eject.position.set(0.026, 0.02, -0.04);
        group.add(eject);

        // Shell deflector
        const deflectorGeo = new THREE.BoxGeometry(0.012, 0.015, 0.02);
        const deflector = new THREE.Mesh(deflectorGeo, receiverMat);
        deflector.position.set(0.028, 0.025, -0.005);
        deflector.rotation.y = 0.3;
        group.add(deflector);

        // Bolt catch
        const boltGeo = new THREE.BoxGeometry(0.012, 0.01, 0.015);
        const bolt = new THREE.Mesh(boltGeo, receiverMat);
        bolt.position.set(-0.03, 0.005, 0.0);
        group.add(bolt);

        // Forward assist
        const assistGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.015, 6);
        assistGeo.rotateX(Math.PI / 2);
        const assist = new THREE.Mesh(assistGeo, receiverMat);
        assist.position.set(0.03, 0.02, 0.01);
        group.add(assist);

        // Charging handle
        const chargeGeo = new THREE.BoxGeometry(0.03, 0.01, 0.02);
        const charge = new THREE.Mesh(chargeGeo, receiverMat);
        charge.position.set(0, 0.04, 0.07);
        group.add(charge);

        // Charging handle latch
        const latchGeo = new THREE.BoxGeometry(0.01, 0.008, 0.015);
        const latch = new THREE.Mesh(latchGeo, accentMat);
        latch.position.set(-0.015, 0.04, 0.075);
        group.add(latch);

        // === MAGAZINE ===
        const magGeo = new THREE.BoxGeometry(0.032, 0.14, 0.05);
        const mag = new THREE.Mesh(magGeo, magMat);
        mag.position.set(0, -0.095, -0.04);
        mag.rotation.x = 0.12;
        group.add(mag);

        // Magazine ridges (textured surface)
        for (let i = 0; i < 5; i++) {
            const magRidgeGeo = new THREE.BoxGeometry(0.034, 0.002, 0.05);
            const magRidge = new THREE.Mesh(magRidgeGeo, magMat);
            magRidge.position.set(0, -0.045 + i * -0.025, -0.04);
            magRidge.rotation.x = 0.12;
            group.add(magRidge);
        }

        // Magazine base plate
        const magBaseGeo = new THREE.BoxGeometry(0.034, 0.008, 0.04);
        const magBase = new THREE.Mesh(magBaseGeo, accentMat);
        magBase.position.set(0, -0.165, -0.06);
        magBase.rotation.x = 0.12;
        group.add(magBase);

        // Magazine window (visible round count)
        const magWinGeo = new THREE.BoxGeometry(0.02, 0.04, 0.002);
        const magWin = new THREE.Mesh(magWinGeo, darkMat);
        magWin.position.set(0.017, -0.07, -0.04);
        magWin.rotation.x = 0.12;
        group.add(magWin);

        // Magazine release
        const magRelGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.008, 6);
        magRelGeo.rotateZ(Math.PI / 2);
        const magRel = new THREE.Mesh(magRelGeo, accentMat);
        magRel.position.set(0.03, -0.02, -0.03);
        group.add(magRel);

        // === TRIGGER ASSEMBLY ===
        const guardGeo = new THREE.BoxGeometry(0.035, 0.005, 0.07);
        const guard = new THREE.Mesh(guardGeo, receiverMat);
        guard.position.set(0, -0.045, 0.01);
        group.add(guard);

        // Trigger guard front (rounded)
        const guardFrontGeo = new THREE.BoxGeometry(0.035, 0.015, 0.004);
        const guardFront = new THREE.Mesh(guardFrontGeo, receiverMat);
        guardFront.position.set(0, -0.038, -0.025);
        group.add(guardFront);

        // Trigger
        const triggerGeo = new THREE.BoxGeometry(0.006, 0.018, 0.004);
        const trigger = new THREE.Mesh(triggerGeo, barrelMat);
        trigger.position.set(0, -0.035, 0.005);
        trigger.rotation.x = -0.2;
        group.add(trigger);

        // === PISTOL GRIP ===
        const gripGeo = new THREE.BoxGeometry(0.036, 0.1, 0.04);
        const gripMesh = new THREE.Mesh(gripGeo, gripMat);
        gripMesh.position.set(0, -0.075, 0.065);
        gripMesh.rotation.x = -0.25;
        group.add(gripMesh);

        // Grip finger grooves
        for (let i = 0; i < 4; i++) {
            const grooveGeo = new THREE.BoxGeometry(0.038, 0.004, 0.042);
            const groove = new THREE.Mesh(grooveGeo, gripMat);
            groove.position.set(0, -0.05 + i * -0.02, 0.065);
            groove.rotation.x = -0.25;
            group.add(groove);
        }

        // Grip backstrap
        const backGeo = new THREE.BoxGeometry(0.032, 0.08, 0.015);
        const back = new THREE.Mesh(backGeo, gripMat);
        back.position.set(0, -0.065, 0.082);
        back.rotation.x = -0.25;
        group.add(back);

        // === BUFFER TUBE & STOCK ===
        const bufferGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8);
        bufferGeo.rotateX(Math.PI / 2);
        const buffer = new THREE.Mesh(bufferGeo, stockMat);
        buffer.position.set(0, 0.015, 0.1);
        group.add(buffer);

        // Buffer tube castle nut
        const nutGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.01, 8);
        nutGeo.rotateX(Math.PI / 2);
        const nut = new THREE.Mesh(nutGeo, receiverMat);
        nut.position.set(0, 0.015, 0.03);
        group.add(nut);

        // Stock main body
        const stockMainGeo = new THREE.BoxGeometry(0.045, 0.05, 0.08);
        const stockMain = new THREE.Mesh(stockMainGeo, stockMat);
        stockMain.position.set(0, 0.01, 0.18);
        group.add(stockMain);

        // Stock adjustment lever
        const leverGeo = new THREE.BoxGeometry(0.006, 0.025, 0.02);
        const lever = new THREE.Mesh(leverGeo, receiverMat);
        lever.position.set(-0.025, 0.01, 0.14);
        group.add(lever);

        // Stock cheek weld
        const cheekGeo = new THREE.BoxGeometry(0.04, 0.015, 0.06);
        const cheek = new THREE.Mesh(cheekGeo, stockMat);
        cheek.position.set(0, 0.04, 0.18);
        group.add(cheek);

        // Stock butt plate (rubber)
        const buttGeo = new THREE.BoxGeometry(0.048, 0.055, 0.012);
        const butt = new THREE.Mesh(buttGeo, gripMat);
        butt.position.set(0, 0.01, 0.225);
        group.add(butt);

        // Butt plate texture
        for (let i = 0; i < 3; i++) {
            const texGeo = new THREE.BoxGeometry(0.04, 0.003, 0.013);
            const tex = new THREE.Mesh(texGeo, stockMat);
            tex.position.set(0, -0.01 + i * 0.02, 0.225);
            group.add(tex);
        }

        // === MUZZLE DEVICE ===
        // Flash hider (birdcage)
        const fhBodyGeo = new THREE.CylinderGeometry(0.016, 0.014, 0.04, 8);
        fhBodyGeo.rotateX(Math.PI / 2);
        const fhBody = new THREE.Mesh(fhBodyGeo, barrelMat);
        fhBody.position.set(0, 0.02, -0.57);
        group.add(fhBody);

        // Flash hider slots
        for (let i = 0; i < 3; i++) {
            const slotGeo = new THREE.BoxGeometry(0.018, 0.004, 0.025);
            const slot = new THREE.Mesh(slotGeo, darkMat);
            slot.position.set(0, 0.028 + i * 0.005, -0.57);
            group.add(slot);
        }

        // Flash hider base ring
        const fhRingGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.006, 8);
        fhRingGeo.rotateX(Math.PI / 2);
        const fhRing = new THREE.Mesh(fhRingGeo, barrelMat);
        fhRing.position.set(0, 0.02, -0.548);
        group.add(fhRing);

        return group;
    }

    _buildRemington870() {
        const group = new THREE.Group();

        const receiverMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.3, metalness: 0.9, emissive: 0x0a0a0a, emissiveIntensity: 0.15 });
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.2, metalness: 0.95, emissive: 0x080808, emissiveIntensity: 0.15 });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.85, metalness: 0.05, emissive: 0x1a100a, emissiveIntensity: 0.2 });
        const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e15, roughness: 0.8, metalness: 0.05, emissive: 0x140c06, emissiveIntensity: 0.2 });
        const forendMat = new THREE.MeshStandardMaterial({ color: 0x5a3619, roughness: 0.8, metalness: 0.05, emissive: 0x180e06, emissiveIntensity: 0.2 });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.5, metalness: 0.4, emissive: 0x2a1e06, emissiveIntensity: 0.2 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.25, metalness: 0.95, emissive: 0x050505, emissiveIntensity: 0.1 });

        // === RECEIVER ===
        const recvGeo = new THREE.BoxGeometry(0.055, 0.06, 0.2);
        const recv = new THREE.Mesh(recvGeo, receiverMat);
        recv.position.set(0, 0.01, -0.04);
        group.add(recv);

        // Receiver top contour (rounded feel)
        const recvTopGeo = new THREE.BoxGeometry(0.048, 0.008, 0.2);
        const recvTop = new THREE.Mesh(recvTopGeo, receiverMat);
        recvTop.position.set(0, 0.044, -0.04);
        group.add(recvTop);

        // Receiver bottom rail
        const recvBotGeo = new THREE.BoxGeometry(0.05, 0.005, 0.2);
        const recvBot = new THREE.Mesh(recvBotGeo, receiverMat);
        recvBot.position.set(0, -0.022, -0.04);
        group.add(recvBot);

        // === BARREL ===
        const bblGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.42, 10);
        bblGeo.rotateX(Math.PI / 2);
        const bbl = new THREE.Mesh(bblGeo, barrelMat);
        bbl.position.set(0, 0.025, -0.35);
        group.add(bbl);

        // Barrel vent rib (top of barrel)
        const ribGeo = new THREE.BoxGeometry(0.006, 0.004, 0.35);
        const rib = new THREE.Mesh(ribGeo, barrelMat);
        rib.position.set(0, 0.035, -0.38);
        group.add(rib);

        // Vent rib cross slots
        for (let i = 0; i < 10; i++) {
            const slotGeo = new THREE.BoxGeometry(0.008, 0.005, 0.004);
            const slot = new THREE.Mesh(slotGeo, darkMat);
            slot.position.set(0, 0.035, -0.22 - i * 0.025);
            group.add(slot);
        }

        // Barrel bore (dark hole at muzzle)
        const boreGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.005, 8);
        boreGeo.rotateX(Math.PI / 2);
        const bore = new THREE.Mesh(boreGeo, darkMat);
        bore.position.set(0, 0.025, -0.582);
        group.add(bore);

        // === TUBE MAGAZINE ===
        const tubeGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.35, 8);
        tubeGeo.rotateX(Math.PI / 2);
        const tube = new THREE.Mesh(tubeGeo, receiverMat);
        tube.position.set(0, -0.005, -0.3);
        group.add(tube);

        // Tube magazine cap
        const tubeCapGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.014, 8);
        tubeCapGeo.rotateX(Math.PI / 2);
        const tubeCap = new THREE.Mesh(tubeCapGeo, barrelMat);
        tubeCap.position.set(0, -0.005, -0.475);
        group.add(tubeCap);

        // Tube cap knurling ring
        const tubeKnurlGeo = new THREE.CylinderGeometry(0.019, 0.019, 0.004, 10);
        tubeKnurlGeo.rotateX(Math.PI / 2);
        const tubeKnurl = new THREE.Mesh(tubeKnurlGeo, barrelMat);
        tubeKnurl.position.set(0, -0.005, -0.467);
        group.add(tubeKnurl);

        // Tube follower spring (visible end)
        const springGeo = new THREE.TorusGeometry(0.01, 0.002, 4, 8);
        springGeo.rotateX(Math.PI / 2);
        const spring = new THREE.Mesh(springGeo, barrelMat);
        spring.position.set(0, -0.005, -0.45);
        group.add(spring);

        // === BARREL CLAMP (connects barrel to tube magazine) ===
        const clampGeo = new THREE.BoxGeometry(0.038, 0.012, 0.01);
        const clamp = new THREE.Mesh(clampGeo, receiverMat);
        clamp.position.set(0, 0.01, -0.38);
        group.add(clamp);

        // Clamp bolts
        for (let side = -1; side <= 1; side += 2) {
            const boltGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.04, 6);
            boltGeo.rotateZ(Math.PI / 2);
            const bolt = new THREE.Mesh(boltGeo, accentMat);
            bolt.position.set(side * 0.02, 0.01, -0.38);
            group.add(bolt);
        }

        // Barrel bracket ring (front)
        const ringGeo = new THREE.TorusGeometry(0.022, 0.005, 6, 10);
        ringGeo.rotateX(Math.PI / 2);
        const ring = new THREE.Mesh(ringGeo, receiverMat);
        ring.position.set(0, 0.01, -0.35);
        group.add(ring);

        // === FRONT SIGHT ===
        const beadGeo = new THREE.SphereGeometry(0.005, 6, 4);
        const bead = new THREE.Mesh(beadGeo, new THREE.MeshStandardMaterial({ color: 0xcc0000, emissive: 0x880000, emissiveIntensity: 0.3 }));
        bead.position.set(0, 0.04, -0.56);
        group.add(bead);

        // Front sight base
        const frontBaseGeo = new THREE.BoxGeometry(0.02, 0.01, 0.012);
        const frontBase = new THREE.Mesh(frontBaseGeo, barrelMat);
        frontBase.position.set(0, 0.036, -0.56);
        group.add(frontBase);

        // === REAR SIGHT ===
        const rearBaseGeo = new THREE.BoxGeometry(0.04, 0.008, 0.012);
        const rearBase = new THREE.Mesh(rearBaseGeo, receiverMat);
        rearBase.position.set(0, 0.048, 0.05);
        group.add(rearBase);

        // Rear sight notch (U-notch)
        const rearNotchGeo = new THREE.BoxGeometry(0.015, 0.006, 0.004);
        const rearNotch = new THREE.Mesh(rearNotchGeo, darkMat);
        rearNotch.position.set(0, 0.052, 0.045);
        group.add(rearNotch);

        // === EJECTION PORT ===
        const ejectGeo = new THREE.BoxGeometry(0.028, 0.018, 0.06);
        const eject = new THREE.Mesh(ejectGeo, darkMat);
        eject.position.set(0.028, 0.015, -0.03);
        group.add(eject);

        // Ejection port cover edge
        const ejectEdgeGeo = new THREE.BoxGeometry(0.002, 0.02, 0.062);
        const ejectEdge = new THREE.Mesh(ejectEdgeGeo, receiverMat);
        ejectEdge.position.set(0.042, 0.015, -0.03);
        group.add(ejectEdge);

        // Bolt visible through port
        const boltVisGeo = new THREE.BoxGeometry(0.02, 0.012, 0.03);
        const boltVis = new THREE.Mesh(boltVisGeo, barrelMat);
        boltVis.position.set(0.028, 0.015, -0.03);
        group.add(boltVis);

        // === PUMP FOREND ===
        const forendGeo = new THREE.BoxGeometry(0.048, 0.048, 0.16);
        const forend = new THREE.Mesh(forendGeo, forendMat);
        forend.position.set(0, 0.0, -0.22);
        group.add(forend);

        // Forend grip grooves (cross-hatching)
        for (let i = 0; i < 7; i++) {
            const grooveGeo = new THREE.BoxGeometry(0.05, 0.003, 0.16);
            const groove = new THREE.Mesh(grooveGeo, woodDarkMat);
            groove.position.set(0, -0.02 + i * 0.008, -0.22);
            group.add(groove);
        }

        // Forend side checkering (vertical ridges)
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 4; i++) {
                const checkGeo = new THREE.BoxGeometry(0.002, 0.035, 0.12);
                const check = new THREE.Mesh(checkGeo, woodDarkMat);
                check.position.set(side * 0.025, 0.0, -0.22 + i * 0.03 - 0.045);
                group.add(check);
            }
        }

        // Forend front cap
        const forendCapGeo = new THREE.BoxGeometry(0.052, 0.052, 0.006);
        const forendCap = new THREE.Mesh(forendCapGeo, forendMat);
        forendCap.position.set(0, 0.0, -0.3);
        group.add(forendCap);

        // Forend rear collar
        const forendCollarGeo = new THREE.BoxGeometry(0.05, 0.05, 0.006);
        const forendCollar = new THREE.Mesh(forendCollarGeo, receiverMat);
        forendCollar.position.set(0, 0.0, -0.14);
        group.add(forendCollar);

        // Forend action bars
        const actionBarGeo = new THREE.BoxGeometry(0.006, 0.006, 0.12);
        const actionBarL = new THREE.Mesh(actionBarGeo, receiverMat);
        actionBarL.position.set(-0.018, -0.025, -0.2);
        group.add(actionBarL);

        const actionBarR = new THREE.Mesh(actionBarGeo, receiverMat);
        actionBarR.position.set(0.018, -0.025, -0.2);
        group.add(actionBarR);

        // === SHELL LIFTER / LOADING PORT ===
        const lifterGeo = new THREE.BoxGeometry(0.032, 0.006, 0.05);
        const lifter = new THREE.Mesh(lifterGeo, receiverMat);
        lifter.position.set(0, -0.03, 0.0);
        group.add(lifter);

        // Shell carrier latch
        const latchGeo = new THREE.BoxGeometry(0.01, 0.004, 0.015);
        const latch = new THREE.Mesh(latchGeo, accentMat);
        latch.position.set(0, -0.033, 0.025);
        group.add(latch);

        // Loading port opening
        const loadPortGeo = new THREE.BoxGeometry(0.03, 0.004, 0.04);
        const loadPort = new THREE.Mesh(loadPortGeo, darkMat);
        loadPort.position.set(0, -0.025, 0.0);
        group.add(loadPort);

        // === TRIGGER ASSEMBLY ===
        const guardGeo = new THREE.BoxGeometry(0.04, 0.005, 0.075);
        const guard = new THREE.Mesh(guardGeo, receiverMat);
        guard.position.set(0, -0.035, 0.02);
        group.add(guard);

        // Trigger guard front (rounded)
        const guardFrontGeo = new THREE.BoxGeometry(0.04, 0.015, 0.004);
        const guardFront = new THREE.Mesh(guardFrontGeo, receiverMat);
        guardFront.position.set(0, -0.028, -0.015);
        group.add(guardFront);

        // Trigger
        const triggerGeo = new THREE.BoxGeometry(0.006, 0.02, 0.004);
        const trigger = new THREE.Mesh(triggerGeo, barrelMat);
        trigger.position.set(0, -0.025, 0.015);
        trigger.rotation.x = -0.2;
        group.add(trigger);

        // === CROSS-BOLT SAFETY ===
        const safetyGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.014, 6);
        safetyGeo.rotateZ(Math.PI / 2);
        const safety = new THREE.Mesh(safetyGeo, accentMat);
        safety.position.set(0.03, 0.005, 0.04);
        group.add(safety);

        // Safety button (right side)
        const safetyBtnGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.003, 8);
        safetyBtnGeo.rotateZ(Math.PI / 2);
        const safetyBtn = new THREE.Mesh(safetyBtnGeo, accentMat);
        safetyBtn.position.set(0.037, 0.005, 0.04);
        group.add(safetyBtn);

        // === WOODEN STOCK ===
        const stockGeo = new THREE.BoxGeometry(0.05, 0.06, 0.2);
        const stock = new THREE.Mesh(stockGeo, woodMat);
        stock.position.set(0, 0.005, 0.16);
        group.add(stock);

        // Stock wrist (narrow grip area)
        const stockWristGeo = new THREE.BoxGeometry(0.044, 0.055, 0.06);
        const stockWrist = new THREE.Mesh(stockWristGeo, woodMat);
        stockWrist.position.set(0, 0.0, 0.06);
        group.add(stockWrist);

        // Stock grip area (slightly wider)
        const stockGripGeo = new THREE.BoxGeometry(0.052, 0.065, 0.06);
        const stockGrip = new THREE.Mesh(stockGripGeo, woodMat);
        stockGrip.position.set(0, -0.005, 0.06);
        group.add(stockGrip);

        // Stock comb (raised cheek area)
        const combGeo = new THREE.BoxGeometry(0.042, 0.012, 0.1);
        const comb = new THREE.Mesh(combGeo, woodMat);
        comb.position.set(0, 0.04, 0.16);
        group.add(comb);

        // Stock checkering pattern (diamond grip texture)
        for (let i = 0; i < 5; i++) {
            const checkGeo = new THREE.BoxGeometry(0.053, 0.003, 0.06);
            const check = new THREE.Mesh(checkGeo, woodDarkMat);
            check.position.set(0, -0.025 + i * 0.012, 0.06);
            group.add(check);
        }

        // Stock side checkering (vertical)
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 3; i++) {
                const sideCheckGeo = new THREE.BoxGeometry(0.003, 0.04, 0.06);
                const sideCheck = new THREE.Mesh(sideCheckGeo, woodDarkMat);
                sideCheck.position.set(side * 0.027, -0.005, 0.06 + i * 0.015 - 0.015);
                group.add(sideCheck);
            }
        }

        // Stock butt plate (rubber)
        const buttGeo = new THREE.BoxGeometry(0.054, 0.07, 0.018);
        const buttMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85, metalness: 0.15, emissive: 0x080808, emissiveIntensity: 0.1 });
        const butt = new THREE.Mesh(buttGeo, buttMat);
        butt.position.set(0, 0.005, 0.27);
        group.add(butt);

        // Butt plate texture (horizontal grip lines)
        for (let i = 0; i < 5; i++) {
            const texGeo = new THREE.BoxGeometry(0.048, 0.003, 0.019);
            const tex = new THREE.Mesh(texGeo, receiverMat);
            tex.position.set(0, -0.02 + i * 0.012, 0.27);
            group.add(tex);
        }

        // Butt plate screw (top)
        const buttScrewGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.019, 6);
        buttScrewGeo.rotateX(Math.PI / 2);
        const buttScrew = new THREE.Mesh(buttScrewGeo, accentMat);
        buttScrew.position.set(0, 0.025, 0.27);
        group.add(buttScrew);

        // === MUZZLE ===
        const muzzleGeo = new THREE.CylinderGeometry(0.019, 0.016, 0.03, 10);
        muzzleGeo.rotateX(Math.PI / 2);
        const muzzle = new THREE.Mesh(muzzleGeo, barrelMat);
        muzzle.position.set(0, 0.025, -0.57);
        group.add(muzzle);

        // Muzzle crown (recessed)
        const crownGeo = new THREE.CylinderGeometry(0.014, 0.016, 0.004, 10);
        crownGeo.rotateX(Math.PI / 2);
        const crown = new THREE.Mesh(crownGeo, darkMat);
        crown.position.set(0, 0.025, -0.586);
        group.add(crown);

        // === RECEIVER DETAILS ===
        // Shell stop (visible inside loading port)
        const shellStopGeo = new THREE.BoxGeometry(0.008, 0.006, 0.01);
        const shellStop = new THREE.Mesh(shellStopGeo, accentMat);
        shellStop.position.set(-0.02, -0.022, -0.01);
        group.add(shellStop);

        // Hammer (visible at rear of receiver)
        const hammerGeo = new THREE.BoxGeometry(0.015, 0.015, 0.006);
        const hammer = new THREE.Mesh(hammerGeo, receiverMat);
        hammer.position.set(0, 0.035, 0.08);
        group.add(hammer);

        // Hammer spur
        const spurGeo = new THREE.BoxGeometry(0.018, 0.004, 0.01);
        const spur = new THREE.Mesh(spurGeo, accentMat);
        spur.position.set(0, 0.043, 0.082);
        group.add(spur);

        return group;
    }

    _buildM1911() {
        const group = new THREE.Group();

        const slideMat = new THREE.MeshStandardMaterial({ color: 0x2e2e2e, roughness: 0.2, metalness: 0.92, emissive: 0x111111, emissiveIntensity: 0.15 });
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.35, metalness: 0.8, emissive: 0x111111, emissiveIntensity: 0.15 });
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.2, metalness: 0.95, emissive: 0x0a0a0a, emissiveIntensity: 0.15 });
        const gripMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.85, metalness: 0.05, emissive: 0x120c08, emissiveIntensity: 0.2 });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0xc0a060, roughness: 0.4, metalness: 0.6, emissive: 0x403018, emissiveIntensity: 0.25 });
        const triggerMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.85, emissive: 0x222222, emissiveIntensity: 0.15 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.25, metalness: 0.95, emissive: 0x050505, emissiveIntensity: 0.1 });

        // === SLIDE ===
        const slideGeo = new THREE.BoxGeometry(0.042, 0.032, 0.26);
        const slide = new THREE.Mesh(slideGeo, slideMat);
        slide.position.set(0, 0.025, -0.08);
        group.add(slide);

        // Slide top contour (slight crown for realism)
        const slideTopGeo = new THREE.BoxGeometry(0.038, 0.004, 0.26);
        const slideTop = new THREE.Mesh(slideTopGeo, slideMat);
        slideTop.position.set(0, 0.043, -0.08);
        group.add(slideTop);

        // Slide bottom chamfer (where slide meets frame rails)
        for (let side = -1; side <= 1; side += 2) {
            const chamferGeo = new THREE.BoxGeometry(0.004, 0.004, 0.26);
            const chamfer = new THREE.Mesh(chamferGeo, slideMat);
            chamfer.position.set(side * 0.02, 0.007, -0.08);
            group.add(chamfer);
        }

        // Slide rear serrations (deeper, more defined)
        for (let i = 0; i < 8; i++) {
            const serrGeo = new THREE.BoxGeometry(0.044, 0.003, 0.006);
            const serr = new THREE.Mesh(serrGeo, darkMat);
            serr.position.set(0, 0.025, 0.03 + i * 0.008);
            group.add(serr);
        }

        // Slide front serrations
        for (let i = 0; i < 5; i++) {
            const serrGeo = new THREE.BoxGeometry(0.044, 0.003, 0.006);
            const serr = new THREE.Mesh(serrGeo, darkMat);
            serr.position.set(0, 0.025, -0.175 + i * 0.008);
            group.add(serr);
        }

        // === NOVAK-STYLE SIGHTS ===
        // Rear sight (Novak low-mount, beveled)
        const rearBaseGeo = new THREE.BoxGeometry(0.03, 0.01, 0.018);
        const rearBase = new THREE.Mesh(rearBaseGeo, slideMat);
        rearBase.position.set(0, 0.046, 0.08);
        group.add(rearBase);

        // Rear sight notch (U-notch white outline)
        const rearNotchGeo = new THREE.BoxGeometry(0.012, 0.006, 0.008);
        const rearNotch = new THREE.Mesh(rearNotchGeo, darkMat);
        rearNotch.position.set(0, 0.051, 0.078);
        group.add(rearNotch);

        // Rear sight bevel (angled sides)
        for (let side = -1; side <= 1; side += 2) {
            const bevelGeo = new THREE.BoxGeometry(0.005, 0.008, 0.018);
            const bevel = new THREE.Mesh(bevelGeo, slideMat);
            bevel.position.set(side * 0.017, 0.047, 0.08);
            group.add(bevel);
        }

        // Front sight (ramped Novak-style)
        const frontSightGeo = new THREE.BoxGeometry(0.008, 0.01, 0.01);
        const frontSight = new THREE.Mesh(frontSightGeo, slideMat);
        frontSight.position.set(0, 0.046, -0.195);
        group.add(frontSight);

        // Front sight white dot
        const frontDotGeo = new THREE.SphereGeometry(0.002, 4, 3);
        const frontDot = new THREE.Mesh(frontDotGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 }));
        frontDot.position.set(0, 0.052, -0.195);
        group.add(frontDot);

        // Rear sight dots (two dots flanking notch)
        for (let side = -1; side <= 1; side += 2) {
            const dotGeo = new THREE.SphereGeometry(0.0015, 4, 3);
            const dot = new THREE.Mesh(dotGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 }));
            dot.position.set(side * 0.006, 0.052, 0.078);
            group.add(dot);
        }

        // === EJECTION PORT ===
        const ejectGeo = new THREE.BoxGeometry(0.025, 0.012, 0.035);
        const eject = new THREE.Mesh(ejectGeo, darkMat);
        eject.position.set(0.022, 0.025, -0.02);
        group.add(eject);

        // Extractor (visible claw)
        const extractorGeo = new THREE.BoxGeometry(0.004, 0.006, 0.02);
        const extractor = new THREE.Mesh(extractorGeo, accentMat);
        extractor.position.set(0.02, 0.033, -0.02);
        group.add(extractor);

        // === BARREL ASSEMBLY ===
        const bblGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.18, 8);
        bblGeo.rotateX(Math.PI / 2);
        const bbl = new THREE.Mesh(bblGeo, barrelMat);
        bbl.position.set(0, 0.018, -0.14);
        group.add(bbl);

        // Barrel bushing (muzzle end)
        const bushingGeo = new THREE.CylinderGeometry(0.015, 0.014, 0.014, 10);
        bushingGeo.rotateX(Math.PI / 2);
        const bushing = new THREE.Mesh(bushingGeo, slideMat);
        bushing.position.set(0, 0.018, -0.215);
        group.add(bushing);

        // Bushing lock ring
        const lockRingGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.004, 10);
        lockRingGeo.rotateX(Math.PI / 2);
        const lockRing = new THREE.Mesh(lockRingGeo, frameMat);
        lockRing.position.set(0, 0.018, -0.207);
        group.add(lockRing);

        // Barrel bore
        const boreGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.004, 8);
        boreGeo.rotateX(Math.PI / 2);
        const bore = new THREE.Mesh(boreGeo, darkMat);
        bore.position.set(0, 0.018, -0.223);
        group.add(bore);

        // Barrel link (connects barrel to frame)
        const linkGeo = new THREE.BoxGeometry(0.004, 0.015, 0.006);
        const link = new THREE.Mesh(linkGeo, frameMat);
        link.position.set(0, 0.005, -0.09);
        link.rotation.x = 0.2;
        group.add(link);

        // Barrel link pin
        const linkPinGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.045, 6);
        linkPinGeo.rotateZ(Math.PI / 2);
        const linkPin = new THREE.Mesh(linkPinGeo, accentMat);
        linkPin.position.set(0, 0.005, -0.09);
        group.add(linkPin);

        // === FRAME (lower) ===
        const frameGeo = new THREE.BoxGeometry(0.04, 0.025, 0.22);
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, 0.0, -0.06);
        group.add(frame);

        // Frame dust cover (front of frame under barrel)
        const dustCoverGeo = new THREE.BoxGeometry(0.036, 0.012, 0.06);
        const dustCover = new THREE.Mesh(dustCoverGeo, frameMat);
        dustCover.position.set(0, -0.008, -0.17);
        group.add(dustCover);

        // Frame rail (left - slide rides on this)
        const frameRailGeo = new THREE.BoxGeometry(0.003, 0.008, 0.22);
        const frameRailL = new THREE.Mesh(frameRailGeo, frameMat);
        frameRailL.position.set(-0.019, 0.01, -0.06);
        group.add(frameRailL);

        const frameRailR = new THREE.Mesh(frameRailGeo, frameMat);
        frameRailR.position.set(0.019, 0.01, -0.06);
        group.add(frameRailR);

        // === TRIGGER GUARD ===
        const guardGeo = new THREE.BoxGeometry(0.028, 0.004, 0.055);
        const guard = new THREE.Mesh(guardGeo, frameMat);
        guard.position.set(0, -0.018, 0.0);
        group.add(guard);

        // Trigger guard front (rounded, undercut)
        const guardFrontGeo = new THREE.BoxGeometry(0.028, 0.02, 0.004);
        const guardFront = new THREE.Mesh(guardFrontGeo, frameMat);
        guardFront.position.set(0, -0.01, -0.025);
        group.add(guardFront);

        // Trigger guard rear
        const guardRearGeo = new THREE.BoxGeometry(0.028, 0.008, 0.004);
        const guardRear = new THREE.Mesh(guardRearGeo, frameMat);
        guardRear.position.set(0, -0.015, 0.025);
        group.add(guardRear);

        // === TRIGGER ===
        const triggerGeo = new THREE.BoxGeometry(0.005, 0.02, 0.004);
        const trigger = new THREE.Mesh(triggerGeo, triggerMat);
        trigger.position.set(0, -0.01, -0.005);
        trigger.rotation.x = -0.15;
        group.add(trigger);

        // Trigger bow (thin wire shape - skeletonized)
        const bowGeo = new THREE.BoxGeometry(0.003, 0.003, 0.025);
        const bow = new THREE.Mesh(bowGeo, triggerMat);
        bow.position.set(0, -0.02, -0.005);
        group.add(bow);

        // Trigger bow sides
        for (let side = -1; side <= 1; side += 2) {
            const bowSideGeo = new THREE.BoxGeometry(0.003, 0.008, 0.003);
            const bowSide = new THREE.Mesh(bowSideGeo, triggerMat);
            bowSide.position.set(0, -0.015, side * 0.012 - 0.005);
            group.add(bowSide);
        }

        // === HAMMER ===
        const hammerGeo = new THREE.BoxGeometry(0.02, 0.02, 0.008);
        const hammer = new THREE.Mesh(hammerGeo, frameMat);
        hammer.position.set(0, 0.02, 0.1);
        hammer.rotation.x = -0.3;
        group.add(hammer);

        // Hammer spur (serrated)
        const spurGeo = new THREE.BoxGeometry(0.024, 0.005, 0.014);
        const spur = new THREE.Mesh(spurGeo, accentMat);
        spur.position.set(0, 0.032, 0.105);
        group.add(spur);

        // Hammer spur serrations
        for (let i = 0; i < 3; i++) {
            const serrGeo = new THREE.BoxGeometry(0.026, 0.002, 0.003);
            const serr = new THREE.Mesh(serrGeo, frameMat);
            serr.position.set(0, 0.035, 0.1 + i * 0.005);
            group.add(serr);
        }

        // Hammer pin
        const hammerPinGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.045, 6);
        hammerPinGeo.rotateZ(Math.PI / 2);
        const hammerPin = new THREE.Mesh(hammerPinGeo, accentMat);
        hammerPin.position.set(0, 0.022, 0.1);
        group.add(hammerPin);

        // === BEAVERTAIL GRIP SAFETY ===
        const gripSafetyGeo = new THREE.BoxGeometry(0.038, 0.075, 0.03);
        const gripSafety = new THREE.Mesh(gripSafetyGeo, frameMat);
        gripSafety.position.set(0, -0.042, 0.06);
        gripSafety.rotation.x = -0.15;
        group.add(gripSafety);

        // Beavertail extension (palm swell)
        const beaverGeo = new THREE.BoxGeometry(0.032, 0.02, 0.02);
        const beaver = new THREE.Mesh(beaverGeo, frameMat);
        beaver.position.set(0, 0.005, 0.085);
        beaver.rotation.x = -0.2;
        group.add(beaver);

        // Grip safety pivot area
        const safetyPivotGeo = new THREE.BoxGeometry(0.04, 0.008, 0.008);
        const safetyPivot = new THREE.Mesh(safetyPivotGeo, frameMat);
        safetyPivot.position.set(0, -0.005, 0.075);
        group.add(safetyPivot);

        // === GRIP PANELS ===
        // Left grip panel
        const gripLGeo = new THREE.BoxGeometry(0.008, 0.065, 0.06);
        const gripL = new THREE.Mesh(gripLGeo, gripMat);
        gripL.position.set(-0.024, -0.035, 0.04);
        gripL.rotation.x = -0.1;
        group.add(gripL);

        // Right grip panel
        const gripRGeo = new THREE.BoxGeometry(0.008, 0.065, 0.06);
        const gripR = new THREE.Mesh(gripRGeo, gripMat);
        gripR.position.set(0.024, -0.035, 0.04);
        gripR.rotation.x = -0.1;
        group.add(gripR);

        // Grip diamond checkering pattern (25 LPI style - more dense)
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 3; col++) {
                const checkGeo = new THREE.BoxGeometry(0.009, 0.006, 0.006);
                const checkL = new THREE.Mesh(checkGeo, new THREE.MeshStandardMaterial({ color: 0x2a1a0e, roughness: 0.9, emissive: 0x0a0604, emissiveIntensity: 0.1 }));
                checkL.position.set(-0.025, -0.01 + row * -0.012, 0.015 + col * 0.015);
                checkL.rotation.x = -0.1;
                group.add(checkL);

                const checkR = new THREE.Mesh(checkGeo, new THREE.MeshStandardMaterial({ color: 0x2a1a0e, roughness: 0.9, emissive: 0x0a0604, emissiveIntensity: 0.1 }));
                checkR.position.set(0.025, -0.01 + row * -0.012, 0.015 + col * 0.015);
                checkR.rotation.x = -0.1;
                group.add(checkR);
            }
        }

        // Grip screw (each side)
        for (let side = -1; side <= 1; side += 2) {
            const screwGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.009, 6);
            screwGeo.rotateZ(Math.PI / 2);
            const screw = new THREE.Mesh(screwGeo, accentMat);
            screw.position.set(side * 0.025, -0.035, 0.04);
            group.add(screw);
        }

        // === MAGAZINE ===
        const magGeo = new THREE.BoxGeometry(0.028, 0.06, 0.04);
        const mag = new THREE.Mesh(magGeo, frameMat);
        mag.position.set(0, -0.06, 0.03);
        group.add(mag);

        // Magazine body ribs
        for (let i = 0; i < 3; i++) {
            const magRibGeo = new THREE.BoxGeometry(0.03, 0.002, 0.04);
            const magRib = new THREE.Mesh(magRibGeo, slideMat);
            magRib.position.set(0, -0.045 + i * -0.015, 0.03);
            group.add(magRib);
        }

        // Magazine base pad (extended)
        const magPadGeo = new THREE.BoxGeometry(0.03, 0.01, 0.042);
        const magPad = new THREE.Mesh(magPadGeo, accentMat);
        magPad.position.set(0, -0.095, 0.03);
        group.add(magPad);

        // Magazine base pad bottom
        const magPadBotGeo = new THREE.BoxGeometry(0.032, 0.004, 0.044);
        const magPadBot = new THREE.Mesh(magPadBotGeo, frameMat);
        magPadBot.position.set(0, -0.1, 0.03);
        group.add(magPadBot);

        // === MAGAZINE RELEASE (extended) ===
        const magRelGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.012, 6);
        magRelGeo.rotateZ(Math.PI / 2);
        const magRel = new THREE.Mesh(magRelGeo, frameMat);
        magRel.position.set(0.026, -0.01, 0.02);
        group.add(magRel);

        // Magazine release checkered face
        const magRelFaceGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.002, 8);
        magRelFaceGeo.rotateZ(Math.PI / 2);
        const magRelFace = new THREE.Mesh(magRelFaceGeo, accentMat);
        magRelFace.position.set(0.032, -0.01, 0.02);
        group.add(magRelFace);

        // === SLIDE STOP ===
        const slideStopGeo = new THREE.BoxGeometry(0.018, 0.006, 0.03);
        const slideStop = new THREE.Mesh(slideStopGeo, frameMat);
        slideStop.position.set(-0.028, 0.01, 0.0);
        group.add(slideStop);

        // Slide stop checkered pad (left side)
        const stopPadGeo = new THREE.BoxGeometry(0.004, 0.008, 0.025);
        const stopPad = new THREE.Mesh(stopPadGeo, frameMat);
        stopPad.position.set(-0.032, 0.01, 0.0);
        group.add(stopPad);

        // Slide stop button (right side)
        const stopBtnGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.006, 6);
        stopBtnGeo.rotateZ(Math.PI / 2);
        const stopBtn = new THREE.Mesh(stopBtnGeo, frameMat);
        stopBtn.position.set(0.024, 0.01, 0.0);
        group.add(stopBtn);

        // Slide stop pin
        const stopPinGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.05, 6);
        stopPinGeo.rotateZ(Math.PI / 2);
        const stopPin = new THREE.Mesh(stopPinGeo, accentMat);
        stopPin.position.set(0, 0.01, 0.0);
        group.add(stopPin);

        // === THUMB SAFETY ===
        const safetyGeo = new THREE.BoxGeometry(0.014, 0.005, 0.04);
        const safety = new THREE.Mesh(safetyGeo, frameMat);
        safety.position.set(-0.028, 0.018, 0.04);
        group.add(safety);

        // Safety shelf (raised portion)
        const safetyShelfGeo = new THREE.BoxGeometry(0.006, 0.007, 0.02);
        const safetyShelf = new THREE.Mesh(safetyShelfGeo, frameMat);
        safetyShelf.position.set(-0.03, 0.02, 0.04);
        group.add(safetyShelf);

        // Right side safety
        const safetyRGeo = new THREE.BoxGeometry(0.008, 0.005, 0.035);
        const safetyR = new THREE.Mesh(safetyRGeo, frameMat);
        safetyR.position.set(0.028, 0.018, 0.04);
        group.add(safetyR);

        // === MAINSPRING HOUSING ===
        const housingGeo = new THREE.BoxGeometry(0.034, 0.042, 0.016);
        const housing = new THREE.Mesh(housingGeo, frameMat);
        housing.position.set(0, -0.042, 0.07);
        housing.rotation.x = -0.15;
        group.add(housing);

        // Mainspring housing checkering
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 2; col++) {
                const houseCheckGeo = new THREE.BoxGeometry(0.006, 0.006, 0.004);
                const houseCheck = new THREE.Mesh(houseCheckGeo, darkMat);
                houseCheck.position.set(-0.006 + col * 0.012, -0.03 + row * -0.01, 0.078);
                houseCheck.rotation.x = -0.15;
                group.add(houseCheck);
            }
        }

        // === PLUNGER TUBE ===
        const plungerGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.04, 6);
        plungerGeo.rotateZ(Math.PI / 2);
        const plunger = new THREE.Mesh(plungerGeo, barrelMat);
        plunger.position.set(-0.025, 0.005, 0.04);
        group.add(plunger);

        // Plunger tube cap
        const plungerCapGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.004, 6);
        plungerCapGeo.rotateZ(Math.PI / 2);
        const plungerCap = new THREE.Mesh(plungerCapGeo, frameMat);
        plungerCap.position.set(-0.028, 0.005, 0.02);
        group.add(plungerCap);

        // === EJECTOR ===
        const ejectorGeo = new THREE.BoxGeometry(0.004, 0.006, 0.03);
        const ejector = new THREE.Mesh(ejectorGeo, frameMat);
        ejector.position.set(-0.008, 0.012, -0.07);
        group.add(ejector);

        // === LANYARD LOOP ===
        const lanyardGeo = new THREE.TorusGeometry(0.007, 0.002, 4, 6);
        lanyardGeo.rotateY(Math.PI / 2);
        const lanyard = new THREE.Mesh(lanyardGeo, frameMat);
        lanyard.position.set(0, -0.072, 0.078);
        group.add(lanyard);

        // Lanyard loop pin
        const lanyardPinGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.035, 6);
        lanyardPinGeo.rotateZ(Math.PI / 2);
        const lanyardPin = new THREE.Mesh(lanyardPinGeo, accentMat);
        lanyardPin.position.set(0, -0.072, 0.078);
        group.add(lanyardPin);

        return group;
    }

    _createFlashlight() {
        // Main flashlight beam — strong, wide, long range
        this.flashlight = new THREE.SpotLight(0xffeedd, 4.0, 55, Math.PI / 3.5, 0.35, 1.2);
        this.flashlight.position.set(0, 0, 0);
        this.flashlight.castShadow = false;
        this.camera.add(this.flashlight);

        // Target needs to be in the scene for SpotLight to work
        const target = new THREE.Object3D();
        target.position.set(0, 0, -1);
        this.camera.add(target);
        this.flashlight.target = target;

        // Soft ambient glow around the player so the area right around you is never pitch black
        this.playerLight = new THREE.PointLight(0xccddff, 0.6, 12, 2);
        this.playerLight.position.set(0, -0.5, 0);
        this.camera.add(this.playerLight);
    }

    toggleFlashlight() {
        this.flashlightOn = !this.flashlightOn;
        if (this.flashlight) {
            this.flashlight.visible = this.flashlightOn;
        }
        if (this.playerLight) {
            this.playerLight.visible = this.flashlightOn;
        }
    }

    update(dt, input) {
        if (!this.alive) return;

        if (this.downed) {
            this.downTimer -= dt;
            if (this.downTimer <= 0) {
                this.die();
            }
            return;
        }

        this._moveForward = input.isKeyDown('KeyW');
        this._moveBackward = input.isKeyDown('KeyS');
        this._moveLeft = input.isKeyDown('KeyA');
        this._moveRight = input.isKeyDown('KeyD');

        this.sprinting = input.isKeyDown('ShiftLeft') && this._moveForward && !this.aiming;
        this.crouching = input.isKeyDown('ControlLeft');
        this.aiming = input.isMouseDown(2);

        const targetHeight = this.crouching ? this.crouchHeight : this.height;
        this.currentHeight = MathUtils.lerp(this.currentHeight, targetHeight, dt * 10);

        const moveSpeed = this.speed * (this.sprinting ? this.sprintMultiplier : 1) * (this.crouching ? this.crouchMultiplier : 1);
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);

        const moveDir = new THREE.Vector3();
        if (this._moveForward) moveDir.add(forward);
        if (this._moveBackward) moveDir.sub(forward);
        if (this._moveRight) moveDir.add(right);
        if (this._moveLeft) moveDir.sub(right);

        if (moveDir.lengthSq() > 0) {
            moveDir.normalize().multiplyScalar(moveSpeed);
        }

        this.velocity.x = MathUtils.damp(this.velocity.x, moveDir.x, 15, dt);
        this.velocity.z = MathUtils.damp(this.velocity.z, moveDir.z, 15, dt);

        if (!this.onGround) {
            this.velocity.y += this.gravity * dt;
        }

        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.position.z += this.velocity.z * dt;

        if (this.position.y <= this.currentHeight) {
            this.position.y = this.currentHeight;
            this.velocity.y = 0;
            this.onGround = true;
        }

        if (input.isKeyJustPressed('Space') && this.onGround && !this.crouching) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }

        const mouseDelta = input.getMouseDelta();
        this.rotation.y -= mouseDelta.x;
        this.rotation.x -= mouseDelta.y;
        this.rotation.x = MathUtils.clamp(this.rotation.x, -Math.PI / 2.2, Math.PI / 2.2);

        this.recoilX = MathUtils.damp(this.recoilX, 0, this.recoilRecovery, dt);
        this.recoilY = MathUtils.damp(this.recoilY, 0, this.recoilRecovery, dt);

        const moving = this.isMoving() && this.onGround;
        const bobSpeed = this.sprinting ? 12 : 8;
        const bobTarget = moving ? (this.sprinting ? 0.06 : 0.03) : 0;
        this.bobAmplitude = MathUtils.damp(this.bobAmplitude, bobTarget, 8, dt);

        if (moving) {
            this.bobPhase += dt * bobSpeed;
        } else {
            this.bobPhase = MathUtils.damp(this.bobPhase, 0, 4, dt);
        }

        this.bobY = Math.sin(this.bobPhase) * this.bobAmplitude;
        this.bobX = Math.cos(this.bobPhase * 0.5) * this.bobAmplitude * 0.5;

        this.camera.position.copy(this.position);
        this.camera.position.y = this.position.y - this.height + this.currentHeight + this.bobY;
        this.camera.position.x += this.bobX;
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.rotation.y;
        this.camera.rotation.x = this.rotation.x + this.recoilX;

        // Viewmodel animation
        if (this.viewmodel) {
            // Viewmodel recoil kick (kicks back and up when firing)
            this.viewmodelRecoilOffset = MathUtils.damp(this.viewmodelRecoilOffset, 0, 12, dt);

            // Viewmodel bob synced with player movement
            const vmBobScale = this.sprinting ? 1.5 : 1.0;
            this.viewmodelBobX = MathUtils.damp(this.viewmodelBobX, this.bobX * vmBobScale * 3, 10, dt);
            this.viewmodelBobY = MathUtils.damp(this.viewmodelBobY, this.bobY * vmBobScale * 2, 10, dt);

            // Swap animation (weapon raise from below)
            if (this.viewmodelSwapTimer > 0) {
                this.viewmodelSwapTimer -= dt;
            }
            const swapT = this.viewmodelSwapTimer > 0 ? (1 - this.viewmodelSwapTimer / this.viewmodelSwapDuration) : 1;
            const swapOffset = this.viewmodelSwapTimer > 0 ? MathUtils.easeOutQuad(swapT) * 0.15 : 0;

            // Aiming offset (move weapon to center, weapon-specific)
            const aimT = this.aiming ? 1 : 0;
            const cfg = this._viewmodelConfigs ? (this._viewmodelConfigs[this._currentViewmodelIndex || 0] || this._viewmodelConfigs[0]) : { hipX: 0.25, hipY: -0.22, hipZ: -0.4, adsX: 0.12, adsY: -0.18, adsZ: -0.35 };
            const aimOffsetX = MathUtils.lerp(cfg.hipX, cfg.adsX, aimT);
            const aimOffsetY = MathUtils.lerp(cfg.hipY, cfg.adsY, aimT);
            const aimOffsetZ = MathUtils.lerp(cfg.hipZ, cfg.adsZ, aimT);

            this.viewmodel.position.set(
                aimOffsetX + this.viewmodelBobX * 0.3,
                aimOffsetY + this.viewmodelBobY * 0.5 - swapOffset + this.viewmodelRecoilOffset * 0.02,
                aimOffsetZ + this.viewmodelRecoilOffset * 0.04
            );

            this.viewmodel.rotation.x = -this.viewmodelRecoilOffset * 0.15 + this.viewmodelBobY * 0.8;
            this.viewmodel.rotation.z = this.viewmodelBobX * 0.5;
        }
    }

    applyViewmodelRecoil(amount) {
        this.viewmodelRecoilOffset = amount;
    }

    playViewmodelSwap() {
        this.viewmodelSwapTimer = this.viewmodelSwapDuration;
    }

    takeDamage(amount, attackerPos) {
        if (!this.alive || this.downed) return;

        amount = Math.floor(amount * (1 - this.armor));
        this.health -= amount;

        if (attackerPos) {
            this.hitDirection.set(
                this.position.x - attackerPos.x,
                0,
                this.position.z - attackerPos.z
            ).normalize();
        }

        if (this.onDamage) {
            this.onDamage(amount, attackerPos);
        }

        if (this.health <= 0) {
            this.health = 0;
            this.downed = true;
            this.downTimer = this.downDuration;
        }
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    revive() {
        this.downed = false;
        this.health = 50;
        this.downTimer = 0;
    }

    die() {
        this.alive = false;
        this.downed = false;
    }

    reset() {
        this.health = 100;
        this.maxHealth = 100;
        this.armor = 0;
        this.alive = true;
        this.downed = false;
        this.downTimer = 0;
        this.position.set(0, 1.7, 0);
        this.velocity.set(0, 0, 0);
        this.rotation.x = 0;
        this.rotation.y = 0;
        this.recoilX = 0;
        this.recoilY = 0;
        this.sprinting = false;
        this.crouching = false;
        this.aiming = false;
        this.currentHeight = this.height;
        this.onGround = true;
        this.bobPhase = 0;
        this.bobAmplitude = 0;
        this.bobX = 0;
        this.bobY = 0;
        this._moveForward = false;
        this._moveBackward = false;
        this._moveLeft = false;
        this._moveRight = false;
        this.hitDirection.set(0, 0, 0);
        this.viewmodelRecoilOffset = 0;
        this.viewmodelBobX = 0;
        this.viewmodelBobY = 0;
        this.viewmodelSwapTimer = 0;
        this.switchViewmodel(0);
    }

    applyRecoil(x, y) {
        this.recoilX += x;
        this.recoilY += y;
    }

    getForward() {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
        return dir;
    }

    getLookDirection() {
        const dir = new THREE.Vector3(0, 0, -1);
        const euler = new THREE.Euler(this.rotation.x, this.rotation.y, 0, 'YXZ');
        dir.applyEuler(euler);
        return dir;
    }

    isMoving() {
        return this._moveForward || this._moveBackward || this._moveLeft || this._moveRight;
    }
}
