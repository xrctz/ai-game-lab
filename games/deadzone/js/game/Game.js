const THREE = window.THREE;
import { Renderer } from '../engine/Renderer.js';
import { Input } from '../engine/Input.js';
import { AudioSystem } from '../engine/Audio.js';
import { GameState } from './GameState.js';
import { Player } from '../player/Player.js';
import { WeaponSystem } from '../player/WeaponSystem.js';
import { AllySquad } from '../ai/AllySquad.js';
import { ZombieManager } from '../enemies/ZombieManager.js';
import { Level } from '../level/Level.js';
import { CityLevel } from '../level/CityLevel.js';
import { WaveManager } from '../wave/WaveManager.js';
import { UIManager } from '../ui/UIManager.js';
import { ParticleSystem } from '../effects/Particles.js';
import { CameraShake } from '../effects/CameraShake.js';
import { MathUtils } from '../utils/MathUtils.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(this.canvas);
        this.input = new Input();
        this.audio = new AudioSystem();
        this.gameState = new GameState();
        this.ui = new UIManager(this.gameState);

        this.player = new Player(this.renderer.camera, this.renderer.scene);
        this.player.onDamage = (amount, attackerPos) => {
            this.ui.showDamageVignette(amount / 30);
            this.ui.showDamageDirection(attackerPos, this.player.position, this.player.rotation);
            this.cameraShake.shake(amount * 0.003);
            this.audio.play('damage');
        };
        this.weaponSystem = new WeaponSystem(this.gameState);
        this.allySquad = new AllySquad(this.renderer.scene);
        this.zombieManager = new ZombieManager(this.renderer.scene);
        this.level = null;
        this.selectedMap = 'outpost';
        this.waveManager = new WaveManager();
        this.particles = new ParticleSystem(this.renderer.scene);
        this.cameraShake = new CameraShake();

        this.renderer.scene.__gameRef = this;

        this.raycaster = new THREE.Raycaster();
        this.clock = new THREE.Clock();

        this.footstepTimer = 0;
        this.footstepInterval = 0.4;
        this.growlTimer = 0;
        this.growlInterval = 5;

        this.frameCount = 0;
        this.fpsTimer = 0;
        this.currentFPS = 60;

        this.timeScale = 1.0;
        this.timeScaleTarget = 1.0;
        this.slowMotionTimer = 0;

        this.killStreak = 0;
        this.killStreakTimer = 0;
        this.killStreakDecay = 3;
        this.bestCombo = 0;

        this.drops = [];
        this.dropChance = 0.22;
        this.dropLifetime = 20;
        this._waveStatsSnapshot = null;

        this.muzzleFlashTimer = 0;

        this.crosshairSpread = 0;
        this.crosshairSpreadTarget = 0;

        this.upgrades = [];
        this.shopOpen = false;
        this._initUpgrades();

        this.combatIntensity = 0;
        this.tensionBase = 0.3;
        this._waveCompleteHandled = false;

        this.gameState._purchaseUpgrade = (index) => this._purchaseUpgrade(index);

        this.embedded = false;
        try { this.embedded = window.self !== window.top; } catch(e) { this.embedded = true; }
        if (/[?&]embed=1(?:&|$)/.test(location.search)) this.embedded = true;

        this._bindEvents();
    }

    _initUpgrades() {
        this.upgrades = [
            { name: 'MEDKIT', desc: 'Restore 50 HP', cost: 50, maxed: false, fn: () => { this.player.heal(50); } },
            { name: 'VITALITY', desc: '+25 Max Health', cost: 100, maxed: false, fn: () => { this.player.maxHealth += 25; this.player.heal(25); }, level: 0, maxLevel: 3 },
            { name: 'ARMOR', desc: 'Reduce damage 10%', cost: 150, maxed: false, fn: () => { this.player.armor = Math.min(0.5, (this.player.armor || 0) + 0.1); }, level: 0, maxLevel: 3 },
            { name: 'AMMO RESERVE', desc: '+40 reserve ammo', cost: 75, maxed: false, fn: () => { for (const w of this.weaponSystem.weapons) w.addReserve(40); }, level: 0, maxLevel: 4 },
            { name: 'SHARPENED', desc: '+15% weapon damage', cost: 125, maxed: false, fn: () => { for (const w of this.weaponSystem.weapons) { w.damage = Math.floor(w.damage * 1.15); } }, level: 0, maxLevel: 3 },
            { name: 'GRENADES', desc: '+2 grenades', cost: 50, maxed: false, fn: () => { this.weaponSystem.addGrenade(); this.weaponSystem.addGrenade(); }, level: 0, maxLevel: 5 },
        ];
    }

    _bindEvents() {
        document.getElementById('btn-select-map').addEventListener('click', () => {
            this.ui.showMenu('map-select-screen');
        });
        document.getElementById('btn-map-start').addEventListener('click', () => this.startGame());
        document.getElementById('btn-map-back').addEventListener('click', () => this.ui.showMenu('main-menu'));
        document.getElementById('btn-controls').addEventListener('click', () => this.ui.showMenu('controls-screen'));
        document.getElementById('btn-settings').addEventListener('click', () => {
            this.ui.showMenu('settings-screen');
            this.ui.updateSettings(this.gameState.settings);
        });
        document.getElementById('btn-controls-back').addEventListener('click', () => this.ui.showMenu('main-menu'));
        document.getElementById('btn-settings-back').addEventListener('click', () => this.ui.showMenu('main-menu'));

        // Map selection cards
        document.querySelectorAll('.map-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedMap = card.dataset.map;
            });
        });
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-restart').addEventListener('click', () => this.restartGame());
        document.getElementById('btn-quit').addEventListener('click', () => this.quitToMenu());
        document.getElementById('btn-retry').addEventListener('click', () => this.restartGame());
        document.getElementById('btn-go-menu').addEventListener('click', () => this.quitToMenu());
        document.getElementById('btn-v-next').addEventListener('click', () => this.restartGame());
        document.getElementById('btn-v-menu').addEventListener('click', () => this.quitToMenu());

        document.getElementById('setting-volume').addEventListener('input', (e) => {
            const val = e.target.value / 100;
            this.gameState.updateSetting('volume', val);
            this.audio.setVolume(val);
        });

        document.getElementById('setting-sensitivity').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.gameState.updateSetting('sensitivity', val);
            this.input.setSensitivity(val);
        });

        document.getElementById('setting-fov').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.gameState.updateSetting('fov', val);
            this.renderer.setFOV(val);
        });

        document.getElementById('setting-fps').addEventListener('change', (e) => {
            this.gameState.updateSetting('showFPS', e.target.checked);
        });

        document.querySelectorAll('.wheel-option').forEach(option => {
            option.addEventListener('click', () => {
                const cmd = option.dataset.command;
                this.allySquad.issueCommand(cmd);
                this.ui.hideSquadWheel();
            });
        });

        this.canvas.addEventListener('click', () => {
            if (this.gameState.state === 'playing' && !this.input.isLocked()) {
                this.input.requestPointerLock(this.canvas);
                this.audio.init();
            }
        });
    }

    async init() {
        this.ui.updateLoading(10, 'BUILDING LEVEL...');
        await this._delay(100);

        this.level = new Level(this.renderer.scene);
        this.level.build();

        this.ui.updateLoading(30, 'INITIALIZING AI...');
        await this._delay(100);

        this.allySquad.init();

        this.ui.updateLoading(50, 'LOADING WEAPONS...');
        await this._delay(100);

        this.ui.updateLoading(70, 'PREPARING ZOMBIES...');
        await this._delay(100);

        this.ui.updateLoading(90, 'FINALIZING...');
        await this._delay(200);

        this.ui.updateLoading(100, 'READY');
        await this._delay(300);

        this.ui.hideLoading();
        this.ui.showMenu('main-menu');
        this.gameState.changeState('menu');

        this._gameLoop();
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _gameLoop() {
        requestAnimationFrame(() => this._gameLoop());

        const rawDt = Math.min(this.clock.getDelta(), 0.05);

        this.frameCount++;
        this.fpsTimer += rawDt;
        if (this.fpsTimer >= 1.0) {
            this.currentFPS = this.frameCount;
            this.frameCount = 0;
            this.fpsTimer = 0;
        }

        if (this.slowMotionTimer > 0) {
            this.slowMotionTimer -= rawDt;
            this.timeScaleTarget = 1.0;
        }
        this.timeScale += (this.timeScaleTarget - this.timeScale) * rawDt * 8;

        const dt = rawDt * this.timeScale;

        switch (this.gameState.state) {
            case 'playing':
                this._updatePlaying(dt);
                break;
            case 'paused':
                break;
        }

        this.renderer.render();
        this.input.update();
    }

    _updatePlaying(dt) {
        if (this.gameState.paused) return;

        this._updateShopLogic(dt);

        this._handleInput(dt);

        this.player.update(dt, this.input);
        this.weaponSystem.update(dt);

        const allTargets = [this.player, ...this.allySquad.getAliveAllies()];
        this.zombieManager.update(dt, allTargets);
        this.allySquad.update(dt, this.player.position, this.zombieManager.getAliveZombies(), this.gameState);

        this.waveManager.update(dt, this.zombieManager, this.level.getSpawnPoints());
        this._handleWaveEvents();

        const pickup = this.level.updatePickups(dt, this.player);
        if (pickup) this._handlePickup(pickup);

        this._updateDrops(dt);

        this.particles.update(dt);
        this.cameraShake.update(dt);
        this.cameraShake.applyTo(this.renderer.camera);

        this._updateFootsteps(dt);
        this._updateAmbientGrowls(dt);

        if (this.killStreakTimer > 0) {
            this.killStreakTimer -= dt;
            if (this.killStreakTimer <= 0) {
                this.killStreak = 0;
            }
        }

        if (this.muzzleFlashTimer > 0) {
            this.muzzleFlashTimer -= dt;
        }

        this.crosshairSpreadTarget = this.muzzleFlashTimer > 0 ? 0.8 : 0;
        this.crosshairSpreadTarget = this.player.aiming ? this.crosshairSpreadTarget * 0.3 : this.crosshairSpreadTarget;
        this.crosshairSpread += (this.crosshairSpreadTarget - this.crosshairSpread) * dt * 12;

        const nearbyZombies = this.zombieManager.getAliveZombies().filter(z =>
            z.position.distanceTo(this.player.position) < 15
        ).length;
        const targetIntensity = nearbyZombies > 5 ? 1 : nearbyZombies > 3 ? 0.7 : nearbyZombies > 1 ? 0.4 : 0.1;
        this.combatIntensity += (targetIntensity - this.combatIntensity) * dt * 3;
        if (this.audio.ctx && this.audio.ambientGain) {
            this.audio.ambientGain.gain.value = this.tensionBase + this.combatIntensity * 0.3;
        }

        if (!this.player.alive && this.gameState.state === 'playing') {
            this._gameOver();
        }

        if (this.waveManager.isGameComplete() && this.gameState.state === 'playing') {
            this._victory();
        }

        this.ui.updateHUD(this.player, this.weaponSystem.getCurrent(), this.allySquad.getAllAllies(), this.waveManager, this.currentFPS, this.weaponSystem.currentIndex, this.crosshairSpread);

        this.ui.updateCombo(this.killStreak, this.killStreakTimer / this.killStreakDecay, this._comboMultiplier());

        // Update damage numbers and low health pulse
        this.ui.updateDamageNumbers(dt);
        this.ui.showLowHealthPulse((this.player.health / this.player.maxHealth) * 100);
    }

    _comboMultiplier() {
        return 1 + Math.min(this.killStreak, 10) * 0.1;
    }

    _handleInput(dt) {
        if (this.input.isKeyJustPressed('Escape')) {
            if (this.shopOpen) {
                this._closeShop();
                return;
            }
            this.togglePause();
            return;
        }

        if (!this.input.isLocked()) return;

        if (this.shopOpen) return;

        if (this.input.isMouseDown(0)) {
            this._fireWeapon();
        }

        if (this.input.isKeyJustPressed('KeyR')) {
            if (this.weaponSystem.reload()) {
                this.audio.play('reload');
            }
        }

        if (this.input.isKeyJustPressed('Digit1')) { this.weaponSystem.switchTo(0); this.player.switchViewmodel(0); this.player.playViewmodelSwap(); }
        if (this.input.isKeyJustPressed('Digit2')) { this.weaponSystem.switchTo(1); this.player.switchViewmodel(1); this.player.playViewmodelSwap(); }
        if (this.input.isKeyJustPressed('Digit3')) { this.weaponSystem.switchTo(2); this.player.switchViewmodel(2); this.player.playViewmodelSwap(); }

        if (this.input.isKeyJustPressed('KeyG')) {
            this._throwGrenade();
        }

        if (this.input.isKeyJustPressed('KeyV')) {
            this._meleeShove();
        }

        if (this.input.isKeyJustPressed('KeyQ')) {
            this.allySquad.issueCommand('follow');
            this.audio.play('allyCallout');
        }
        if (this.input.isKeyJustPressed('KeyE')) {
            if (!this._handleRevive()) {
                this.allySquad.issueCommand('hold');
            }
            this.audio.play('allyCallout');
        }
        if (this.input.isKeyJustPressed('KeyF')) {
            this.allySquad.issueCommand('focus');
            this.audio.play('allyCallout');
        }
        if (this.input.isKeyJustPressed('KeyX')) {
            this.allySquad.issueCommand('regroup');
            this.audio.play('allyCallout');
        }

        if (this.input.isKeyJustPressed('KeyT')) {
            this.player.toggleFlashlight();
        }

        if (this.input.isKeyJustPressed('Tab')) {
            this.ui.showSquadWheel();
        }
        if (!this.input.isKeyDown('Tab') && this.ui.get('squad-wheel') && !this.ui.get('squad-wheel').classList.contains('hidden')) {
            this.ui.hideSquadWheel();
        }
    }

    _fireWeapon() {
        const weapon = this.weaponSystem.getCurrent();
        if (!weapon || weapon.reloading) return;

        const result = this.weaponSystem.fire(this.player.aiming);
        if (!result) {
            if (weapon.currentAmmo <= 0) {
                this.audio.play('empty');
                this.weaponSystem.reload();
                this.audio.play('reload');
            }
            return;
        }

        this.gameState.addShot();
        this.audio.play(weapon.name.includes('870') ? 'shotgunShot' : weapon.name.includes('1911') ? 'pistolShot' : 'rifleShot');

        this.muzzleFlashTimer = 0.05;
        this.player.applyRecoil(result.recoilX, result.recoilY);
        this.cameraShake.shake(0.03 + result.recoilY * 0.5);

        // Viewmodel recoil kick
        const recoilAmount = weapon.name.includes('870') ? 3.0 : weapon.name.includes('1911') ? 1.5 : 1.2;
        this.player.applyViewmodelRecoil(recoilAmount);

        const lookDir = this.player.getLookDirection();
        const origin = this.renderer.camera.position.clone();

        for (const pellet of result.pellets) {
            const dir = lookDir.clone();
            dir.x += pellet.spreadX;
            dir.y += pellet.spreadY;
            dir.normalize();

            this.raycaster.set(origin, dir);
            this.raycaster.far = result.range;

            const zombieMeshes = [];
            for (const zombie of this.zombieManager.getAliveZombies()) {
                zombieMeshes.push(zombie.mesh);
            }

            const intersects = this.raycaster.intersectObjects(zombieMeshes, true);

            if (intersects.length > 0) {
                const hit = intersects[0];
                let hitZombie = null;

                for (const zombie of this.zombieManager.getAliveZombies()) {
                    if (zombie.mesh === hit.object || zombie.mesh.children.includes(hit.object)) {
                        hitZombie = zombie;
                        break;
                    }
                }

                if (hitZombie) {
                    const isHeadshot = hit.point.y > hitZombie.position.y + 1.4 * hitZombie.scale;
                    hitZombie.takeDamage(result.damage, this.player.position, isHeadshot);

                    this.gameState.addShot(true);
                    this.ui.showHitMarker(isHeadshot);
                    this.audio.play(isHeadshot ? 'headshot' : 'hit');

                    this.particles.emitBlood(hit.point, dir.clone().negate());

                    // Floating damage number
                    const dmgAmount = isHeadshot ? result.damage * hitZombie.headshotMultiplier * (1 - hitZombie.armor) : result.damage * (1 - hitZombie.armor);
                    this.ui.showDamageNumber(hit.point.clone(), dmgAmount, isHeadshot, this.renderer.camera, this.renderer.renderer.domElement);

                    if (!hitZombie.alive) {
                        this.killStreak++;
                        this.killStreakTimer = this.killStreakDecay;
                        if (this.killStreak > this.bestCombo) this.bestCombo = this.killStreak;

                        this.gameState.addKill(isHeadshot, this._comboMultiplier());
                        this.audio.play('zombieDeath');

                        this._maybeDropPickup(hitZombie.position);

                        if (isHeadshot) {
                            this.slowMotionTimer = 0.15;
                            this.cameraShake.shake(0.08);
                        }

                        if (this.killStreak >= 5 && this.killStreak % 5 === 0) {
                            this.ui.showStreakAnnounce(this.killStreak);
                            this.slowMotionTimer = 0.25;
                        }

                        this.ui.addKillFeed(`${this.weaponSystem.getCurrent().name} > ${hitZombie.type.toUpperCase()} ${isHeadshot ? '(HEADSHOT)' : ''}`);
                    } else if (isHeadshot) {
                        this.cameraShake.shake(0.05);
                    }
                } else {
                    this.particles.emitSparks(hit.point);
                }
            }
        }
    }

    _throwGrenade() {
        if (!this.weaponSystem.throwGrenade()) return;

        const forward = this.player.getLookDirection();
        const pos = this.renderer.camera.position.clone().add(forward.clone().multiplyScalar(2));

        this.particles.emitExplosion(pos);

        const targets = [this.player, ...this.allySquad.getAliveAllies(), ...this.zombieManager.getAliveZombies()];
        for (const target of targets) {
            const dist = pos.distanceTo(target.position);
            if (dist < 6) {
                const falloff = 1 - (dist / 6);
                const dmg = target === this.player ? 40 * falloff : 80 * falloff;
                target.takeDamage(dmg, pos);
            }
        }

        this.audio.play('grenade');
        this.cameraShake.shake(0.15);
    }

    _meleeShove() {
        this.audio.play('melee');

        for (const zombie of this.zombieManager.getAliveZombies()) {
            const dist = this.player.position.distanceTo(zombie.position);
            if (dist < 2.5) {
                const pushDir = zombie.position.clone().sub(this.player.position).normalize();
                zombie.position.add(pushDir.multiplyScalar(2));
                zombie.takeDamage(15, this.player.position, false);
            }
        }
    }

    _handleRevive() {
        for (const ally of this.allySquad.getDownedAllies()) {
            const dist = this.player.position.distanceTo(ally.position);
            if (dist < 2.5) {
                ally.revive();
                this.gameState.stats.revives++;
                this.audio.play('pickup');
                this.ui.addKillFeed(`Revived ${ally.name}`);
                return true;
            }
        }
        return false;
    }

    _handlePickup(type) {
        switch (type) {
            case 'ammo':
                this.weaponSystem.getCurrent().addReserve(30);
                this.audio.play('pickup');
                break;
            case 'health':
                this.player.heal(25);
                this.audio.play('pickup');
                break;
            case 'grenade':
                this.weaponSystem.addGrenade();
                this.audio.play('pickup');
                break;
        }
    }

    _maybeDropPickup(position) {
        if (Math.random() > this.dropChance) return;
        if (this.drops.length >= 8) return;

        const type = Math.random() < 0.6 ? 'ammo' : 'health';
        const color = type === 'ammo' ? 0xffaa00 : 0x00ff44;

        const geo = new THREE.OctahedronGeometry(0.2, 0);
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.6,
            roughness: 0.3
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(position.x, 0.6, position.z);
        this.renderer.scene.add(mesh);

        this.drops.push({ mesh, type, timer: this.dropLifetime });
    }

    _updateDrops(dt) {
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const drop = this.drops[i];
            drop.timer -= dt;

            drop.mesh.rotation.y += dt * 3;
            drop.mesh.position.y = 0.6 + Math.sin(Date.now() * 0.004 + i) * 0.12;

            // Blink during the last few seconds before despawning
            drop.mesh.visible = drop.timer > 4 || Math.sin(drop.timer * 10) > -0.2;

            if (drop.timer <= 0) {
                this.renderer.scene.remove(drop.mesh);
                this.drops.splice(i, 1);
                continue;
            }

            if (this.player.alive && drop.mesh.position.distanceTo(this.player.position) < 1.5) {
                this.renderer.scene.remove(drop.mesh);
                this.drops.splice(i, 1);
                this._handlePickup(drop.type);
                this.ui.addKillFeed(drop.type === 'ammo' ? 'Picked up ammo' : 'Picked up medkit');
            }
        }
    }

    _clearDrops() {
        for (const drop of this.drops) {
            this.renderer.scene.remove(drop.mesh);
        }
        this.drops = [];
    }

    _handleWaveEvents() {
        if (this.waveManager.isWaveComplete() && !this._waveCompleteHandled) {
            this._waveCompleteHandled = true;
            this.gameState.stats.wavesCompleted = this.waveManager.currentWave;
            this.audio.play('waveEnd');
            this.ui.addKillFeed(`Wave ${this.waveManager.currentWave} complete!`);
            this.ui.showWaveSummary(this.waveManager.currentWave, this._getWaveStats());
        }

        if (this.waveManager.shouldStartNext()) {
            this._waveCompleteHandled = false;
            const config = this.waveManager.startWave(this.zombieManager, this.level.getSpawnPoints());
            this.audio.play('waveStart');
            this.ui.showWaveAnnounce(this.waveManager.currentWave);
            this._snapshotWaveStats();
        }
    }

    _snapshotWaveStats() {
        this._waveStatsSnapshot = {
            kills: this.gameState.stats.kills,
            headshots: this.gameState.stats.headshots,
            shotsFired: this.gameState.stats.shotsFired,
            shotsHit: this.gameState.stats.shotsHit
        };
        this.bestCombo = 0;
    }

    _getWaveStats() {
        const snap = this._waveStatsSnapshot || { kills: 0, headshots: 0, shotsFired: 0, shotsHit: 0 };
        const shots = this.gameState.stats.shotsFired - snap.shotsFired;
        const hits = this.gameState.stats.shotsHit - snap.shotsHit;
        return {
            kills: this.gameState.stats.kills - snap.kills,
            headshots: this.gameState.stats.headshots - snap.headshots,
            accuracy: shots > 0 ? Math.round((hits / shots) * 100) : 0,
            bestCombo: this.bestCombo
        };
    }

    _updateFootsteps(dt) {
        if (!this.player.isMoving() || !this.player.onGround) return;
        this.footstepTimer -= dt;
        if (this.footstepTimer <= 0) {
            this.footstepTimer = this.player.sprinting ? 0.3 : this.footstepInterval;
            this.audio.play('footstep', 0.3);
        }
    }

    _updateAmbientGrowls(dt) {
        this.growlTimer -= dt;
        if (this.growlTimer <= 0) {
            this.growlTimer = this.growlInterval + Math.random() * 5;
            const zombies = this.zombieManager.getAliveZombies();
            if (zombies.length > 0) {
                const zombie = zombies[MathUtils.randomInt(0, zombies.length - 1)];
                this.audio.playPositional('zombieGrowl', zombie.position, this.player.position, 0.3);
            }
        }
    }

    _buildSelectedMap() {
        // Clear ALL scene children except the camera
        const toRemove = [];
        this.renderer.scene.traverse(child => {
            if (child !== this.renderer.scene && child !== this.renderer.camera && child.parent === this.renderer.scene) {
                toRemove.push(child);
            }
        });
        for (const obj of toRemove) {
            this.renderer.scene.remove(obj);
        }

        // Re-add the camera (it was removed as a child)
        if (!this.renderer.camera.parent) {
            this.renderer.scene.add(this.renderer.camera);
        }

        // Build the selected map
        if (this.selectedMap === 'city') {
            this.level = new CityLevel(this.renderer.scene);
        } else {
            this.level = new Level(this.renderer.scene);
        }
        this.level.build();
    }

    startGame() {
        this.gameState.reset();
        this.gameState.changeState('playing');

        this.ui.hideAll();
        this.ui.show('hud');

        // Clean up existing entities before rebuilding scene
        this.zombieManager.clear();
        this.particles.clear();
        this._clearDrops();

        // Rebuild the selected map (clears scene and builds new geometry)
        this._buildSelectedMap();

        // Reinitialize ally squad (meshes were removed from scene)
        this.allySquad = new AllySquad(this.renderer.scene);
        this.allySquad.init();

        this.player.reset();
        this.weaponSystem.reset();
        this.waveManager.reset();
        this.cameraShake.reset();
        this._initUpgrades();
        this.shopOpen = false;
        this._waveCompleteHandled = false;

        this.renderer.camera.position.copy(this.player.position);
        this.renderer.setFOV(this.gameState.settings.fov);
        this.input.setSensitivity(this.gameState.settings.sensitivity);
        this.audio.setVolume(this.gameState.settings.volume);

        this.audio.init();
        this.audio.startAmbient();

        this.input.requestPointerLock(this.canvas);

        // Hide embed overlay on game start
        var embedOverlay = document.getElementById('embed-overlay');
        if (embedOverlay) embedOverlay.style.display = 'none';

        this.killStreak = 0;
        this.killStreakTimer = 0;

        this.waveManager.startWave(this.zombieManager, this.level.getSpawnPoints());
        this.ui.showWaveAnnounce(1, 'SURVIVE THE HORDE');
        this._snapshotWaveStats();
    }

    restartGame() {
        this.ui.hideAll();
        this.startGame();
    }

    togglePause() {
        if (this.gameState.state !== 'playing' && this.gameState.state !== 'paused') return;

        this.gameState.paused = !this.gameState.paused;

        if (this.gameState.paused) {
            this.gameState.changeState('paused');
            this.ui.show('pause-menu');
            this.input.exitPointerLock();
        } else {
            this.gameState.changeState('playing');
            this.ui.hide('pause-menu');
            this.input.requestPointerLock(this.canvas);
        }
    }

    quitToMenu() {
        this.gameState.changeState('menu');
        this.ui.hideAll();
        this.ui.showMenu('main-menu');
        this.input.exitPointerLock();
        this.zombieManager.clear();
        this.particles.clear();
        this._clearDrops();
    }

    _gameOver() {
        this.gameState.changeState('gameover');
        this.input.exitPointerLock();
        this.ui.hide('hud');
        this.ui.showGameOver({
            wavesCompleted: this.gameState.stats.wavesCompleted,
            kills: this.gameState.stats.kills,
            headshots: this.gameState.stats.headshots,
            accuracy: this.gameState.getAccuracy()
        });
    }

    _victory() {
        this.gameState.changeState('victory');
        this.input.exitPointerLock();
        this.ui.hide('hud');
        this.ui.showVictory({
            wavesCompleted: this.gameState.stats.wavesCompleted,
            kills: this.gameState.stats.kills,
            headshots: this.gameState.stats.headshots,
            score: this.gameState.stats.score
        });
    }

    _openShop() {
        this.shopOpen = true;
        this.input.exitPointerLock();
        this._updateShopUI();
    }

    _closeShop() {
        this.shopOpen = false;
        this.ui.hideShop();
        this.ui.hide('interaction-prompt');
        this.ui.show('hud');
        if (this.gameState.state === 'playing') {
            this.input.requestPointerLock(this.canvas);
        }
    }

    _updateShopLogic(dt) {
        if (!this.shopOpen && this.waveManager.isBetween()) {
            this.ui.showInteraction('Press B - Supply Depot');
            if (this.input.isKeyJustPressed('KeyB')) {
                this._openShop();
            }
        } else if (!this.shopOpen) {
            this.ui.hide('interaction-prompt');
        }
        if (this.shopOpen) {
            if (!this.waveManager.isBetween()) {
                this._closeShop();
            } else if (this.input.isKeyJustPressed('KeyB')) {
                this._closeShop();
            }
        }
    }

    _updateShopUI() {
        this.ui.hide('hud');
        this.ui.showShop(this.gameState.currency, this._getUpgradeStates());
    }

    _getUpgradeStates() {
        return this.upgrades.map(u => ({
            name: u.name,
            desc: u.desc,
            cost: u.cost * ((u.level || 0) + 1),
            maxed: u.level !== undefined && u.level >= u.maxLevel
        }));
    }

    _purchaseUpgrade(index) {
        const upgrade = this.upgrades[index];
        if (!upgrade) return;
        const cost = upgrade.cost * ((upgrade.level || 0) + 1);
        if (this.gameState.currency < cost) return;
        if (upgrade.maxed) return;
        if (upgrade.level !== undefined && upgrade.level >= upgrade.maxLevel) return;

        this.gameState.currency -= cost;
        upgrade.fn();
        upgrade.level = (upgrade.level || 0) + 1;
        if (upgrade.level >= upgrade.maxLevel) upgrade.maxed = true;

        this.audio.play('pickup');
        this._updateShopUI();
    }
}
