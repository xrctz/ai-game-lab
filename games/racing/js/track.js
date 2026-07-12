import * as THREE from 'three';
import {
  makeRoadMaterial,
  makeRailMaterial,
  makeCrystalMaterial,
  makeDesertMaterial,
  makeIslandMaterial,
  makeOrbMaterial,
  makeMoonMaterial,
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
    // U across width, V along track — matches tileable road textures
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

  // Secondary road detail layer (chevrons + edge neon)
  if (pack.roadOverlay) {
    const detailMat = new THREE.MeshStandardMaterial({
      map: pack.roadOverlay,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      metalness: 0.35,
      roughness: 0.35,
      emissive: 0x332266,
      emissiveIntensity: 0.4,
      envMap: pack.envMap || null,
      envMapIntensity: 0.6,
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
  const stripeGeo = new THREE.TubeGeometry(stripeCurve, samples, 0.2, 8, true);
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0x3de8ff,
    emissive: 0x3de8ff,
    emissiveIntensity: 1.8,
    metalness: 0.3,
    roughness: 0.25,
    transparent: true,
    opacity: 0.9,
    envMap: pack.envMap || null,
    envMapIntensity: 0.8,
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
    const tube = new THREE.TubeGeometry(c, samples, 0.48, 8, true);
    group.add(new THREE.Mesh(tube, railMat));
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

  // Prism Gates
  const gates = [];
  const gateColors = [0x3de8ff, 0xff3d9a, 0xffc857, 0x34d399];
  for (let i = 0; i < 6; i++) {
    const t = (i + 0.5) / 6;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(7.5, 0.4, 12, 48),
      new THREE.MeshPhysicalMaterial({
        color: gateColors[i % 4],
        emissive: gateColors[i % 4],
        emissiveIntensity: 1.5,
        metalness: 0.4,
        roughness: 0.18,
        transparent: true,
        opacity: 0.92,
        transmission: 0.3,
        thickness: 0.5,
        envMap: pack.envMap || null,
        envMapIntensity: 1.2,
        clearcoat: 0.7,
      })
    );
    if (pack.railEmissive) {
      ring.material.map = pack.railEmissive;
      ring.material.emissiveMap = pack.railEmissive;
    }
    ring.position.copy(p).add(new THREE.Vector3(0, 1.2, 0));
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
    group.add(ring);
    gates.push({ mesh: ring, t, collected: false, color: gateColors[i % 4] });
  }

  // Spectrum orbs
  const orbs = [];
  const orbGeo = new THREE.IcosahedronGeometry(0.9, 2);
  const orbMat = makeOrbMaterial(pack);
  for (let i = 0; i < 18; i++) {
    const t = (i + 0.3) / 18;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tan).normalize();
    const lateral = ((i % 3) - 1) * 3.5;
    const orb = new THREE.Mesh(orbGeo, orbMat.clone());
    orb.position.copy(p).addScaledVector(side, lateral).add(new THREE.Vector3(0, 1.8, 0));
    group.add(orb);
    // Soft glow sprite under orb
    if (pack.glowGold) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: pack.glowGold,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      sprite.scale.set(3.5, 3.5, 1);
      sprite.position.copy(orb.position);
      group.add(sprite);
      orbs.push({ mesh: orb, t, taken: false, baseY: orb.position.y, glow: sprite });
    } else {
      orbs.push({ mesh: orb, t, taken: false, baseY: orb.position.y, glow: null });
    }
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
  // Sky background from generated panorama
  if (pack.envSky) {
    pack.envSky.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = pack.envSky;
    if (pack.envMap) scene.environment = pack.envMap;
  } else {
    scene.background = new THREE.Color(0x070612);
  }
  scene.fog = new THREE.FogExp2(0x0c0a1a, 0.0038);

  scene.add(new THREE.AmbientLight(0x8b9cff, 0.55));
  const moon = new THREE.DirectionalLight(0xe9d5ff, 1.25);
  moon.position.set(40, 80, -30);
  moon.castShadow = true;
  scene.add(moon);

  // Soft hemisphere fill (sky / ground bounce)
  const hemi = new THREE.HemisphereLight(0x67e8f9, 0x4c1d95, 0.45);
  scene.add(hemi);

  const aurora = new THREE.PointLight(0x34d399, 2.4, 240);
  aurora.position.set(-30, 50, 20);
  scene.add(aurora);

  const pink = new THREE.PointLight(0xff3d9a, 1.8, 190);
  pink.position.set(50, 35, -40);
  scene.add(pink);

  const cyan = new THREE.PointLight(0x3de8ff, 2.0, 170);
  cyan.position.set(-20, 25, 60);
  scene.add(cyan);

  // Crystal desert floor with full PBR
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(500, 96),
    makeDesertMaterial(pack)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -28;
  floor.receiveShadow = true;
  scene.add(floor);

  // Distant crystal shards
  const shardGeo = new THREE.ConeGeometry(3, 18, 6);
  const shardMat = makeCrystalMaterial(pack, 0x8b5cf6, 0x4c1d95);
  shardMat.opacity = 0.78;
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const r = 160 + (i % 7) * 18;
    const shard = new THREE.Mesh(shardGeo, shardMat);
    shard.position.set(Math.cos(a) * r, -20 + (i % 5) * 2, Math.sin(a) * r);
    shard.scale.set(0.8 + (i % 4) * 0.4, 1 + (i % 5) * 0.5, 0.8 + (i % 3) * 0.3);
    shard.rotation.z = (Math.random() - 0.5) * 0.3;
    scene.add(shard);
  }

  // Stars
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
      size: 0.6,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      map: pack.glowCyan || null,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(stars);

  // Twin moons with surface texture
  const moonGeo = new THREE.SphereGeometry(8, 32, 32);
  const m1 = new THREE.Mesh(moonGeo, makeMoonMaterial(pack, 0xe9d5ff, 0xc4b5fd));
  m1.position.set(-80, 90, -120);
  scene.add(m1);
  const m2 = new THREE.Mesh(moonGeo, makeMoonMaterial(pack, 0xfce7f3, 0xf9a8d4));
  m2.position.set(-55, 75, -130);
  m2.scale.setScalar(0.55);
  scene.add(m2);

  return { aurora, pink, cyan, stars, moons: [m1, m2] };
}
