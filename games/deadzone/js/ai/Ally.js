const THREE = window.THREE;
import { MathUtils } from '../utils/MathUtils.js';

const ALLY_STATES = {
    FOLLOWING: 'following',
    HOLDING: 'holding',
    ENGAGING: 'engaging',
    REVIVING: 'reviving',
    DOWNED: 'downed',
    REGROUPING: 'regrouping',
    MOVING_TO: 'moving_to'
};

export class Ally {
    constructor(config, scene) {
        this.scene = scene;
        this.name = config.name || 'Ally';
        this.role = config.role || 'assault';
        this.color = config.color || 0x4488ff;

        this.position = new THREE.Vector3(config.x || 0, 0, config.z || 0);
        this.rotation = 0;
        this.velocity = new THREE.Vector3();

        this.health = 100;
        this.maxHealth = 100;
        this.alive = true;
        this.downed = false;
        this.downTimer = 0;
        this.downDuration = 20;

        this.state = ALLY_STATES.FOLLOWING;
        this.prevState = null;

        this.speed = 5.0;
        this.followDistance = 3 + Math.random() * 1.5;
        this.formationAngle = config.formationAngle || 0;
        this.formationOffset = new THREE.Vector3();

        this.target = null;
        this.squadFocusTarget = null;
        this.targetPosition = null;
        this.holdPosition = null;
        this.reviveTarget = null;

        this.fireRate = 0.2 + Math.random() * 0.1;
        this.fireTimer = 0;
        this.accuracy = 0.55 + Math.random() * 0.12;
        if (this.role === 'assault') this.accuracy += 0.05;
        this.damage = 12;
        this.range = 30;
        this.detectionRange = 34;

        this.reviveRange = 2.5;
        this.reviveTimer = 0;
        this.reviveDuration = 1.2;

        this.stateTimer = 0;
        this.thinkTimer = 0;
        this.thinkInterval = 0.2 + Math.random() * 0.1;

        this.mesh = this._createMesh();
        this.scene.add(this.mesh);

        this.indicator = this._createIndicator();
        this.scene.add(this.indicator);

        this._lastStateChange = 0;
    }

    _createMesh() {
        const group = new THREE.Group();

        const bodyGeo = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8);
        const bodyMat = new THREE.MeshLambertMaterial({ color: this.color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.0;
        body.castShadow = true;
        group.add(body);

        const headGeo = new THREE.SphereGeometry(0.2, 8, 6);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xddaa88 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.8;
        head.castShadow = true;
        group.add(head);

        // Role-specific 3D weapon
        const gun = this._buildRoleGun();
        gun.position.set(0.3, 1.2, -0.15);
        group.add(gun);

        // Colored glow light so teammates are always visible in the dark
        const glow = new THREE.PointLight(this.color, 0.8, 14, 2);
        glow.position.set(0, 1.5, 0);
        group.add(glow);

        // Vertical beacon line — a tall thin glowing column above the ally
        const beaconGeo = new THREE.CylinderGeometry(0.03, 0.03, 6, 4);
        const beaconMat = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.25
        });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.y = 5;
        group.add(beacon);

        // Glowing ring at the base
        const ringGeo = new THREE.TorusGeometry(0.6, 0.04, 6, 16);
        const ringMat = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.35
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.05;
        group.add(ring);

        group.position.copy(this.position);
        return group;
    }

    _buildRoleGun() {
        switch (this.role) {
            case 'assault': return this._buildAllyM4();
            case 'medic': return this._buildAllyM1911();
            case 'support': return this._buildAlly870();
            default: return this._buildAllyM4();
        }
    }

    _buildAllyM4() {
        const group = new THREE.Group();
        const rMat = new THREE.MeshLambertMaterial({ color: 0x2d2d2d });
        const bMat = new THREE.MeshLambertMaterial({ color: 0x1f1f1f });
        const gMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        const mMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const aMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });

        // Upper receiver
        const upper = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.2), rMat);
        upper.position.set(0, 0, -0.05);
        upper.castShadow = true;
        group.add(upper);

        // Lower receiver
        const lower = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.035, 0.14), rMat);
        lower.position.set(0, -0.02, -0.02);
        group.add(lower);

        // Barrel
        const bGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8);
        bGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(bGeo, bMat);
        barrel.position.set(0, 0.015, -0.32);
        barrel.castShadow = true;
        group.add(barrel);

        // Flash hider
        const fhGeo = new THREE.CylinderGeometry(0.016, 0.013, 0.035, 8);
        fhGeo.rotateX(Math.PI / 2);
        const fh = new THREE.Mesh(fhGeo, bMat);
        fh.position.set(0, 0.015, -0.5);
        group.add(fh);

        // Handguard
        const hgGeo = new THREE.BoxGeometry(0.038, 0.038, 0.18);
        const hg = new THREE.Mesh(hgGeo, rMat);
        hg.position.set(0, 0.015, -0.22);
        hg.castShadow = true;
        group.add(hg);

        // Top rail
        const trGeo = new THREE.BoxGeometry(0.03, 0.006, 0.18);
        const tr = new THREE.Mesh(trGeo, bMat);
        tr.position.set(0, 0.04, -0.22);
        group.add(tr);

        // Side rails
        const srGeo = new THREE.BoxGeometry(0.006, 0.03, 0.18);
        for (let s = -1; s <= 1; s += 2) {
            const sr = new THREE.Mesh(srGeo, bMat);
            sr.position.set(s * 0.02, 0.015, -0.22);
            group.add(sr);
        }

        // Front sight
        const fsGeo = new THREE.BoxGeometry(0.005, 0.03, 0.005);
        const fs = new THREE.Mesh(fsGeo, bMat);
        fs.position.set(0, 0.045, -0.47);
        group.add(fs);

        // Front sight base
        const fsbGeo = new THREE.BoxGeometry(0.02, 0.012, 0.015);
        const fsb = new THREE.Mesh(fsbGeo, bMat);
        fsb.position.set(0, 0.035, -0.47);
        group.add(fsb);

        // Gas block
        const gbGeo = new THREE.BoxGeometry(0.025, 0.025, 0.025);
        const gb = new THREE.Mesh(gbGeo, rMat);
        gb.position.set(0, 0.03, -0.35);
        group.add(gb);

        // Carry handle / rear sight
        const chGeo = new THREE.BoxGeometry(0.038, 0.022, 0.07);
        const ch = new THREE.Mesh(chGeo, rMat);
        ch.position.set(0, 0.045, 0.0);
        group.add(ch);

        // Magazine
        const magGeo = new THREE.BoxGeometry(0.03, 0.12, 0.045);
        const mag = new THREE.Mesh(magGeo, mMat);
        mag.position.set(0, -0.08, -0.03);
        mag.rotation.x = 0.12;
        mag.castShadow = true;
        group.add(mag);

        // Magazine base
        const mbGeo = new THREE.BoxGeometry(0.032, 0.007, 0.035);
        const mb = new THREE.Mesh(mbGeo, aMat);
        mb.position.set(0, -0.14, -0.05);
        mb.rotation.x = 0.12;
        group.add(mb);

        // Trigger guard
        const tgGeo = new THREE.BoxGeometry(0.032, 0.004, 0.06);
        const tg = new THREE.Mesh(tgGeo, rMat);
        tg.position.set(0, -0.04, 0.01);
        group.add(tg);

        // Trigger
        const tGeo = new THREE.BoxGeometry(0.005, 0.015, 0.003);
        const trigger = new THREE.Mesh(tGeo, bMat);
        trigger.position.set(0, -0.03, 0.005);
        group.add(trigger);

        // Pistol grip
        const pgGeo = new THREE.BoxGeometry(0.033, 0.09, 0.035);
        const pg = new THREE.Mesh(pgGeo, gMat);
        pg.position.set(0, -0.065, 0.06);
        pg.rotation.x = -0.25;
        pg.castShadow = true;
        group.add(pg);

        // Grip ridges
        for (let i = 0; i < 3; i++) {
            const grGeo = new THREE.BoxGeometry(0.035, 0.003, 0.037);
            const gr = new THREE.Mesh(grGeo, gMat);
            gr.position.set(0, -0.04 + i * -0.02, 0.06);
            gr.rotation.x = -0.25;
            group.add(gr);
        }

        // Buffer tube
        const btGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.11, 8);
        btGeo.rotateX(Math.PI / 2);
        const bt = new THREE.Mesh(btGeo, rMat);
        bt.position.set(0, 0.01, 0.08);
        group.add(bt);

        // Stock
        const stGeo = new THREE.BoxGeometry(0.042, 0.045, 0.07);
        const st = new THREE.Mesh(stGeo, rMat);
        st.position.set(0, 0.005, 0.15);
        st.castShadow = true;
        group.add(st);

        // Stock butt
        const sbGeo = new THREE.BoxGeometry(0.045, 0.05, 0.01);
        const sb = new THREE.Mesh(sbGeo, gMat);
        sb.position.set(0, 0.005, 0.19);
        group.add(sb);

        // Ejection port
        const epGeo = new THREE.BoxGeometry(0.025, 0.012, 0.035);
        const ep = new THREE.Mesh(epGeo, new THREE.MeshLambertMaterial({ color: 0x080808 }));
        ep.position.set(0.024, 0.015, -0.03);
        group.add(ep);

        return group;
    }

    _buildAlly870() {
        const group = new THREE.Group();
        const rMat = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
        const bMat = new THREE.MeshLambertMaterial({ color: 0x181818 });
        const wMat = new THREE.MeshLambertMaterial({ color: 0x5c3a1e });
        const wdMat = new THREE.MeshLambertMaterial({ color: 0x4a2e15 });
        const fMat = new THREE.MeshLambertMaterial({ color: 0x5a3619 });

        // Receiver
        const recGeo = new THREE.BoxGeometry(0.05, 0.055, 0.18);
        const rec = new THREE.Mesh(recGeo, rMat);
        rec.position.set(0, 0.005, -0.03);
        rec.castShadow = true;
        group.add(rec);

        // Barrel
        const bGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.38, 8);
        bGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(bGeo, bMat);
        barrel.position.set(0, 0.02, -0.3);
        barrel.castShadow = true;
        group.add(barrel);

        // Tube magazine
        const tmGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.3, 8);
        tmGeo.rotateX(Math.PI / 2);
        const tm = new THREE.Mesh(tmGeo, rMat);
        tm.position.set(0, -0.01, -0.26);
        group.add(tm);

        // Tube cap
        const tcGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.01, 8);
        tcGeo.rotateX(Math.PI / 2);
        const tc = new THREE.Mesh(tcGeo, bMat);
        tc.position.set(0, -0.01, -0.41);
        group.add(tc);

        // Barrel bracket ring
        const brGeo = new THREE.TorusGeometry(0.02, 0.004, 4, 8);
        brGeo.rotateX(Math.PI / 2);
        const br = new THREE.Mesh(brGeo, rMat);
        br.position.set(0, 0.005, -0.3);
        group.add(br);

        // Front sight bead (red)
        const fbGeo = new THREE.SphereGeometry(0.005, 6, 4);
        const fb = new THREE.Mesh(fbGeo, new THREE.MeshLambertMaterial({ color: 0xcc0000 }));
        fb.position.set(0, 0.035, -0.49);
        group.add(fb);

        // Muzzle
        const muGeo = new THREE.CylinderGeometry(0.017, 0.015, 0.02, 8);
        muGeo.rotateX(Math.PI / 2);
        const mu = new THREE.Mesh(muGeo, bMat);
        mu.position.set(0, 0.02, -0.5);
        group.add(mu);

        // Pump forend
        const feGeo = new THREE.BoxGeometry(0.044, 0.044, 0.14);
        const fe = new THREE.Mesh(feGeo, fMat);
        fe.position.set(0, -0.005, -0.19);
        fe.castShadow = true;
        group.add(fe);

        // Forend grooves
        for (let i = 0; i < 4; i++) {
            const fgGeo = new THREE.BoxGeometry(0.046, 0.003, 0.14);
            const fg = new THREE.Mesh(fgGeo, wdMat);
            fg.position.set(0, -0.02 + i * 0.01, -0.19);
            group.add(fg);
        }

        // Action bars
        const abGeo = new THREE.BoxGeometry(0.005, 0.005, 0.1);
        for (let s = -1; s <= 1; s += 2) {
            const ab = new THREE.Mesh(abGeo, rMat);
            ab.position.set(s * 0.016, -0.025, -0.17);
            group.add(ab);
        }

        // Rear sight
        const rsGeo = new THREE.BoxGeometry(0.03, 0.01, 0.006);
        const rs = new THREE.Mesh(rsGeo, rMat);
        rs.position.set(0, 0.038, 0.05);
        group.add(rs);

        // Ejection port
        const epGeo = new THREE.BoxGeometry(0.025, 0.015, 0.05);
        const ep = new THREE.Mesh(epGeo, new THREE.MeshLambertMaterial({ color: 0x080808 }));
        ep.position.set(0.026, 0.01, -0.02);
        group.add(ep);

        // Shell lifter
        const slGeo = new THREE.BoxGeometry(0.028, 0.005, 0.04);
        const sl = new THREE.Mesh(slGeo, rMat);
        sl.position.set(0, -0.028, 0.0);
        group.add(sl);

        // Trigger guard
        const tgGeo = new THREE.BoxGeometry(0.035, 0.004, 0.065);
        const tg = new THREE.Mesh(tgGeo, rMat);
        tg.position.set(0, -0.03, 0.02);
        group.add(tg);

        // Trigger
        const tGeo = new THREE.BoxGeometry(0.005, 0.017, 0.003);
        const trigger = new THREE.Mesh(tGeo, bMat);
        trigger.position.set(0, -0.022, 0.015);
        group.add(trigger);

        // Wooden stock
        const stGeo = new THREE.BoxGeometry(0.046, 0.055, 0.18);
        const st = new THREE.Mesh(stGeo, wMat);
        st.position.set(0, 0.0, 0.14);
        st.castShadow = true;
        group.add(st);

        // Stock grip section
        const sgGeo = new THREE.BoxGeometry(0.048, 0.06, 0.05);
        const sg = new THREE.Mesh(sgGeo, wMat);
        sg.position.set(0, -0.01, 0.05);
        group.add(sg);

        // Stock checkering
        for (let i = 0; i < 3; i++) {
            const ckGeo = new THREE.BoxGeometry(0.049, 0.003, 0.05);
            const ck = new THREE.Mesh(ckGeo, wdMat);
            ck.position.set(0, -0.02 + i * 0.012, 0.05);
            group.add(ck);
        }

        // Stock butt plate
        const bpGeo = new THREE.BoxGeometry(0.05, 0.065, 0.012);
        const bpMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        const bp = new THREE.Mesh(bpGeo, bpMat);
        bp.position.set(0, 0.0, 0.235);
        group.add(bp);

        // Pistol grip
        const pgGeo = new THREE.BoxGeometry(0.04, 0.09, 0.04);
        const pg = new THREE.Mesh(pgGeo, wMat);
        pg.position.set(0, -0.055, 0.07);
        pg.rotation.x = -0.2;
        pg.castShadow = true;
        group.add(pg);

        // Cross-bolt safety
        const csGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.01, 6);
        csGeo.rotateZ(Math.PI / 2);
        const cs = new THREE.Mesh(csGeo, rMat);
        cs.position.set(0.028, 0.0, 0.04);
        group.add(cs);

        return group;
    }

    _buildAllyM1911() {
        const group = new THREE.Group();
        const sMat = new THREE.MeshLambertMaterial({ color: 0x2e2e2e });
        const fMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const bMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        const gMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });
        const aMat = new THREE.MeshLambertMaterial({ color: 0xc0a060 });
        const tMat = new THREE.MeshLambertMaterial({ color: 0x888888 });

        // Slide
        const slGeo = new THREE.BoxGeometry(0.04, 0.03, 0.24);
        const slide = new THREE.Mesh(slGeo, sMat);
        slide.position.set(0, 0.02, -0.07);
        slide.castShadow = true;
        group.add(slide);

        // Slide serrations (rear)
        for (let i = 0; i < 5; i++) {
            const serGeo = new THREE.BoxGeometry(0.042, 0.002, 0.007);
            const ser = new THREE.Mesh(serGeo, fMat);
            ser.position.set(0, 0.02, 0.03 + i * 0.009);
            group.add(ser);
        }

        // Slide serrations (front)
        for (let i = 0; i < 3; i++) {
            const serGeo = new THREE.BoxGeometry(0.042, 0.002, 0.007);
            const ser = new THREE.Mesh(serGeo, fMat);
            ser.position.set(0, 0.02, -0.15 + i * 0.009);
            group.add(ser);
        }

        // Ejection port
        const epGeo = new THREE.BoxGeometry(0.022, 0.008, 0.03);
        const ep = new THREE.Mesh(epGeo, new THREE.MeshLambertMaterial({ color: 0x080808 }));
        ep.position.set(0.02, 0.02, -0.01);
        group.add(ep);

        // Barrel
        const bGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.16, 8);
        bGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(bGeo, bMat);
        barrel.position.set(0, 0.014, -0.12);
        group.add(barrel);

        // Barrel bushing
        const bbGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.01, 8);
        bbGeo.rotateX(Math.PI / 2);
        const bb = new THREE.Mesh(bbGeo, sMat);
        bb.position.set(0, 0.014, -0.195);
        group.add(bb);

        // Muzzle bore
        const boGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.003, 6);
        boGeo.rotateX(Math.PI / 2);
        const bo = new THREE.Mesh(boGeo, new THREE.MeshLambertMaterial({ color: 0x000000 }));
        bo.position.set(0, 0.014, -0.2);
        group.add(bo);

        // Front sight
        const fsGeo = new THREE.BoxGeometry(0.005, 0.007, 0.005);
        const fs = new THREE.Mesh(fsGeo, sMat);
        fs.position.set(0, 0.04, -0.17);
        group.add(fs);

        // Rear sight
        const rsGeo = new THREE.BoxGeometry(0.022, 0.007, 0.008);
        const rs = new THREE.Mesh(rsGeo, sMat);
        rs.position.set(0, 0.04, 0.07);
        group.add(rs);

        // Frame
        const frGeo = new THREE.BoxGeometry(0.038, 0.022, 0.2);
        const frame = new THREE.Mesh(frGeo, fMat);
        frame.position.set(0, -0.005, -0.05);
        frame.castShadow = true;
        group.add(frame);

        // Trigger guard
        const tgGeo = new THREE.BoxGeometry(0.025, 0.004, 0.05);
        const tg = new THREE.Mesh(tgGeo, fMat);
        tg.position.set(0, -0.02, 0.0);
        group.add(tg);

        // Trigger guard front
        const tgfGeo = new THREE.BoxGeometry(0.025, 0.017, 0.003);
        const tgf = new THREE.Mesh(tgfGeo, fMat);
        tgf.position.set(0, -0.012, -0.022);
        group.add(tgf);

        // Trigger
        const trGeo = new THREE.BoxGeometry(0.004, 0.018, 0.003);
        const trigger = new THREE.Mesh(trGeo, tMat);
        trigger.position.set(0, -0.012, -0.003);
        trigger.rotation.x = -0.15;
        group.add(trigger);

        // Hammer
        const haGeo = new THREE.BoxGeometry(0.018, 0.018, 0.006);
        const ha = new THREE.Mesh(haGeo, fMat);
        ha.position.set(0, 0.015, 0.09);
        ha.rotation.x = -0.3;
        group.add(ha);

        // Hammer spur
        const hsGeo = new THREE.BoxGeometry(0.02, 0.004, 0.01);
        const hs = new THREE.Mesh(hsGeo, aMat);
        hs.position.set(0, 0.025, 0.093);
        group.add(hs);

        // Grip safety
        const gsGeo = new THREE.BoxGeometry(0.032, 0.06, 0.02);
        const gs = new THREE.Mesh(gsGeo, fMat);
        gs.position.set(0, -0.04, 0.055);
        gs.rotation.x = -0.15;
        group.add(gs);

        // Grip panel left
        const glGeo = new THREE.BoxGeometry(0.007, 0.058, 0.055);
        const gl = new THREE.Mesh(glGeo, gMat);
        gl.position.set(-0.022, -0.035, 0.035);
        gl.rotation.x = -0.1;
        gl.castShadow = true;
        group.add(gl);

        // Grip panel right
        const grGeo = new THREE.BoxGeometry(0.007, 0.058, 0.055);
        const gr = new THREE.Mesh(grGeo, gMat);
        gr.position.set(0.022, -0.035, 0.035);
        gr.rotation.x = -0.1;
        group.add(gr);

        // Grip checkering
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 2; col++) {
                const ckGeo = new THREE.BoxGeometry(0.008, 0.007, 0.007);
                const ckMat = new THREE.MeshLambertMaterial({ color: 0x2a1a0e });
                for (let s = -1; s <= 1; s += 2) {
                    const ck = new THREE.Mesh(ckGeo, ckMat);
                    ck.position.set(s * 0.023, -0.015 + row * -0.014, 0.015 + col * 0.018);
                    ck.rotation.x = -0.1;
                    group.add(ck);
                }
            }
        }

        // Magazine
        const mgGeo = new THREE.BoxGeometry(0.025, 0.055, 0.035);
        const mag = new THREE.Mesh(mgGeo, fMat);
        mag.position.set(0, -0.06, 0.025);
        mag.castShadow = true;
        group.add(mag);

        // Magazine base pad
        const mpGeo = new THREE.BoxGeometry(0.027, 0.007, 0.037);
        const mp = new THREE.Mesh(mpGeo, aMat);
        mp.position.set(0, -0.09, 0.025);
        group.add(mp);

        // Slide stop
        const ssGeo = new THREE.BoxGeometry(0.013, 0.005, 0.022);
        const ss = new THREE.Mesh(ssGeo, fMat);
        ss.position.set(-0.025, 0.005, 0.0);
        group.add(ss);

        // Thumb safety
        const tsGeo = new THREE.BoxGeometry(0.01, 0.004, 0.03);
        const ts = new THREE.Mesh(tsGeo, fMat);
        ts.position.set(-0.025, 0.014, 0.035);
        group.add(ts);

        // Magazine release
        const mrGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.006, 6);
        mrGeo.rotateZ(Math.PI / 2);
        const mr = new THREE.Mesh(mrGeo, fMat);
        mr.position.set(0.022, -0.01, 0.015);
        group.add(mr);

        // Mainspring housing
        const mhGeo = new THREE.BoxGeometry(0.028, 0.035, 0.012);
        const mh = new THREE.Mesh(mhGeo, fMat);
        mh.position.set(0, -0.04, 0.065);
        mh.rotation.x = -0.15;
        group.add(mh);

        return group;
    }

    _createIndicator() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 64, 20);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.9 });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(2.0, 0.5, 1);
        return sprite;
    }

    update(dt, playerPos, enemies, allies, command, gameState, squadFocusTarget) {
        if (!this.alive) return;

        this.squadFocusTarget = squadFocusTarget || null;

        this.indicator.position.copy(this.mesh.position);
        this.indicator.position.y += 2.5;

        if (this.downed) {
            this.downTimer -= dt;
            if (this.downTimer <= 0) {
                this.die();
            }
            this.mesh.position.copy(this.position);
            this.mesh.rotation.y = this.rotation;
            return;
        }

        this.thinkTimer -= dt;
        if (this.thinkTimer <= 0) {
            this.thinkTimer = this.thinkInterval;
            this._think(playerPos, enemies, allies, command);
        }

        this._move(dt, playerPos);
        this._combat(dt, enemies, playerPos, gameState);

        this.mesh.position.copy(this.position);
        this.mesh.position.y = 0;
        this.mesh.rotation.y = this.rotation;
    }

    _think(playerPos, enemies, allies, command) {
        if (this.state === ALLY_STATES.DOWNED) return;

        if (command) {
            this._handleCommand(command, playerPos);
        }

        const nearestEnemy = this._findNearestEnemy(enemies, playerPos);
        const downedAlly = this._findDownedAlly(allies);

        switch (this.state) {
            case ALLY_STATES.FOLLOWING:
            case ALLY_STATES.REGROUPING:
                if (nearestEnemy && nearestEnemy.dist < this.detectionRange) {
                    this.target = nearestEnemy.enemy;
                    this._changeState(ALLY_STATES.ENGAGING);
                }
                break;

            case ALLY_STATES.HOLDING:
                if (nearestEnemy && nearestEnemy.dist < this.detectionRange) {
                    this.target = nearestEnemy.enemy;
                    this._changeState(ALLY_STATES.ENGAGING);
                }
                break;

            case ALLY_STATES.ENGAGING:
                if (this.squadFocusTarget && this.squadFocusTarget.alive) {
                    this.target = this.squadFocusTarget;
                } else if (!this.target || !this.target.alive || this.target.health <= 0) {
                    const nearest = this._findNearestEnemy(enemies, playerPos);
                    if (nearest) this.target = nearest.enemy;
                }
                if (!this.target || !this.target.alive || this.target.health <= 0) {
                    this.target = null;
                    this._changeState(ALLY_STATES.FOLLOWING);
                } else {
                    const distToTarget = this.position.distanceTo(this.target.position);
                    if (distToTarget > this.detectionRange * 1.4) {
                        this.target = null;
                        this._changeState(ALLY_STATES.FOLLOWING);
                    }
                }
                break;

            case ALLY_STATES.REVIVING:
                if (!this.reviveTarget || !this.reviveTarget.downed) {
                    this.reviveTarget = null;
                    this._changeState(ALLY_STATES.FOLLOWING);
                }
                break;
        }

        if (this.state !== ALLY_STATES.REVIVING && downedAlly && this.role === 'medic') {
            if (!this.reviveTarget || downedAlly.dist < this.position.distanceTo(this.reviveTarget.position)) {
                this.reviveTarget = downedAlly.ally;
            }
            this._changeState(ALLY_STATES.REVIVING);
        }
    }

    _handleCommand(command, playerPos) {
        switch (command) {
            case 'follow':
                this._changeState(ALLY_STATES.FOLLOWING);
                this.holdPosition = null;
                break;
            case 'hold':
                this.holdPosition = this.position.clone();
                this._changeState(ALLY_STATES.HOLDING);
                break;
            case 'focus':
                if (this.squadFocusTarget && this.squadFocusTarget.alive) {
                    this.target = this.squadFocusTarget;
                }
                this._changeState(ALLY_STATES.ENGAGING);
                break;
            case 'regroup':
                this._changeState(ALLY_STATES.REGROUPING);
                break;
        }
    }

    _move(dt, playerPos) {
        let targetPos;
        let moveSpeed = this.speed;

        switch (this.state) {
            case ALLY_STATES.FOLLOWING:
            case ALLY_STATES.REGROUPING:
                const distToPlayer = this.position.distanceTo(playerPos);
                const dynamicFollow = this.followDistance + Math.min(distToPlayer * 0.15, 2);
                const angle = this.formationAngle;
                this.formationOffset.set(
                    Math.sin(angle) * dynamicFollow,
                    0,
                    Math.cos(angle) * dynamicFollow
                );
                targetPos = playerPos.clone().add(this.formationOffset);
                if (this.state === ALLY_STATES.REGROUPING) {
                    moveSpeed *= 1.25;
                }
                break;

            case ALLY_STATES.HOLDING:
                targetPos = this.holdPosition || this.position;
                break;

            case ALLY_STATES.ENGAGING:
                if (this.target) {
                    const dist = this.position.distanceTo(this.target.position);
                    if (dist > this.range * 0.6) {
                        targetPos = this.target.position.clone();
                    } else if (dist < this.range * 0.3) {
                        const away = this.position.clone().sub(this.target.position).normalize().multiplyScalar(3);
                        targetPos = this.position.clone().add(away);
                    } else {
                        targetPos = this.position.clone();
                    }
                } else {
                    targetPos = playerPos;
                }
                break;

            case ALLY_STATES.REVIVING:
                if (this.reviveTarget) {
                    targetPos = this.reviveTarget.position.clone();
                    moveSpeed *= 1.45;
                }
                break;

            default:
                targetPos = playerPos;
        }

        if (targetPos) {
            const dir = targetPos.clone().sub(this.position);
            dir.y = 0;
            const dist = dir.length();

            if (dist > 0.5) {
                dir.normalize();
                const step = moveSpeed * dt;
                this.position.x += dir.x * Math.min(step, dist);
                this.position.z += dir.z * Math.min(step, dist);
                this.rotation = Math.atan2(dir.x, dir.z);
            }
        }

        this.position.y = 0;
    }

    _combat(dt, enemies, playerPos, gameState) {
        if (this.state === ALLY_STATES.REVIVING && this.reviveTarget) {
            const dist = this.position.distanceTo(this.reviveTarget.position);
            if (dist < this.reviveRange) {
                this.reviveTimer += dt;
                if (this.reviveTimer >= this.reviveDuration) {
                    this.reviveTarget.revive();
                    this.reviveTarget = null;
                    this.reviveTimer = 0;
                    this._changeState(ALLY_STATES.FOLLOWING);
                    if (gameState) gameState.stats.revives++;
                }
            } else {
                this.reviveTimer = 0;
            }
            return;
        }

        this.reviveTimer = 0;

        if (this.state !== ALLY_STATES.ENGAGING || !this.target || !this.target.alive) return;

        this.fireTimer -= dt;

        const dir = this.target.position.clone().sub(this.position);
        dir.y = 0;
        this.rotation = Math.atan2(dir.x, dir.z);

        if (this.fireTimer <= 0 && this.position.distanceTo(this.target.position) < this.range) {
            this.fireTimer = this.fireRate;

            if (Math.random() < this.accuracy) {
                const isHeadshot = Math.random() < 0.15;
                const dmg = isHeadshot ? this.damage * 2 : this.damage;
                this.target.takeDamage(dmg, this.position, isHeadshot);

                if (!this.target.alive) {
                    if (gameState) gameState.addKill(isHeadshot);
                }
            }
        }
    }

    _findNearestEnemy(enemies, playerPos) {
        let nearest = null;
        let nearestDist = Infinity;

        if (this.squadFocusTarget && this.squadFocusTarget.alive && this.squadFocusTarget.health > 0) {
            const dist = this.position.distanceTo(this.squadFocusTarget.position);
            if (dist < this.detectionRange * 1.5) {
                return { enemy: this.squadFocusTarget, dist };
            }
        }

        for (const enemy of enemies) {
            if (!enemy.alive || enemy.health <= 0) continue;
            const dist = this.position.distanceTo(enemy.position);
            const playerDist = playerPos.distanceTo(enemy.position);
            const score = dist * 0.7 + playerDist * 0.6;

            if (score < nearestDist) {
                nearestDist = score;
                nearest = { enemy, dist };
            }
        }

        return nearest;
    }

    _findDownedAlly(allies) {
        let closest = null;
        for (const ally of allies) {
            if (ally === this || !ally.downed || !ally.alive) continue;
            const dist = this.position.distanceTo(ally.position);
            if (!closest || dist < closest.dist) {
                closest = { ally, dist };
            }
        }
        return closest;
    }

    _changeState(newState) {
        if (this.state === newState) return;
        this.prevState = this.state;
        this.state = newState;
        this.stateTimer = 0;
    }

    takeDamage(amount, attackerPos) {
        if (!this.alive || this.downed) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.downed = true;
            this.downTimer = this.downDuration;
            this._changeState(ALLY_STATES.DOWNED);
            this.mesh.rotation.x = Math.PI / 2;
            this.mesh.position.y = 0.3;
        }
    }

    revive() {
        this.downed = false;
        this.health = 60;
        this.downTimer = 0;
        this.mesh.rotation.x = 0;
        this._changeState(ALLY_STATES.FOLLOWING);
    }

    die() {
        this.alive = false;
        this.downed = false;
        this.mesh.visible = false;
        this.indicator.visible = false;
    }

    getState() {
        return this.state;
    }

    getStatusText() {
        switch (this.state) {
            case ALLY_STATES.FOLLOWING: return 'FOLLOWING';
            case ALLY_STATES.HOLDING: return 'HOLDING';
            case ALLY_STATES.ENGAGING: return 'ENGAGING';
            case ALLY_STATES.REVIVING: return 'REVIVING';
            case ALLY_STATES.DOWNED: return 'DOWNED';
            case ALLY_STATES.REGROUPING: return 'REGROUPING';
            default: return 'IDLE';
        }
    }

    reset(x, z) {
        this.health = 100;
        this.alive = true;
        this.downed = false;
        this.downTimer = 0;
        this.position.set(x, 0, z);
        this.target = null;
        this.reviveTarget = null;
        this.reviveTimer = 0;
        this.holdPosition = null;
        this._changeState(ALLY_STATES.FOLLOWING);
        this.mesh.visible = true;
        this.indicator.visible = true;
        this.mesh.rotation.x = 0;
    }
}

export { ALLY_STATES };
