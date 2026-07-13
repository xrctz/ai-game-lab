import { Weapon } from './Weapon.js';

export class WeaponSystem {
    constructor(gameState) {
        this.gameState = gameState;

        this.weapons = [
            new Weapon({
                name: 'M4 CARBINE',
                damage: 28,
                headshotMultiplier: 2.5,
                fireRate: 0.09,
                reloadTime: 2.2,
                magazineSize: 30,
                reserveAmmo: 150,
                maxReserve: 150,
                spread: 0.025,
                recoilX: 0.008,
                recoilY: 0.014,
                range: 80,
                automatic: true,
                pellets: 1,
                aimSpreadMultiplier: 0.35,
                aimRecoilMultiplier: 0.55
            }),
            new Weapon({
                name: 'REMINGTON 870',
                damage: 18,
                headshotMultiplier: 2.0,
                fireRate: 0.7,
                reloadTime: 2.8,
                magazineSize: 8,
                reserveAmmo: 40,
                maxReserve: 40,
                spread: 0.08,
                recoilX: 0.015,
                recoilY: 0.035,
                range: 25,
                automatic: false,
                pellets: 8,
                aimSpreadMultiplier: 0.6,
                aimRecoilMultiplier: 0.75
            }),
            new Weapon({
                name: 'M1911',
                damage: 35,
                headshotMultiplier: 3.0,
                fireRate: 0.18,
                reloadTime: 1.6,
                magazineSize: 12,
                reserveAmmo: 60,
                maxReserve: 60,
                spread: 0.03,
                recoilX: 0.012,
                recoilY: 0.02,
                range: 50,
                automatic: false,
                pellets: 1,
                aimSpreadMultiplier: 0.3,
                aimRecoilMultiplier: 0.5
            })
        ];

        this.currentIndex = 0;
        this.grenades = 3;
        this.maxGrenades = 5;
        this._switchPulse = 0;
    }

    getCurrent() {
        return this.weapons[this.currentIndex];
    }

    switchTo(index) {
        if (index >= 0 && index < this.weapons.length && index !== this.currentIndex) {
            this.currentIndex = index;
            this._switchPulse = 0.15;
            return true;
        }
        return false;
    }

    update(dt) {
        if (this._switchPulse > 0) {
            this._switchPulse -= dt;
        }
        this.getCurrent().update(dt);
    }

    fire(aiming) {
        return this.getCurrent().fire(aiming);
    }

    reload() {
        return this.getCurrent().reload();
    }

    throwGrenade() {
        if (this.grenades <= 0) return false;
        this.grenades--;
        return true;
    }

    addGrenade() {
        this.grenades = Math.min(this.maxGrenades, this.grenades + 1);
    }

    reset() {
        for (const weapon of this.weapons) {
            weapon.reset();
        }
        this.currentIndex = 0;
        this.grenades = 3;
        this._switchPulse = 0;
    }

    isSwitching() {
        return this._switchPulse > 0;
    }
}
