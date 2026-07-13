const SETTINGS_KEY = 'deadzone-settings-v1';

function loadPersistedSettings() {
    const defaults = { volume: 0.7, sensitivity: 5, fov: 75, showFPS: false };
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return { ...defaults };
        const parsed = JSON.parse(raw);
        return {
            volume: typeof parsed.volume === 'number' ? parsed.volume : defaults.volume,
            sensitivity: typeof parsed.sensitivity === 'number' ? parsed.sensitivity : defaults.sensitivity,
            fov: typeof parsed.fov === 'number' ? parsed.fov : defaults.fov,
            showFPS: typeof parsed.showFPS === 'boolean' ? parsed.showFPS : defaults.showFPS
        };
    } catch (e) {
        return { ...defaults };
    }
}

export class GameState {
    constructor() {
        this.state = 'loading';
        this.previousState = null;

        this.stats = {
            kills: 0,
            headshots: 0,
            shotsFired: 0,
            shotsHit: 0,
            wavesCompleted: 0,
            damageDealt: 0,
            damageTaken: 0,
            revives: 0,
            score: 0
        };

        this.wave = 0;
        this.difficulty = 1.0;
        this.currency = 0;
        this.paused = false;

        this.settings = loadPersistedSettings();
    }

    changeState(newState) {
        this.previousState = this.state;
        this.state = newState;
    }

    reset() {
        this.stats = {
            kills: 0, headshots: 0, shotsFired: 0, shotsHit: 0,
            wavesCompleted: 0, damageDealt: 0, damageTaken: 0,
            revives: 0, score: 0
        };
        this.wave = 0;
        this.difficulty = 1.0;
        this.currency = 0;
        this.paused = false;
    }

    addKill(headshot = false) {
        this.stats.kills++;
        if (headshot) this.stats.headshots++;
        this.stats.score += headshot ? 150 : 100;
        this.currency += headshot ? 15 : 10;
    }

    addShot(hit = false) {
        this.stats.shotsFired++;
        if (hit) this.stats.shotsHit++;
    }

    getAccuracy() {
        if (this.stats.shotsFired === 0) return 0;
        return Math.round((this.stats.shotsHit / this.stats.shotsFired) * 100);
    }

    getSettings() {
        return this.settings;
    }

    updateSetting(key, value) {
        if (key in this.settings) {
            this.settings[key] = value;
            try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
            } catch (e) {}
        }
    }
}
