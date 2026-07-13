const THREE = window.THREE;
import { MathUtils } from '../utils/MathUtils.js';

const ZOMBIE_STATES = {
    IDLE: 'idle',
    ROAMING: 'roaming',
    CHASING: 'chasing',
    ATTACKING: 'attacking',
    STAGGERED: 'staggered',
    DOWNED: 'downed',
    DYING: 'dying'
};

export class Zombie {
    constructor(config, scene) {
        this.scene = scene;
        this.type = config.type || 'runner';
        this.health = config.health || 80;
        this.maxHealth = this.health;
        this.speed = config.speed || 4.5;
        this.damage = config.damage || 15;
        this.attackRange = config.attackRange || 1.8;
        this.attackCooldown = config.attackCooldown || 1.0;
        this.attackWindup = config.attackWindup ?? 0.18;
        this.attackWindupTimer = 0;
        this.detectionRange = config.detectionRange || 35;
        this.staggerThreshold = config.staggerThreshold || 30;
        this.headshotMultiplier = config.headshotMultiplier || 2.5;
        this.scoreValue = config.scoreValue || 100;
        this.armor = config.armor || 0;
        this.bodyColor = config.bodyColor || 0x556b2f;
        this.skinColor = config.skinColor || 0x7a9a6a;
        this.eyeColor = config.eyeColor || 0xcc2200;
        this.scale = config.scale || 1.0;

        this.position = new THREE.Vector3(config.x || 0, 0, config.z || 0);
        this.rotation = Math.random() * Math.PI * 2;
        this.velocity = new THREE.Vector3();

        this.alive = true;
        this.state = ZOMBIE_STATES.IDLE;
        this.prevState = null;

        this.target = null;
        this.attackTimer = 0;
        this.staggerTimer = 0;
        this.stateTimer = 0;
        this.roamTimer = 0;
        this.roamTarget = null;
        this._targets = [];
        this.deathTimer = 0;

        this.thinkTimer = 0;
        this.thinkInterval = 0.15 + Math.random() * 0.1;

        this.hitFlashTimer = 0;
        this.hitFlashDuration = 0.1;
        this._originalBodyColor = this.bodyColor;

        // Animation state
        this._animTime = Math.random() * 100;
        this._walkCycle = 0;
        this._idleSway = 0;
        this._attackAnim = 0;
        this._staggerAnim = 0;
        this._deathAnim = 0;
        this._deathFallDir = Math.random() * Math.PI * 2;
        this._deathFallForward = Math.random() > 0.5;

        this.mesh = this._createMesh();
        this.scene.add(this.mesh);

        this.healthBar = this._createHealthBar();
        this.scene.add(this.healthBar);

        this._lastHitTime = 0;
    }

    _createMaterial(color, opts = {}) {
        return new THREE.MeshStandardMaterial({
            color,
            roughness: opts.roughness ?? 0.85,
            metalness: opts.metalness ?? 0.05,
            emissive: opts.emissive ?? 0x000000,
            emissiveIntensity: opts.emissiveIntensity ?? 0,
            flatShading: opts.flat ?? false,
        });
    }

    _createMesh() {
        const group = new THREE.Group();
        const s = this.scale;
        const skinCol = this.skinColor;
        const bodyCol = this.bodyColor;

        // ── TORSO ──
        const torsoGroup = new THREE.Group();

        // Upper torso (chest) - box-like for broad shoulders
        const chestGeo = new THREE.BoxGeometry(0.55 * s, 0.45 * s, 0.3 * s);
        const chestMat = this._createMaterial(bodyCol);
        const chest = new THREE.Mesh(chestGeo, chestMat);
        chest.position.y = 1.35 * s;
        chest.castShadow = true;
        torsoGroup.add(chest);

        // Rib cage detail - visible through torn shirt
        const ribGeo = new THREE.BoxGeometry(0.48 * s, 0.15 * s, 0.28 * s);
        const ribMat = this._createMaterial(skinCol, { roughness: 0.7 });
        const ribCage = new THREE.Mesh(ribGeo, ribMat);
        ribCage.position.y = 1.22 * s;
        torsoGroup.add(ribCage);

        // Lower torso (abdomen)
        const abdGeo = new THREE.BoxGeometry(0.45 * s, 0.35 * s, 0.25 * s);
        const abdMat = this._createMaterial(bodyCol);
        const abdomen = new THREE.Mesh(abdGeo, abdMat);
        abdomen.position.y = 0.92 * s;
        abdomen.castShadow = true;
        torsoGroup.add(abdomen);

        // Waist / belt area
        const waistGeo = new THREE.CylinderGeometry(0.22 * s, 0.25 * s, 0.1 * s, 8);
        const waistMat = this._createMaterial(0x3a2a1a);
        const waist = new THREE.Mesh(waistGeo, waistMat);
        waist.position.y = 0.72 * s;
        torsoGroup.add(waist);

        group.add(torsoGroup);

        // ── NECK ──
        const neckGeo = new THREE.CylinderGeometry(0.1 * s, 0.12 * s, 0.15 * s, 6);
        const neckMat = this._createMaterial(skinCol);
        const neck = new THREE.Mesh(neckGeo, neckMat);
        neck.position.y = 1.63 * s;
        group.add(neck);

        // ── HEAD ──
        const headGroup = new THREE.Group();
        headGroup.position.y = 1.78 * s;

        // Skull
        const skullGeo = new THREE.SphereGeometry(0.2 * s, 8, 8);
        const skullMat = this._createMaterial(skinCol, { roughness: 0.75 });
        const skull = new THREE.Mesh(skullGeo, skullMat);
        skull.scale.set(1, 1.1, 0.95);
        skull.castShadow = true;
        headGroup.add(skull);

        // Jaw
        const jawGeo = new THREE.BoxGeometry(0.16 * s, 0.07 * s, 0.12 * s);
        const jawMat = this._createMaterial(skinCol, { roughness: 0.8 });
        const jaw = new THREE.Mesh(jawGeo, jawMat);
        jaw.position.y = -0.12 * s;
        jaw.position.z = 0.04 * s;
        headGroup.add(jaw);

        // Left eye socket
        const eyeSocketGeo = new THREE.SphereGeometry(0.05 * s, 6, 4);
        const eyeSocketMat = this._createMaterial(0x1a0a0a);
        const leftEyeSocket = new THREE.Mesh(eyeSocketGeo, eyeSocketMat);
        leftEyeSocket.position.set(-0.08 * s, 0.04 * s, 0.15 * s);
        headGroup.add(leftEyeSocket);

        // Right eye socket
        const rightEyeSocket = new THREE.Mesh(eyeSocketGeo, eyeSocketMat.clone());
        rightEyeSocket.position.set(0.08 * s, 0.04 * s, 0.15 * s);
        headGroup.add(rightEyeSocket);

        // Left glowing eye — very bright so zombies are visible in the dark
        const eyeGeo = new THREE.SphereGeometry(0.04 * s, 6, 4);
        const eyeMat = this._createMaterial(this.eyeColor, {
            emissive: this.eyeColor,
            emissiveIntensity: 4.0,
            roughness: 0.2
        });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.08 * s, 0.04 * s, 0.18 * s);
        headGroup.add(leftEye);

        // Right glowing eye
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
        rightEye.position.set(0.08 * s, 0.04 * s, 0.18 * s);
        headGroup.add(rightEye);

        // Tiny point light on head so zombies cast a faint glow visible from afar
        const eyeGlow = new THREE.PointLight(this.eyeColor, 0.4, 10, 2);
        eyeGlow.position.set(0, 1.78 * s, 0.2 * s);
        group.add(eyeGlow);

        // Nose (flat, broken)
        const noseGeo = new THREE.BoxGeometry(0.05 * s, 0.04 * s, 0.06 * s);
        const noseMat = this._createMaterial(skinCol);
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, -0.01 * s, 0.18 * s);
        nose.rotation.x = -0.2;
        headGroup.add(nose);

        // Exposed teeth
        const teethGeo = new THREE.BoxGeometry(0.13 * s, 0.03 * s, 0.02 * s);
        const teethMat = this._createMaterial(0xcccc99, { roughness: 0.4 });
        const teeth = new THREE.Mesh(teethGeo, teethMat);
        teeth.position.set(0, -0.08 * s, 0.14 * s);
        headGroup.add(teeth);

        // Wound/gore on head
        const woundGeo = new THREE.SphereGeometry(0.04 * s, 5, 4);
        const woundMat = this._createMaterial(0x880000, { roughness: 0.6 });
        const wound = new THREE.Mesh(woundGeo, woundMat);
        wound.position.set(0.1 * s, 0.12 * s, 0.05 * s);
        wound.scale.set(1, 0.5, 1);
        headGroup.add(wound);

        group.add(headGroup);

        // ── LEFT ARM ──
        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.38 * s, 1.4 * s, 0);

        // Upper arm
        const upperArmGeo = new THREE.CapsuleGeometry(0.06 * s, 0.28 * s, 3, 6);
        const upperArmMat = this._createMaterial(skinCol);
        const leftUpperArm = new THREE.Mesh(upperArmGeo, upperArmMat);
        leftUpperArm.position.y = -0.12 * s;
        leftUpperArm.castShadow = true;
        leftArmGroup.add(leftUpperArm);

        // Forearm
        const forearmGeo = new THREE.CapsuleGeometry(0.05 * s, 0.25 * s, 3, 6);
        const forearmMat = this._createMaterial(skinCol);
        const leftForearm = new THREE.Mesh(forearmGeo, forearmMat);
        leftForearm.position.set(0, -0.38 * s, -0.08 * s);
        leftForearm.rotation.x = -0.7;
        leftArmGroup.add(leftForearm);

        // Clawed hand
        const handGeo = new THREE.BoxGeometry(0.08 * s, 0.06 * s, 0.1 * s);
        const handMat = this._createMaterial(skinCol, { roughness: 0.9 });
        const leftHand = new THREE.Mesh(handGeo, handMat);
        leftHand.position.set(0, -0.5 * s, -0.15 * s);
        leftArmGroup.add(leftHand);

        // Claws
        for (let i = -1; i <= 1; i++) {
            const clawGeo = new THREE.ConeGeometry(0.012 * s, 0.06 * s, 4);
            const clawMat = this._createMaterial(0x554433, { roughness: 0.3, metalness: 0.3 });
            const claw = new THREE.Mesh(clawGeo, clawMat);
            claw.position.set(i * 0.025 * s, -0.53 * s, -0.2 * s);
            claw.rotation.x = 0.5;
            leftArmGroup.add(claw);
        }

        group.add(leftArmGroup);

        // ── RIGHT ARM ──
        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.38 * s, 1.4 * s, 0);

        const rightUpperArm = new THREE.Mesh(upperArmGeo, upperArmMat.clone());
        rightUpperArm.position.y = -0.12 * s;
        rightUpperArm.castShadow = true;
        rightArmGroup.add(rightUpperArm);

        const rightForearm = new THREE.Mesh(forearmGeo, forearmMat.clone());
        rightForearm.position.set(0, -0.38 * s, -0.08 * s);
        rightForearm.rotation.x = -0.7;
        rightArmGroup.add(rightForearm);

        const rightHand = new THREE.Mesh(handGeo, handMat.clone());
        rightHand.position.set(0, -0.5 * s, -0.15 * s);
        rightArmGroup.add(rightHand);

        for (let i = -1; i <= 1; i++) {
            const clawGeo = new THREE.ConeGeometry(0.012 * s, 0.06 * s, 4);
            const clawMat = this._createMaterial(0x554433, { roughness: 0.3, metalness: 0.3 });
            const claw = new THREE.Mesh(clawGeo, clawMat);
            claw.position.set(i * 0.025 * s, -0.53 * s, -0.2 * s);
            claw.rotation.x = 0.5;
            rightArmGroup.add(claw);
        }

        group.add(rightArmGroup);

        // ── LEFT LEG ──
        const leftLegGroup = new THREE.Group();
        leftLegGroup.position.set(-0.15 * s, 0.68 * s, 0);

        // Thigh
        const thighGeo = new THREE.CapsuleGeometry(0.09 * s, 0.3 * s, 3, 6);
        const thighMat = this._createMaterial(bodyCol);
        const leftThigh = new THREE.Mesh(thighGeo, thighMat);
        leftThigh.position.y = -0.2 * s;
        leftThigh.castShadow = true;
        leftLegGroup.add(leftThigh);

        // Shin
        const shinGeo = new THREE.CapsuleGeometry(0.07 * s, 0.28 * s, 3, 6);
        const shinMat = this._createMaterial(skinCol);
        const leftShin = new THREE.Mesh(shinGeo, shinMat);
        leftShin.position.y = -0.55 * s;
        leftShin.castShadow = true;
        leftLegGroup.add(leftShin);

        // Foot
        const footGeo = new THREE.BoxGeometry(0.1 * s, 0.06 * s, 0.18 * s);
        const footMat = this._createMaterial(0x333333, { roughness: 0.95 });
        const leftFoot = new THREE.Mesh(footGeo, footMat);
        leftFoot.position.set(0, -0.74 * s, 0.04 * s);
        leftLegGroup.add(leftFoot);

        group.add(leftLegGroup);

        // ── RIGHT LEG ──
        const rightLegGroup = new THREE.Group();
        rightLegGroup.position.set(0.15 * s, 0.68 * s, 0);

        const rightThigh = new THREE.Mesh(thighGeo, thighMat.clone());
        rightThigh.position.y = -0.2 * s;
        rightThigh.castShadow = true;
        rightLegGroup.add(rightThigh);

        const rightShin = new THREE.Mesh(shinGeo, shinMat.clone());
        rightShin.position.y = -0.55 * s;
        rightShin.castShadow = true;
        rightLegGroup.add(rightShin);

        const rightFoot = new THREE.Mesh(footGeo, footMat.clone());
        rightFoot.position.set(0, -0.74 * s, 0.04 * s);
        rightLegGroup.add(rightFoot);

        group.add(rightLegGroup);

        // ── TORN CLOTHING DETAILS ──
        // Tattered sleeve left
        const sleeveGeo = new THREE.CylinderGeometry(0.09 * s, 0.12 * s, 0.15 * s, 6);
        const sleeveMat = this._createMaterial(0x444444, { roughness: 0.95 });
        const leftSleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
        leftSleeve.position.set(-0.38 * s, 1.25 * s, 0);
        group.add(leftSleeve);

        const rightSleeve = new THREE.Mesh(sleeveGeo, sleeveMat.clone());
        rightSleeve.position.set(0.38 * s, 1.25 * s, 0);
        group.add(rightSleeve);

        // Tattered pants cuff
        const cuffGeo = new THREE.CylinderGeometry(0.09 * s, 0.1 * s, 0.08 * s, 6);
        const cuffMat = this._createMaterial(0x444444, { roughness: 0.95 });
        const leftCuff = new THREE.Mesh(cuffGeo, cuffMat);
        leftCuff.position.set(-0.15 * s, 0.42 * s, 0);
        group.add(leftCuff);

        const rightCuff = new THREE.Mesh(cuffGeo, cuffMat.clone());
        rightCuff.position.set(0.15 * s, 0.42 * s, 0);
        group.add(rightCuff);

        // Store references for animation
        group.userData = {
            torsoGroup,
            headGroup,
            leftArmGroup,
            rightArmGroup,
            leftLegGroup,
            rightLegGroup,
            jaw,
        };

        group.position.copy(this.position);
        return group;
    }

    _createHealthBar() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 8;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, 64, 8);
        ctx.fillStyle = '#c62828';
        ctx.fillRect(1, 1, 62, 6);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.3 });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(1.4, 0.22, 1);
        return sprite;
    }

    update(dt, targets, obstacles) {
        if (!this.alive) return;

        this._animTime += dt;

        // Hit flash effect
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= dt;
            this._applyHitFlash();
            if (this.hitFlashTimer <= 0) {
                this._clearHitFlash();
            }
        }

        this.thinkTimer -= dt;
        if (this.thinkTimer <= 0) {
            this.thinkTimer = this.thinkInterval;
            this._think(targets);
        }

        this._move(dt);
        this._updateCombat(dt);
        this._updateAnimation(dt);

        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;

        this.healthBar.position.copy(this.position);
        this.healthBar.position.y += 2.2 * this.scale;

        // Show health bar when chasing, attacking, or damaged
        const wantsBar = this.health < this.maxHealth ||
                         this.state === ZOMBIE_STATES.CHASING ||
                         this.state === ZOMBIE_STATES.ATTACKING;
        if (wantsBar) {
            this.healthBar.material.opacity = MathUtils.lerp(this.healthBar.material.opacity, 0.8, dt * 5);
            this._updateHealthBarTexture();
        } else {
            this.healthBar.material.opacity = MathUtils.lerp(this.healthBar.material.opacity, 0, dt * 3);
        }
    }

    _applyHitFlash() {
        const flashT = this.hitFlashTimer / this.hitFlashDuration;
        const intensity = flashT > 0.5 ? 0.8 : flashT * 1.6;
        this.mesh.traverse((child) => {
            if (child.isMesh && child.material && child.material.emissive) {
                child.material.emissive.setHex(0xff2222);
                child.material.emissiveIntensity = intensity;
            }
        });
    }

    _clearHitFlash() {
        this.mesh.traverse((child) => {
            if (child.isMesh && child.material && child.material.emissive) {
                // Don't clear emissive on eyes - they always glow
                const isEye = child.material.emissiveIntensity > 1;
                if (!isEye) {
                    child.material.emissive.setHex(0x000000);
                    child.material.emissiveIntensity = 0;
                }
            }
        });
    }

    _updateAnimation(dt) {
        const parts = this.mesh.userData;
        if (!parts) return;

        const s = this.scale;

        switch (this.state) {
            case ZOMBIE_STATES.CHASING:
            case ZOMBIE_STATES.ROAMING:
                this._animateWalk(dt, parts, s);
                break;
            case ZOMBIE_STATES.ATTACKING:
                this._animateAttack(dt, parts, s);
                break;
            case ZOMBIE_STATES.STAGGERED:
                this._animateStagger(dt, parts, s);
                break;
            case ZOMBIE_STATES.DYING:
                this._animateDeath(dt, parts, s);
                break;
            default:
                this._animateIdle(dt, parts, s);
                break;
        }
    }

    _animateWalk(dt, parts, s) {
        const walkSpeed = this.state === ZOMBIE_STATES.CHASING ? this.speed * 1.2 : this.speed * 0.8;
        this._walkCycle += dt * walkSpeed * 2;

        const legSwing = Math.sin(this._walkCycle) * 0.6;
        const armSwing = Math.sin(this._walkCycle + Math.PI) * 0.5;

        // Lean forward while chasing
        if (parts.torsoGroup) {
            const leanAngle = this.state === ZOMBIE_STATES.CHASING ? -0.25 : -0.15;
            parts.torsoGroup.rotation.x = leanAngle + Math.sin(this._walkCycle * 0.5) * 0.03;
        }

        // Head bob and look
        if (parts.headGroup) {
            parts.headGroup.rotation.x = -0.15 + Math.sin(this._walkCycle * 0.7) * 0.05;
            parts.headGroup.rotation.z = Math.sin(this._walkCycle * 0.3) * 0.06;
        }

        // Jaw snapping while chasing
        if (parts.jaw && this.state === ZOMBIE_STATES.CHASING) {
            parts.jaw.rotation.x = Math.abs(Math.sin(this._animTime * 5)) * 0.3;
        }

        // Arm swing - zombie-like forward reaching
        if (parts.leftArmGroup) {
            parts.leftArmGroup.rotation.x = -1.0 + armSwing * 0.3;
            parts.leftArmGroup.rotation.z = 0.15;
        }
        if (parts.rightArmGroup) {
            parts.rightArmGroup.rotation.x = -1.0 - armSwing * 0.3;
            parts.rightArmGroup.rotation.z = -0.15;
        }

        // Leg walk cycle
        if (parts.leftLegGroup) {
            parts.leftLegGroup.rotation.x = legSwing;
        }
        if (parts.rightLegGroup) {
            parts.rightLegGroup.rotation.x = -legSwing;
        }

        // Slight vertical bob
        this.position.y = this.baseY + Math.abs(Math.sin(this._walkCycle)) * 0.04 * s;
    }

    _animateAttack(dt, parts, s) {
        const windingUp = this.attackWindupTimer > 0;
        const windupT = windingUp
            ? 1 - this.attackWindupTimer / (this.attackWindup || 0.18)
            : 0;

        if (windingUp) {
            if (parts.torsoGroup) {
                parts.torsoGroup.rotation.x = -0.35 - windupT * 0.2;
            }
            if (parts.leftArmGroup) {
                parts.leftArmGroup.rotation.x = -0.6 - windupT * 0.9;
                parts.leftArmGroup.rotation.z = 0.4;
            }
            if (parts.rightArmGroup) {
                parts.rightArmGroup.rotation.x = -0.6 - windupT * 0.9;
                parts.rightArmGroup.rotation.z = -0.4;
            }
            if (parts.headGroup) {
                parts.headGroup.rotation.x = -0.1 - windupT * 0.25;
            }
            if (parts.jaw) {
                parts.jaw.rotation.x = windupT * 0.35;
            }
            return;
        }

        this._attackAnim += dt * 8;
        const swing = Math.sin(this._attackAnim);

        if (parts.torsoGroup) {
            parts.torsoGroup.rotation.x = -0.2 + swing * 0.15;
        }

        // Lunge forward with arms
        if (parts.leftArmGroup) {
            parts.leftArmGroup.rotation.x = -1.5 + swing * 0.8;
            parts.leftArmGroup.rotation.z = 0.3 + swing * 0.2;
        }
        if (parts.rightArmGroup) {
            parts.rightArmGroup.rotation.x = -1.5 - swing * 0.8;
            parts.rightArmGroup.rotation.z = -0.3 - swing * 0.2;
        }

        // Jaw snap
        if (parts.jaw) {
            parts.jaw.rotation.x = Math.abs(swing) * 0.5;
        }

        // Head forward
        if (parts.headGroup) {
            parts.headGroup.rotation.x = -0.3 + swing * 0.1;
        }
    }

    _animateStagger(dt, parts, s) {
        this._staggerAnim += dt * 6;

        // Lean back
        if (parts.torsoGroup) {
            parts.torsoGroup.rotation.x = 0.3 + Math.sin(this._staggerAnim) * 0.1;
        }

        // Arms flail
        if (parts.leftArmGroup) {
            parts.leftArmGroup.rotation.x = -0.5 + Math.sin(this._staggerAnim * 1.3) * 0.6;
            parts.leftArmGroup.rotation.z = 0.5 + Math.sin(this._staggerAnim) * 0.4;
        }
        if (parts.rightArmGroup) {
            parts.rightArmGroup.rotation.x = -0.5 - Math.sin(this._staggerAnim * 1.3) * 0.6;
            parts.rightArmGroup.rotation.z = -0.5 - Math.sin(this._staggerAnim) * 0.4;
        }

        // Head snap back
        if (parts.headGroup) {
            parts.headGroup.rotation.x = 0.4 + Math.sin(this._staggerAnim * 2) * 0.1;
        }
    }

    _animateDeath(dt, parts, s) {
        this._deathAnim = Math.min(this._deathAnim + dt * 2.5, 1);

        const t = this._deathAnim;
        const easeT = t * t; // Ease in

        if (this._deathFallForward) {
            // Fall forward
            this.mesh.rotation.x = easeT * (Math.PI / 2);
            this.position.y = this.baseY - easeT * 0.3 * s;
        } else {
            // Fall backward
            this.mesh.rotation.x = -easeT * (Math.PI / 2);
            this.position.y = this.baseY - easeT * 0.3 * s;
        }

        // Limbs go limp
        if (parts.leftArmGroup) {
            parts.leftArmGroup.rotation.x = -0.5 + easeT * 1.5;
            parts.leftArmGroup.rotation.z = easeT * 0.8;
        }
        if (parts.rightArmGroup) {
            parts.rightArmGroup.rotation.x = -0.5 + easeT * 1.2;
            parts.rightArmGroup.rotation.z = -easeT * 0.6;
        }

        // Ragdoll legs
        if (parts.leftLegGroup) {
            parts.leftLegGroup.rotation.x = easeT * 0.5;
        }
        if (parts.rightLegGroup) {
            parts.rightLegGroup.rotation.x = -easeT * 0.3;
        }
    }

    _animateIdle(dt, parts, s) {
        // Subtle breathing sway
        this._idleSway += dt * 0.8;
        const sway = Math.sin(this._idleSway) * 0.02;

        if (parts.torsoGroup) {
            parts.torsoGroup.rotation.z = sway;
            parts.torsoGroup.rotation.x = -0.05;
        }

        if (parts.headGroup) {
            parts.headGroup.rotation.z = sway * 1.5;
            parts.headGroup.rotation.x = Math.sin(this._idleSway * 0.7) * 0.03;
        }

        if (parts.leftArmGroup) {
            parts.leftArmGroup.rotation.x = -0.3 + Math.sin(this._idleSway * 1.1) * 0.05;
        }
        if (parts.rightArmGroup) {
            parts.rightArmGroup.rotation.x = -0.3 - Math.sin(this._idleSway * 1.1) * 0.05;
        }

        // Jaw randomly snaps
        if (parts.jaw) {
            parts.jaw.rotation.x = Math.random() < 0.01 ? 0.3 : MathUtils.lerp(parts.jaw.rotation.x, 0, dt * 5);
        }
    }

    _think(targets) {
        if (this.state === ZOMBIE_STATES.STAGGERED || this.state === ZOMBIE_STATES.DYING) return;

        this._targets = targets;

        let nearestTarget = null;
        let nearestDist = Infinity;

        for (const target of targets) {
            if (!target.alive) continue;
            const dist = this.position.distanceTo(target.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestTarget = target;
            }
        }

        if (!nearestTarget) {
            if (this.state !== ZOMBIE_STATES.ROAMING) {
                this._changeState(ZOMBIE_STATES.ROAMING);
            }
            return;
        }

        this.target = nearestTarget;

        if (nearestDist <= this.attackRange) {
            this._changeState(ZOMBIE_STATES.ATTACKING);
        } else if (nearestDist <= this.detectionRange) {
            this._changeState(ZOMBIE_STATES.CHASING);
        } else if (this.state !== ZOMBIE_STATES.ROAMING) {
            this._changeState(ZOMBIE_STATES.ROAMING);
        }
    }

    _move(dt) {
        switch (this.state) {
            case ZOMBIE_STATES.CHASING:
                if (this.target) {
                    const dir = this.target.position.clone().sub(this.position);
                    dir.y = 0;
                    dir.normalize();
                    this.position.x += dir.x * this.speed * dt;
                    this.position.z += dir.z * this.speed * dt;
                    this.rotation = Math.atan2(dir.x, dir.z);
                }
                break;

            case ZOMBIE_STATES.ROAMING:
                this.roamTimer -= dt;
                if (this.roamTimer <= 0 || !this.roamTarget) {
                    this.roamTimer = 2 + Math.random() * 2;
                    const targetPos = this._targets && this._targets.length > 0 ? this._targets[0].position : null;
                    if (targetPos) {
                        const toTarget = targetPos.clone().sub(this.position);
                        toTarget.y = 0;
                        toTarget.normalize().multiplyScalar(8 + Math.random() * 6);
                        const wobble = MathUtils.randomPointInCircle(3);
                        this.roamTarget = new THREE.Vector3(
                            this.position.x + toTarget.x + wobble.x,
                            0,
                            this.position.z + toTarget.z + wobble.z
                        );
                    } else {
                        const offset = MathUtils.randomPointInCircle(10);
                        this.roamTarget = new THREE.Vector3(
                            this.position.x + offset.x,
                            0,
                            this.position.z + offset.z
                        );
                    }
                }

                if (this.roamTarget) {
                    const dir = this.roamTarget.clone().sub(this.position);
                    dir.y = 0;
                    const dist = dir.length();
                    if (dist > 0.5) {
                        dir.normalize();
                        this.position.x += dir.x * this.speed * 0.6 * dt;
                        this.position.z += dir.z * this.speed * 0.6 * dt;
                        this.rotation = Math.atan2(dir.x, dir.z);
                    } else {
                        this.roamTarget = null;
                    }
                }
                break;

            case ZOMBIE_STATES.ATTACKING:
                if (this.target) {
                    const dir = this.target.position.clone().sub(this.position);
                    dir.y = 0;
                    this.rotation = Math.atan2(dir.x, dir.z);
                }
                break;
        }

        this.position.y = this.baseY;
    }

    get baseY() { return 0; }

    _updateCombat(dt) {
        if (this.state === ZOMBIE_STATES.STAGGERED) {
            this.staggerTimer -= dt;
            if (this.staggerTimer <= 0) {
                this._changeState(ZOMBIE_STATES.CHASING);
            }
            return;
        }

        if (this.state === ZOMBIE_STATES.ATTACKING) {
            if (this.attackWindupTimer > 0) {
                this.attackWindupTimer -= dt;
                return;
            }

            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.attackTimer = this.attackCooldown;
                this._performAttack();
                this._attackAnim = 0;
            }
        }
    }

    _performAttack() {
        if (!this.target || !this.target.alive) return;

        const dist = this.position.distanceTo(this.target.position);
        if (dist <= this.attackRange * 1.2) {
            this.target.takeDamage(this.damage, this.position);
        }
    }

    takeDamage(amount, sourcePos, isHeadshot = false) {
        if (!this.alive) return;

        let finalDamage = amount;
        if (isHeadshot) {
            finalDamage *= this.headshotMultiplier;
        }
        finalDamage *= (1 - this.armor);

        this.health -= finalDamage;
        this.hitFlashTimer = this.hitFlashDuration;

        if (this.scene.__gameRef?.particles && sourcePos) {
            const hitPos = this.position.clone();
            hitPos.y += 1.2 * this.scale;
            const hitDir = hitPos.clone().sub(sourcePos).normalize();
            this.scene.__gameRef.particles.emitHitImpact(hitPos, hitDir);
        }

        if (this.health <= 0) {
            this.health = 0;
            this._die();
            return;
        }

        if (finalDamage >= this.staggerThreshold && this.state !== ZOMBIE_STATES.STAGGERED) {
            this._changeState(ZOMBIE_STATES.STAGGERED);
            this.staggerTimer = 0.4 + Math.random() * 0.2;
        }
    }

    _die() {
        this.alive = false;
        this.deathTimer = 1.2;
        this._deathAnim = 0;
        this._deathFallForward = Math.random() > 0.5;
        this._deathFallDir = this.rotation;
        this._changeState(ZOMBIE_STATES.DYING);

        if (this.scene.__gameRef) {
            const game = this.scene.__gameRef;
            const burstPos = this.position.clone();
            burstPos.y += 1.1 * this.scale;
            if (game.particles) {
                game.particles.emitDeathBurst(burstPos, this.type);
            }
            if (game.cameraShake) {
                const shakeByType = { tank: 0.07, exploder: 0.055, spitter: 0.03, crawler: 0.022, runner: 0.02 };
                game.cameraShake.shake(shakeByType[this.type] || 0.02, 0.18);
            }
        }

        setTimeout(() => {
            if (this.mesh.parent) this.scene.remove(this.mesh);
            if (this.healthBar.parent) this.scene.remove(this.healthBar);
        }, 1200);
    }

    _changeState(newState) {
        if (this.state === newState) return;
        this.prevState = this.state;
        this.state = newState;
        this.stateTimer = 0;

        if (newState === ZOMBIE_STATES.ATTACKING) {
            const windup = this.attackWindup || 0.18;
            this.attackWindupTimer = windup * (0.75 + Math.random() * 0.5);
            this._attackAnim = 0;
        }
    }

    _updateHealthBarTexture() {
        const canvas = this.healthBar.material.map.image;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 64, 8);
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, 64, 8);
        const pct = this.health / this.maxHealth;
        ctx.fillStyle = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#ff9800' : '#c62828';
        ctx.fillRect(1, 1, 62 * pct, 6);
        this.healthBar.material.map.needsUpdate = true;
    }

    reset(x, z) {
        this.health = this.maxHealth;
        this.alive = true;
        this.position.set(x, this.baseY, z);
        this.target = null;
        this.attackWindupTimer = 0;
        this._changeState(ZOMBIE_STATES.IDLE);
        this.mesh.visible = true;
        this.mesh.rotation.set(0, 0, 0);
        this.mesh.position.set(x, 0, z);
        this.healthBar.material.opacity = 0;

        // Reset animations
        this._walkCycle = 0;
        this._attackAnim = 0;
        this._staggerAnim = 0;
        this._deathAnim = 0;
        this._idleSway = Math.random() * 10;

        // Reset hit flash
        this._clearHitFlash();
    }
}

export { ZOMBIE_STATES };
