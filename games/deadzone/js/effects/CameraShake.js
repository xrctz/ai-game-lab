import { MathUtils } from '../utils/MathUtils.js';

export class CameraShake {
    constructor() {
        this.intensity = 0;
        this.decay = 5;
        this.offsetX = 0;
        this.offsetY = 0;
        this.offsetZ = 0;
    }

    shake(intensity, duration = 0.2) {
        this.intensity = Math.max(this.intensity, intensity);
        this.decay = 1 / duration;
    }

    update(dt) {
        if (this.intensity > 0.001) {
            this.offsetX = (Math.random() - 0.5) * this.intensity;
            this.offsetY = (Math.random() - 0.5) * this.intensity;
            this.offsetZ = (Math.random() - 0.5) * this.intensity * 0.3;
            this.intensity *= Math.exp(-this.decay * dt);
        } else {
            this.offsetX = 0;
            this.offsetY = 0;
            this.offsetZ = 0;
            this.intensity = 0;
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
    }
}
