import { MathUtils } from '../utils/MathUtils.js';

export class CameraShake {
    constructor() {
        this.intensity = 0;
        this.decay = 5;
        this.offsetX = 0;
        this.offsetY = 0;
        this.offsetZ = 0;
        this._punch = 0;
        this._phase = 0;
    }

    shake(intensity, duration = 0.2) {
        this.intensity = Math.max(this.intensity, intensity);
        this.decay = 1 / duration;
        this._punch = Math.max(this._punch, intensity * 1.8);
    }

    update(dt) {
        if (this.intensity > 0.001) {
            this._phase += dt * 45;
            const punchBoost = 1 + this._punch * 3;
            const osc = 0.65 + Math.sin(this._phase) * 0.35;
            const amp = this.intensity * punchBoost * osc;

            this.offsetX = (Math.random() - 0.5) * amp * 2;
            this.offsetY = (Math.random() - 0.5) * amp * 1.4;
            this.offsetZ = (Math.random() - 0.5) * amp * 0.35;

            this.intensity *= Math.exp(-this.decay * dt);
            this._punch = Math.max(0, this._punch - dt * this.decay * 4);
        } else {
            this.offsetX = 0;
            this.offsetY = 0;
            this.offsetZ = 0;
            this.intensity = 0;
            this._punch = 0;
        }
    }

    applyTo(camera) {
        camera.position.x += this.offsetX;
        camera.position.y += this.offsetY;
        camera.position.z += this.offsetZ;
    }

    reset() {
        this.intensity = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.offsetZ = 0;
        this._punch = 0;
        this._phase = 0;
    }
}
