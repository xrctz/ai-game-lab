const THREE = window.THREE;

export class Weapon {
    constructor(config) {
        this.name = config.name || 'Weapon';
        this.damage = config.damage || 25;
        this.headshotMultiplier = config.headshotMultiplier || 2.5;
        this.fireRate = config.fireRate || 0.1;
        this.reloadTime = config.reloadTime || 2.0;
        this.magazineSize = config.magazineSize || 30;
        this.reserveAmmo = config.reserveAmmo || 120;
        this.maxReserve = config.maxReserve || 120;
        this.spread = config.spread || 0.02;
        this.recoilX = config.recoilX || 0.01;
        this.recoilY = config.recoilY || 0.015;
        this.range = config.range || 100;
        this.automatic = config.automatic !== undefined ? config.automatic : true;
        this.pellets = config.pellets || 1;
        this.aimSpreadMultiplier = config.aimSpreadMultiplier || 0.4;
        this.aimRecoilMultiplier = config.aimRecoilMultiplier || 0.6;

        this.currentAmmo = this.magazineSize;
        this.fireTimer = 0;
        this.reloading = false;
        this.reloadTimer = 0;
        this.canFire = true;
    }

    update(dt) {
        if (this.fireTimer > 0) {
            this.fireTimer -= dt;
        }

        if (this.reloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.finishReload();
            }
        }
    }

    shouldFire(isTriggerHeld, isTriggerPressed) {
        return this.automatic ? isTriggerHeld : isTriggerPressed;
    }

    fire(aiming) {
        if (this.reloading || this.fireTimer > 0 || this.currentAmmo <= 0) return null;

        this.currentAmmo--;
        this.fireTimer = this.fireRate;

        const spreadMult = aiming ? this.aimSpreadMultiplier : 1;
        const recoilMult = aiming ? this.aimRecoilMultiplier : 1;

        const results = [];
        for (let i = 0; i < this.pellets; i++) {
            const spreadX = (Math.random() - 0.5) * this.spread * spreadMult;
            const spreadY = (Math.random() - 0.5) * this.spread * spreadMult;
            results.push({ spreadX, spreadY });
        }

        return {
            pellets: results,
            recoilX: this.recoilX * recoilMult * (0.9 + Math.random() * 0.2),
            recoilY: this.recoilY * recoilMult * (0.9 + Math.random() * 0.2),
            damage: this.damage,
            headshotMultiplier: this.headshotMultiplier,
            range: this.range
        };
    }

    reload() {
        if (this.reloading || this.currentAmmo === this.magazineSize || this.reserveAmmo <= 0) return false;
        this.reloading = true;
        this.reloadTimer = this.reloadTime;
        return true;
    }

    finishReload() {
        const needed = this.magazineSize - this.currentAmmo;
        const available = Math.min(needed, this.reserveAmmo);
        this.currentAmmo += available;
        this.reserveAmmo -= available;
        this.reloading = false;
    }

    addReserve(amount) {
        this.reserveAmmo = Math.min(this.maxReserve, this.reserveAmmo + amount);
    }

    reset() {
        this.currentAmmo = this.magazineSize;
        this.reserveAmmo = this.maxReserve;
        this.reloading = false;
        this.reloadTimer = 0;
        this.fireTimer = 0;
    }
}
