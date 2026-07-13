import * as THREE from 'three';
import {
  makeRoadMaterial,
  makeRailMaterial,
  makeCrystalMaterial,
  makeDesertMaterial,
  makeIslandMaterial,
  makeOrbMaterial,
  makeMoonMaterial,
  getOrbPalette,
} from './textures.js';

/** Unique Glass Meridian track — floating crystal ring circuit with a twist. */
export function createTrackPath() {
  const pts = [];
  const N = 120;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const scale = 95;
    const x = scale * Math.sin(t) * (1 + 0.22 * Math.cos(2 * t));
    const z = scale * Math.sin(t) * Math.cos(t) * 1.35;
    const y = 6 + Math.sin(t * 2) * 5 + Math.cos(t * 3) * 2.5;
    pts.push(new THREE.Vector3(x, y, z));
  }
  pts.push(pts[0].clone());
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.35);
}

/** Shared thin box for gate prisms / markers — instanced via clone. */
function makePrismBeam(w, h, d, color, emissiveInt = 1.2) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: emissiveInt,
    metalness: 0.5,
    roughness: 0.2,
    transparent: true,
    opacity: 0.88,
  });
  return new THREE.Mesh(geo, mat);
}

export function buildTrack(scene, curve, pack = {}) {
  const group = new THREE.Group();
  group.name = 'track';

  const samples = 280;
  const width = 14;
  const half = width / 2;

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const leftEdge = [];
  const rightEdge = [];
  const centerLine = [];

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(up, tangent).normalize();
    const realUp = new THREE.Vector3().crossVectors(tangent, side).normalize();
    const nextT = (t + 0.01) % 1;
    const nextTan = curve.getTangentAt(nextT).normalize();
    const bank = THREE.MathUtils.clamp(tangent.clone().cross(nextTan).y * 8, -0.45, 0.45);
    const bankedSide = side.clone().applyAxisAngle(tangent, bank);
    const bankedUp = realUp.clone().applyAxisAngle(tangent, bank);

    const L = p.clone().addScaledVector(bankedSide, half);
    const R = p.clone().addScaledVector(bankedSide, -half);
    leftEdge.push(L.clone());
    rightEdge.push(R.clone());
    centerLine.push(p.clone());

    positions.push(L.x, L.y, L.z, R.x, R.y, R.z);
    normals.push(bankedUp.x, bankedUp.y, bankedUp.z, bankedUp.x, bankedUp.y, bankedUp.z);
    uvs.push(0, t * 28, 1, t * 28);

    if (i < samples) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const roadMat = makeRoadMaterial(pack);
  const road = new THREE.Mesh(geo, roadMat);
  road.receiveShadow = true;
  group.add(road);

  if (pack.roadOverlay) {
    const detailMat = new THREE.MeshStandardMaterial({
      map: pack.roadOverlay,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      metalness: 0.4,
      roughness: 0.3,
      emissive: 0x332266,
      emissiveIntensity: 0.55,
      envMap: pack.envMap || null,
      envMapIntensity: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const detail = new THREE.Mesh(geo, detailMat);
    detail.renderOrder = 1;
    group.add(detail);
  }

  // Glowing center stripe
  const stripePts = centerLine.map((p) =>
    p.clone().addScaledVector(new THREE.Vector3(0, 1, 0), 0.1)
  );
  const stripeCurve = new THREE.CatmullRomCurve3(stripePts, true);
  const stripeGeo = new THREE.TubeGeometry(stripeCurve, samples, 0.22, 8, true);
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0x3de8ff,
    emissive: 0x3de8ff,
    emissiveIntensity: 2.1,
    metalness: 0.35,
    roughness: 0.2,
    transparent: true,
    opacity: 0.92,
    envMap: pack.envMap || null,
    envMapIntensity: 0.9,
  });
  if (pack.railEmissive) {
    stripeMat.map = pack.railEmissive;
    stripeMat.emissiveMap = pack.railEmissive;
  }
  group.add(new THREE.Mesh(stripeGeo, stripeMat));

  // Crystal edge rails
  const railMat = makeRailMaterial(pack);
  for (const edge of [leftEdge, rightEdge]) {
    const c = new THREE.CatmullRomCurve3(edge, true);
    const tube = new THREE.TubeGeometry(c, samples, 0.5, 8, true);
    group.add(new THREE.Mesh(tube, railMat));
  }

  // Roadside readability markers — chevron posts + distance beacons
  const markerPostGeo = new THREE.CylinderGeometry(0.12, 0.18, 2.4, 6);
  const markerCapGeo = new THREE.OctahedronGeometry(0.35, 0);
  const markerColors = [0x3de8ff, 0xff3d9a, 0x34d399, 0xffc857];
  for (let i = 0; i < 36; i++) {
    const t = i / 36;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tan).normalize();
    const color = markerColors[i % 4];
    for (const s of [-1, 1]) {
      const postMat = new THREE.MeshStandardMaterial({
        color: 0x2a1f55,
        emissive: color,
        emissiveIntensity: 0.35,
        metalness: 0.6,
        roughness: 0.35,
      });
      const post = new THREE.Mesh(markerPostGeo, postMat);
      const offset = half + 1.8 + (i % 2) * 0.6;
      post.position.copy(p).addScaledVector(side, s * offset).add(new THREE.Vector3(0, 1.2, 0));
      post.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
      group.add(post);

      const capMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.4,
        metalness: 0.4,
        roughness: 0.15,
      });
      const cap = new THREE.Mesh(markerCapGeo, capMat);
      cap.position.copy(post.position).add(new THREE.Vector3(0, 1.5, 0));
      group.add(cap);
    }
  }

  // Sector beacons (every 1/6 lap) — tall crystal spires for corner awareness
  const sectorGeo = new THREE.ConeGeometry(0.6, 5, 4);
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tan).normalize();
    const sectorColor = [0x3de8ff, 0xff3d9a, 0xffc857, 0x34d399, 0xa78bfa, 0xff6bb5][i];
    for (const s of [-1, 1]) {
      const spire = new THREE.Mesh(
        sectorGeo,
        new THREE.MeshStandardMaterial({
          color: sectorColor,
          emissive: sectorColor,
          emissiveIntensity: 1.1,
          metalness: 0.45,
          roughness: 0.18,
          transparent: true,
          opacity: 0.85,
        })
      );
      spire.position.copy(p).addScaledVector(side, s * (half + 4)).add(new THREE.Vector3(0, 2.5, 0));
      spire.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
      group.add(spire);
      if (pack.glowCyan) {
        const halo = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: pack.glowCyan,
            color: sectorColor,
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
        );
        halo.scale.set(4, 4, 1);
        halo.position.copy(spire.position).add(new THREE.Vector3(0, 1, 0));
        group.add(halo);
      }
    }
  }

  // Floating prism pylons
  const pylonGeo = new THREE.OctahedronGeometry(2.2, 1);
  const pylonMats = [
    makeCrystalMaterial(pack, 0x5eead4, 0x0891b2),
    makeCrystalMaterial(pack, 0xff6bb5, 0xbe185d),
    makeCrystalMaterial(pack, 0xffd27a, 0xb45309),
  ];
  for (let i = 0; i < 24; i++) {
    const t = i / 24;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tan).normalize();
    for (const s of [-1, 1]) {
      const pylon = new THREE.Mesh(pylonGeo, pylonMats[i % 3]);
      const offset = 12 + (i % 3) * 2;
      pylon.position.copy(p).addScaledVector(side, s * offset).add(new THREE.Vector3(0, 3 + (i % 4), 0));
      pylon.rotation.y = t * Math.PI * 4;
      pylon.scale.set(1, 1.6 + (i % 3) * 0.4, 1);
      group.add(pylon);
    }
  }

  // Prism Gates — outer torus + inner ring + cross beams + halo sprite
  const gates = [];
  const gateColors = [0x3de8ff, 0xff3d9a, 0xffc857, 0x34d399];
  const gateGlowMap = pack.glowCyan || pack.glowPink;
  for (let i = 0; i < 6; i++) {
    const t = (i + 0.5) / 6;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    const color = gateColors[i % 4];

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(7.5, 0.45, 12, 48),
      new THREE.MeshPhysicalMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.65,
        metalness: 0.48,
        roughness: 0.14,
        transparent: true,
        opacity: 0.9,
        transmission: 0.38,
        thickness: 0.55,
        envMap: pack.envMap || null,
        envMapIntensity: 1.35,
        clearcoat: 0.85,
        clearcoatRoughness: 0.08,
      })
    );
    if (pack.railEmissive) {
      ring.material.map = pack.railEmissive;
      ring.material.emissiveMap = pack.railEmissive;
    }

    // Inner counter-rotating prism ring
    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(5.2, 0.18, 8, 32),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: color,
        emissiveIntensity: 1.8,
        metalness: 0.6,
        roughness: 0.12,
        transparent: true,
        opacity: 0.75,
      })
    );
    innerRing.rotation.x = Math.PI * 0.5;
    ring.add(innerRing);

    // Cross prism beams (diamond frame)
    for (let b = 0; b < 4; b++) {
      const beam = makePrismBeam(0.15, 7.2, 0.15, color, 1.5);
      beam.rotation.z = (b / 4) * Math.PI * 0.5;
      ring.add(beam);
    }

    // Vertical accent posts at cardinal points
    for (let b = 0; b < 4; b++) {
      const post = makePrismBeam(0.12, 3.5, 0.12, color, 1.3);
      const ang = (b / 4) * Math.PI * 2;
      post.position.set(Math.cos(ang) * 6.8, 0, Math.sin(ang) * 6.8);
      ring.add(post);
    }

    if (gateGlowMap) {
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: gateGlowMap,
          color,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      halo.scale.set(22, 22, 1);
      ring.add(halo);
    }

    ring.position.copy(p).add(new THREE.Vector3(0, 1.2, 0));
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
    group.add(ring);
    gates.push({ mesh: ring, t, collected: false, color });
  }

  // Spectrum orbs — per-orb hue + dual-layer glow
  const orbs = [];
  const orbGeo = new THREE.IcosahedronGeometry(0.92, 2);
  const orbGlowMaps = [pack.glowGold, pack.glowCyan, pack.glowPink, pack.glowAurora, pack.glowViolet].filter(Boolean);
  for (let i = 0; i < 18; i++) {
    const t = (i + 0.3) / 18;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tan).normalize();
    const lateral = ((i % 3) - 1) * 3.5;
    const hue = getOrbPalette(i);
    const orbMat = makeOrbMaterial(pack, hue, hue);
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.copy(p).addScaledVector(side, lateral).add(new THREE.Vector3(0, 1.8, 0));
    group.add(orb);

    let glow = null;
    const glowTex = orbGlowMaps[i % orbGlowMaps.length] || pack.glowGold;
    if (glowTex) {
      glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: hue,
          transparent: true,
          opacity: 0.62,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      glow.scale.set(4.2, 4.2, 1);
      glow.position.copy(orb.position);
      group.add(glow);

      const outerGlow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: pack.glowViolet || glowTex,
          color: 0xffffff,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      outerGlow.scale.set(6.5, 6.5, 1);
      glow.add(outerGlow);
    }
    orbs.push({ mesh: orb, t, taken: false, baseY: orb.position.y, glow });
  }

  // Floating islands
  const islandGeo = new THREE.DodecahedronGeometry(8, 1);
  const islandMat = makeIslandMaterial(pack);
  for (let i = 0; i < 14; i++) {
    const t = i / 14;
    const p = curve.getPointAt(t);
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.set(
      p.x + Math.sin(i * 2) * 25,
      p.y - 18 - (i % 4) * 3,
      p.z + Math.cos(i * 1.7) * 25
    );
    island.scale.set(1.2 + (i % 3) * 0.5, 0.5 + (i % 2) * 0.3, 1.2 + (i % 4) * 0.3);
    island.rotation.set(i * 0.3, i * 0.5, i * 0.2);
    group.add(island);
  }

  scene.add(group);

  return {
    group,
    curve,
    width,
    gates,
    orbs,
    samples,
    centerLine,
    getFrame(t) {
      const tt = ((t % 1) + 1) % 1;
      const position = curve.getPointAt(tt);
      const tangent = curve.getTangentAt(tt).normalize();
      const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tangent).normalize();
      const up = new THREE.Vector3().crossVectors(tangent, side).normalize();
      return { position, tangent, side, up };
    },
  };
}

export function buildWorld(scene, pack = {}) {
  if (pack.envSky) {
    pack.envSky.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = pack.envSky;
    if (pack.envMap) scene.environment = pack.envMap;
  } else {
    scene.background = new THREE.Color(0x070612);
  }
  scene.fog = new THREE.FogExp2(0x0c0a1a, 0.0035);

  scene.add(new THREE.AmbientLight(0x8b9cff, 0.58));
  const moon = new THREE.DirectionalLight(0xe9d5ff, 1.35);
  moon.position.set(40, 80, -30);
  moon.castShadow = true;
  scene.add(moon);

  const hemi = new THREE.HemisphereLight(0x67e8f9, 0x4c1d95, 0.5);
  scene.add(hemi);

  const aurora = new THREE.PointLight(0x34d399, 2.6, 260);
  aurora.position.set(-30, 50, 20);
  scene.add(aurora);

  const pink = new THREE.PointLight(0xff3d9a, 2.0, 200);
  pink.position.set(50, 35, -40);
  scene.add(pink);

  const cyan = new THREE.PointLight(0x3de8ff, 2.2, 185);
  cyan.position.set(-20, 25, 60);
  scene.add(cyan);

  const violet = new THREE.PointLight(0x8b5cf6, 1.4, 160);
  violet.position.set(0, 45, -80);
  scene.add(violet);

  // Aurora curtain planes (additive, low poly)
  const auroraPlanes = [];
  const auroraColors = [
    { c: 0x34d399, o: 0.14 },
    { c: 0x3de8ff, o: 0.12 },
    { c: 0xff3d9a, o: 0.1 },
    { c: 0x8b5cf6, o: 0.11 },
  ];
  for (let i = 0; i < 4; i++) {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 90),
      new THREE.MeshBasicMaterial({
        color: auroraColors[i].c,
        transparent: true,
        opacity: auroraColors[i].o,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    const ang = (i / 4) * Math.PI * 2;
    plane.position.set(Math.cos(ang) * 80, 35 + i * 8, Math.sin(ang) * 80 - 60);
    plane.rotation.y = ang + Math.PI * 0.5;
    plane.rotation.x = -0.25 - i * 0.05;
    scene.add(plane);
    auroraPlanes.push(plane);
  }

  // Horizon crystal ring accent
  const horizonRing = new THREE.Mesh(
    new THREE.TorusGeometry(280, 1.2, 8, 64),
    new THREE.MeshStandardMaterial({
      color: 0x3de8ff,
      emissive: 0x8b5cf6,
      emissiveIntensity: 0.6,
      metalness: 0.7,
      roughness: 0.2,
      transparent: true,
      opacity: 0.35,
    })
  );
  horizonRing.rotation.x = Math.PI * 0.5;
  horizonRing.position.y = -22;
  scene.add(horizonRing);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(500, 96),
    makeDesertMaterial(pack)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -28;
  floor.receiveShadow = true;
  scene.add(floor);

  const shardGeo = new THREE.ConeGeometry(3, 18, 6);
  const shardMat = makeCrystalMaterial(pack, 0x8b5cf6, 0x4c1d95);
  shardMat.opacity = 0.8;
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const r = 160 + (i % 7) * 18;
    const shard = new THREE.Mesh(shardGeo, shardMat);
    shard.position.set(Math.cos(a) * r, -20 + (i % 5) * 2, Math.sin(a) * r);
    shard.scale.set(0.8 + (i % 4) * 0.4, 1 + (i % 5) * 0.5, 0.8 + (i % 3) * 0.3);
    shard.rotation.z = (Math.random() - 0.5) * 0.3;
    scene.add(shard);
  }

  // Crystal dust near track height
  const dustCount = 320;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 40 + Math.random() * 120;
    dustPos[i * 3] = Math.cos(ang) * rad;
    dustPos[i * 3 + 1] = Math.random() * 35 + 2;
    dustPos[i * 3 + 2] = Math.sin(ang) * rad;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const crystalDust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: 0xc4b5fd,
      size: 0.45,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
      map: pack.glowViolet || pack.glowCyan || null,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(crystalDust);

  const starCount = 900;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 400;
    starPos[i * 3 + 1] = Math.random() * 120 - 10;
    starPos[i * 3 + 2] = (Math.random() - 0.5) * 400;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: 0xa5f3fc,
      size: 0.65,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      map: pack.glowCyan || null,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(stars);

  const moonGeo = new THREE.SphereGeometry(8, 32, 32);
  const m1 = new THREE.Mesh(moonGeo, makeMoonMaterial(pack, 0xe9d5ff, 0xc4b5fd));
  m1.position.set(-80, 90, -120);
  scene.add(m1);
  const m2 = new THREE.Mesh(moonGeo, makeMoonMaterial(pack, 0xfce7f3, 0xf9a8d4));
  m2.position.set(-55, 75, -130);
  m2.scale.setScalar(0.55);
  scene.add(m2);

  // Twin moon halos
  for (const m of [m1, m2]) {
    if (pack.glowViolet) {
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: pack.glowViolet,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      halo.scale.set(40, 40, 1);
      halo.position.copy(m.position);
      scene.add(halo);
    }
  }

  return { aurora, pink, cyan, violet, stars, crystalDust, auroraPlanes, horizonRing, moons: [m1, m2] };
}
