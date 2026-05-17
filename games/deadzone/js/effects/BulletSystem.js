// --- effects/BulletSystem.js ---

class Bullet {
    constructor(scene) {
        this.scene = scene;
        this.alive = false;
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.distanceTraveled = 0;
        this.maxRange = 200;
        this.mesh = null;
    }
    spawn(origin, direction, speed, range, color) {
        this.alive = true;
        this.position.copy(origin);
        this.velocity.copy(direction).multiplyScalar(speed);
        this.distanceTraveled = 0;
        this.maxRange = range || 200;
        if (!this.mesh) {
            const tracerGeo = new THREE.CylinderGeometry(0.008, 0.003, 0.15, 4);
            tracerGeo.rotateX(Math.PI / 2);
            const tracerMat = new THREE.MeshBasicMaterial({color: color || 0xffdd44, transparent: true, opacity: 0.95});
            this.mesh = new THREE.Mesh(tracerGeo, tracerMat);
        } else {
            this.mesh.material.color.set(color || 0xffdd44);
            this.mesh.material.opacity = 0.95;
        }
        this.mesh.position.copy(origin);
        this.mesh.lookAt(origin.clone().add(direction));
        this.mesh.visible = true;
        this.scene.add(this.mesh);
    }
    release() {
        this.alive = false;
        this.distanceTraveled = 0;
        if (this.mesh) {
            this.mesh.visible = false;
            if (this.mesh.parent) this.scene.remove(this.mesh);
        }
    }
}

class BulletSystem {
    constructor(scene, particles) {
        this.scene = scene;
        this.particles = particles;
        this.bulletPool = [];
        this.activeBullets = [];
        this.maxBullets = 50;
        this.shellCasings = [];
        this.maxShellCasings = 30;
        this.impactMarks = [];
        this.maxImpactMarks = 50;
        this._sweepRay = new THREE.Raycaster();
        this._aabbBox = new THREE.Box3();
        for (let i = 0; i < this.maxBullets; i++) {
            this.bulletPool.push(new Bullet(scene));
        }
    }
    _getBullet() {
        for (const b of this.bulletPool) { if (!b.alive) return b; }
        const oldest = this.activeBullets.shift();
        if (oldest) oldest.release();
        return oldest || new Bullet(this.scene);
    }
    fire(origin, direction, speed, range, color, barrelPos) {
        const b = this._getBullet();
        b.spawn(origin, direction, speed, range, color);
        this.activeBullets.push(b);
        if (barrelPos) this._spawnShellCasing(barrelPos, direction);
        return b;
    }
    update(dt, levelObjects) {
        for (let i = this.activeBullets.length - 1; i >= 0; i--) {
            const b = this.activeBullets[i];
            if (!b.alive) { this.activeBullets.splice(i, 1); continue; }
            const prevPos = b.position.clone();
            const moveStep = b.velocity.clone().multiplyScalar(dt);
            b.position.add(moveStep);
            b.mesh.position.copy(b.position);
            b.mesh.lookAt(b.position.clone().add(b.velocity));
            b.distanceTraveled += moveStep.length();
            if (b.distanceTraveled > b.maxRange) { b.release(); this.activeBullets.splice(i, 1); continue; }
            let hitDetected = false;
            if (levelObjects && levelObjects.length > 0) {
                const moveLen = moveStep.length();
                if (moveLen > 0.001) {
                    const dir = moveStep.clone().normalize();
                    this._sweepRay.set(prevPos, dir);
                    this._sweepRay.near = 0;
                    this._sweepRay.far = moveLen + 0.1;
                    const hits = this._sweepRay.intersectObjects(levelObjects, true);
                    if (hits.length > 0) {
                        this._spawnImpactDecal(hits[0].point, hits[0].face ? hits[0].face.normal : new THREE.Vector3(0, 1, 0));
                        if (this.particles) this.particles.emitSparks(hits[0].point);
                        b.release();
                        this.activeBullets.splice(i, 1);
                        hitDetected = true;
                    }
                }
            }
            if (!hitDetected && levelObjects) {
                for (const obj of levelObjects) {
                    if (!obj.geometry && !(obj.children && obj.children.length)) continue;
                    this._aabbBox.setFromObject(obj);
                    if (this._aabbBox.containsPoint(b.position)) {
                        this._spawnImpactDecal(b.position.clone(), new THREE.Vector3(0, 1, 0));
                        b.release();
                        this.activeBullets.splice(i, 1);
                        break;
                    }
                }
            }
        }
        this._updateShellCasings(dt);
        this._updateImpactMarks(dt);
    }
    _spawnShellCasing(barrelPos, forwardDir) {
        if (this.shellCasings.length >= this.maxShellCasings) {
            const oldest = this.shellCasings.shift();
            if (oldest.mesh.parent) this.scene.remove(oldest.mesh);
        }
        const geo = new THREE.CylinderGeometry(0.005, 0.004, 0.018, 4);
        const mat = new THREE.MeshStandardMaterial({color: 0xcc9933, metalness: 0.7, roughness: 0.3});
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(barrelPos);
        const right = new THREE.Vector3().crossVectors(forwardDir, new THREE.Vector3(0, 1, 0)).normalize();
        const ejectSpeed = 2 + Math.random() * 2;
        const vel = right.multiplyScalar(ejectSpeed);
        vel.y = 2 + Math.random();
        this.scene.add(mesh);
        this.shellCasings.push({mesh, velocity: vel, life: 3.0, rotVel: new THREE.Vector3((Math.random()-0.5)*20, (Math.random()-0.5)*20, (Math.random()-0.5)*20), onGround: false});
    }
    _updateShellCasings(dt) {
        for (let i = this.shellCasings.length - 1; i >= 0; i--) {
            const sc = this.shellCasings[i];
            sc.life -= dt;
            if (sc.life <= 0) { if (sc.mesh.parent) this.scene.remove(sc.mesh); this.shellCasings.splice(i, 1); continue; }
            if (!sc.onGround) {
                sc.velocity.y -= 9.8 * dt;
                sc.mesh.position.x += sc.velocity.x * dt;
                sc.mesh.position.y += sc.velocity.y * dt;
                sc.mesh.position.z += sc.velocity.z * dt;
                sc.mesh.rotation.x += sc.rotVel.x * dt;
                sc.mesh.rotation.y += sc.rotVel.y * dt;
                sc.mesh.rotation.z += sc.rotVel.z * dt;
                if (sc.mesh.position.y <= 0.02) { sc.mesh.position.y = 0.02; sc.onGround = true; sc.velocity.set(0,0,0); sc.rotVel.multiplyScalar(0.1); }
            }
            sc.mesh.material.opacity = Math.min(1, sc.life / 0.5);
            sc.mesh.material.transparent = true;
        }
    }
    _spawnImpactDecal(point, normal) {
        if (this.impactMarks.length >= this.maxImpactMarks) {
            const oldest = this.impactMarks.shift();
            if (oldest.mesh.parent) this.scene.remove(oldest.mesh);
        }
        const size = 0.04 + Math.random() * 0.04;
        const geo = new THREE.PlaneGeometry(size, size);
        const mat = new THREE.MeshBasicMaterial({color: 0x222222, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false});
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(point).add(normal.clone().multiplyScalar(0.01));
        mesh.lookAt(point.clone().add(normal));
        this.scene.add(mesh);
        this.impactMarks.push({mesh, life: 3.0});
    }
    _updateImpactMarks(dt) {
        for (let i = this.impactMarks.length - 1; i >= 0; i--) {
            const im = this.impactMarks[i];
            im.life -= dt;
            if (im.life <= 0) { if (im.mesh.parent) this.scene.remove(im.mesh); this.impactMarks.splice(i, 1); continue; }
            im.mesh.material.opacity = 0.7 * (im.life / 3.0);
        }
    }
    clear() {
        for (const b of this.activeBullets) b.release();
        this.activeBullets = [];
        for (const sc of this.shellCasings) { if (sc.mesh.parent) this.scene.remove(sc.mesh); }
        this.shellCasings = [];
        for (const im of this.impactMarks) { if (im.mesh.parent) this.scene.remove(im.mesh); }
        this.impactMarks = [];
    }
}