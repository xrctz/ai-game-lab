import * as THREE from 'three';

const BASE = 'assets/textures/';

/** Procedural seamless noise helpers (canvas) for normals / roughness. */
function makeCanvas(size = 512) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0);
  const b = hash2(x0 + 1, y0);
  const c = hash2(x0, y0 + 1);
  const d = hash2(x0 + 1, y0 + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x, y, oct = 5) {
  let v = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    v += a * valueNoise(x * f, y * f);
    a *= 0.5;
    f *= 2;
  }
  return v;
}

/** Height-derived normal map (blue-ish, standard OpenGL style). */
export function createNormalMap(size = 512, scale = 1.8, seed = 0) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const h = (x, y) => fbm(x * 0.02 * scale + seed, y * 0.02 * scale + seed * 1.3, 5);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const s = 1.2;
      const dx = h(x + 1, y) - h(x - 1, y);
      const dy = h(x, y + 1) - h(x, y - 1);
      let nx = -dx * s * 40;
      let ny = -dy * s * 40;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * size + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Roughness map: dark = glossy, light = rough. */
export function createRoughnessMap(size = 512, base = 0.35, variance = 0.4, seed = 2) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x * 0.025 + seed, y * 0.025 + seed, 4);
      const v = Math.min(255, Math.max(0, (base + (n - 0.5) * variance) * 255));
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Road overlay: edge lines + dashed center + subtle grid (multiplied onto albedo). */
export function createRoadOverlay(size = 1024) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');

  // Base transparent dark crystal sheen
  const g = ctx.createLinearGradient(0, 0, size, 0);
  g.addColorStop(0, 'rgba(20, 10, 50, 0.95)');
  g.addColorStop(0.08, 'rgba(40, 25, 90, 0.55)');
  g.addColorStop(0.5, 'rgba(30, 20, 70, 0.35)');
  g.addColorStop(0.92, 'rgba(40, 25, 90, 0.55)');
  g.addColorStop(1, 'rgba(20, 10, 50, 0.95)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Edge neon rails strip
  const edgeGlow = ctx.createLinearGradient(0, 0, size * 0.12, 0);
  edgeGlow.addColorStop(0, 'rgba(61, 232, 255, 0.95)');
  edgeGlow.addColorStop(0.4, 'rgba(139, 92, 246, 0.55)');
  edgeGlow.addColorStop(1, 'rgba(61, 232, 255, 0)');
  ctx.fillStyle = edgeGlow;
  ctx.fillRect(0, 0, size * 0.1, size);
  // mirror right
  const edgeGlowR = ctx.createLinearGradient(size, 0, size * 0.88, 0);
  edgeGlowR.addColorStop(0, 'rgba(255, 61, 154, 0.9)');
  edgeGlowR.addColorStop(0.4, 'rgba(139, 92, 246, 0.5)');
  edgeGlowR.addColorStop(1, 'rgba(255, 61, 154, 0)');
  ctx.fillStyle = edgeGlowR;
  ctx.fillRect(size * 0.9, 0, size * 0.1, size);

  // Dashed center line
  ctx.strokeStyle = 'rgba(61, 232, 255, 0.85)';
  ctx.lineWidth = size * 0.012;
  ctx.setLineDash([size * 0.06, size * 0.04]);
  ctx.beginPath();
  ctx.moveTo(size * 0.5, 0);
  ctx.lineTo(size * 0.5, size);
  ctx.stroke();
  ctx.setLineDash([]);

  // Subtle lane chevrons
  ctx.fillStyle = 'rgba(167, 139, 250, 0.22)';
  for (let y = 0; y < size; y += size * 0.12) {
    ctx.beginPath();
    ctx.moveTo(size * 0.5, y);
    ctx.lineTo(size * 0.42, y + size * 0.04);
    ctx.lineTo(size * 0.58, y + size * 0.04);
    ctx.closePath();
    ctx.fill();
  }

  // Micro circuit lines
  ctx.strokeStyle = 'rgba(61, 232, 255, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const x = (i / 12) * size;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Emissive strip map for road (edges + center glow). */
export function createRoadEmissive(size = 512) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);

  let g = ctx.createLinearGradient(0, 0, size * 0.15, 0);
  g.addColorStop(0, '#3de8ff');
  g.addColorStop(1, '#000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size * 0.08, size);

  g = ctx.createLinearGradient(size, 0, size * 0.85, 0);
  g.addColorStop(0, '#ff3d9a');
  g.addColorStop(1, '#000');
  ctx.fillStyle = g;
  ctx.fillRect(size * 0.92, 0, size * 0.08, size);

  ctx.strokeStyle = '#3de8ff';
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = size * 0.02;
  ctx.setLineDash([size * 0.05, size * 0.05]);
  ctx.beginPath();
  ctx.moveTo(size * 0.5, 0);
  ctx.lineTo(size * 0.5, size);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Energy wing / trail soft sprite. */
export function createGlowSprite(color = '#3de8ff', size = 128) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);
  g.addColorStop(0.35, color + 'aa');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function loadImageTexture(url, { repeatX = 1, repeatY = 1, colorSpace = THREE.SRGBColorSpace } = {}) {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeatX, repeatY);
        tex.colorSpace = colorSpace;
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        resolve(tex);
      },
      undefined,
      reject
    );
  });
}

function safeLoad(url, opts) {
  return loadImageTexture(url, opts).catch((err) => {
    console.warn('Texture load failed:', url, err);
    return null;
  });
}

/**
 * Load all game textures + build procedural maps.
 * Call once at boot / before building the race world.
 */
export async function loadTexturePack(renderer) {
  const [
    roadAlbedo,
    crystalAlbedo,
    desertAlbedo,
    hullAlbedo,
    railEmissive,
    moonAlbedo,
    orbAlbedo,
    envSky,
  ] = await Promise.all([
    safeLoad(`${BASE}road_albedo.jpg`, { repeatX: 1, repeatY: 8 }),
    safeLoad(`${BASE}crystal_albedo.jpg`, { repeatX: 2, repeatY: 2 }),
    safeLoad(`${BASE}desert_albedo.jpg`, { repeatX: 12, repeatY: 12 }),
    safeLoad(`${BASE}hull_albedo.jpg`, { repeatX: 2, repeatY: 2 }),
    safeLoad(`${BASE}rail_emissive.jpg`, { repeatX: 1, repeatY: 10 }),
    safeLoad(`${BASE}moon_albedo.jpg`, { repeatX: 1, repeatY: 1 }),
    safeLoad(`${BASE}orb_albedo.jpg`, { repeatX: 1, repeatY: 1 }),
    safeLoad(`${BASE}env_sky.jpg`, { repeatX: 1, repeatY: 1 }),
  ]);

  // Procedural PBR companions
  const roadNormal = createNormalMap(512, 2.2, 0.1);
  roadNormal.repeat.set(1, 8);
  const roadRough = createRoughnessMap(512, 0.28, 0.35, 1);
  roadRough.repeat.set(1, 8);
  const roadOverlay = createRoadOverlay(1024);
  roadOverlay.repeat.set(1, 8);
  const roadEmissive = createRoadEmissive(512);
  roadEmissive.repeat.set(1, 8);

  const crystalNormal = createNormalMap(512, 3.5, 2.2);
  crystalNormal.repeat.set(2, 2);
  const crystalRough = createRoughnessMap(512, 0.22, 0.45, 3);
  crystalRough.repeat.set(2, 2);

  const desertNormal = createNormalMap(512, 1.4, 4);
  desertNormal.repeat.set(12, 12);
  const desertRough = createRoughnessMap(512, 0.55, 0.3, 5);
  desertRough.repeat.set(12, 12);

  const hullNormal = createNormalMap(256, 2.8, 7);
  hullNormal.repeat.set(2, 2);
  const hullRough = createRoughnessMap(256, 0.18, 0.25, 8);
  hullRough.repeat.set(2, 2);

  const railNormal = createNormalMap(256, 2, 9);
  railNormal.repeat.set(1, 10);

  // Environment reflections (big visual upgrade)
  let envMap = null;
  if (envSky && renderer) {
    envSky.mapping = THREE.EquirectangularReflectionMapping;
    envSky.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const rt = pmrem.fromEquirectangular(envSky);
    envMap = rt.texture;
    pmrem.dispose();
  }

  const pack = {
    roadAlbedo,
    roadNormal,
    roadRough,
    roadOverlay,
    roadEmissive,
    crystalAlbedo,
    crystalNormal,
    crystalRough,
    desertAlbedo,
    desertNormal,
    desertRough,
    hullAlbedo,
    hullNormal,
    hullRough,
    railEmissive,
    railNormal,
    moonAlbedo,
    orbAlbedo,
    envSky,
    envMap,
    glowCyan: createGlowSprite('#3de8ff'),
    glowPink: createGlowSprite('#ff3d9a'),
    glowGold: createGlowSprite('#ffc857'),
  };

  // Max anisotropy from GPU
  if (renderer) {
    const maxA = renderer.capabilities.getMaxAnisotropy();
    Object.values(pack).forEach((t) => {
      if (t && t.isTexture) t.anisotropy = Math.min(8, maxA);
    });
  }

  return pack;
}

/** Build a road material using albedo + procedural detail. */
export function makeRoadMaterial(pack) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.72,
    roughness: 0.32,
    emissive: 0x1a1040,
    emissiveIntensity: 0.45,
    envMapIntensity: 1.15,
  });
  if (pack.roadAlbedo) {
    mat.map = pack.roadAlbedo;
  } else {
    mat.color.set(0x1a1440);
  }
  // Overlay via light map-like approach: use emissive map for neon lanes
  if (pack.roadEmissive) {
    mat.emissiveMap = pack.roadEmissive;
    mat.emissive.set(0xffffff);
    mat.emissiveIntensity = 0.85;
  }
  if (pack.roadNormal) mat.normalMap = pack.roadNormal;
  if (pack.roadNormal) mat.normalScale = new THREE.Vector2(0.85, 0.85);
  if (pack.roadRough) {
    mat.roughnessMap = pack.roadRough;
    mat.roughness = 0.55;
  }
  if (pack.envMap) mat.envMap = pack.envMap;
  return mat;
}

export function makeCrystalMaterial(pack, tint = 0xa78bfa, emissive = 0x6d28d9) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: tint,
    metalness: 0.35,
    roughness: 0.18,
    transmission: 0.35,
    thickness: 1.2,
    transparent: true,
    opacity: 0.92,
    emissive,
    emissiveIntensity: 0.55,
    envMapIntensity: 1.4,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  });
  if (pack.crystalAlbedo) mat.map = pack.crystalAlbedo;
  if (pack.crystalNormal) {
    mat.normalMap = pack.crystalNormal;
    mat.normalScale = new THREE.Vector2(1.2, 1.2);
  }
  if (pack.crystalRough) mat.roughnessMap = pack.crystalRough;
  if (pack.envMap) mat.envMap = pack.envMap;
  return mat;
}

export function makeRailMaterial(pack) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xc4b5fd,
    metalness: 0.55,
    roughness: 0.15,
    transparent: true,
    opacity: 0.9,
    emissive: 0xffffff,
    emissiveIntensity: 1.1,
    transmission: 0.25,
    thickness: 0.6,
    envMapIntensity: 1.5,
    clearcoat: 0.8,
  });
  if (pack.railEmissive) {
    mat.map = pack.railEmissive;
    mat.emissiveMap = pack.railEmissive;
  }
  if (pack.railNormal) {
    mat.normalMap = pack.railNormal;
    mat.normalScale = new THREE.Vector2(0.6, 0.6);
  }
  if (pack.envMap) mat.envMap = pack.envMap;
  return mat;
}

export function makeDesertMaterial(pack) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.55,
    roughness: 0.5,
    emissive: 0x1a0a30,
    emissiveIntensity: 0.25,
    envMapIntensity: 0.7,
  });
  if (pack.desertAlbedo) mat.map = pack.desertAlbedo;
  else mat.color.set(0x1e1035);
  if (pack.desertNormal) {
    mat.normalMap = pack.desertNormal;
    mat.normalScale = new THREE.Vector2(1.4, 1.4);
  }
  if (pack.desertRough) mat.roughnessMap = pack.desertRough;
  if (pack.envMap) mat.envMap = pack.envMap;
  return mat;
}

export function makeHullMaterial(pack, tintHex, glowHex) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: tintHex,
    metalness: 0.88,
    roughness: 0.22,
    emissive: glowHex,
    emissiveIntensity: 0.28,
    clearcoat: 0.9,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.6,
  });
  if (pack?.hullAlbedo) {
    mat.map = pack.hullAlbedo;
    mat.color = new THREE.Color(tintHex);
  }
  if (pack?.hullNormal) {
    mat.normalMap = pack.hullNormal;
    mat.normalScale = new THREE.Vector2(0.7, 0.7);
  }
  if (pack?.hullRough) mat.roughnessMap = pack.hullRough;
  if (pack?.envMap) mat.envMap = pack.envMap;
  return mat;
}

export function makeIslandMaterial(pack) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x7c3aed,
    metalness: 0.4,
    roughness: 0.35,
    emissive: 0x2e1065,
    emissiveIntensity: 0.45,
    transmission: 0.15,
    thickness: 2,
    envMapIntensity: 1.1,
  });
  if (pack.crystalAlbedo) mat.map = pack.crystalAlbedo;
  if (pack.crystalNormal) {
    mat.normalMap = pack.crystalNormal;
    mat.normalScale = new THREE.Vector2(1.6, 1.6);
  }
  if (pack.crystalRough) mat.roughnessMap = pack.crystalRough;
  if (pack.envMap) mat.envMap = pack.envMap;
  return mat;
}

export function makeOrbMaterial(pack) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffe08a,
    metalness: 0.2,
    roughness: 0.15,
    emissive: 0xffc857,
    emissiveIntensity: 1.4,
    transparent: true,
    opacity: 0.95,
    transmission: 0.4,
    thickness: 0.8,
    envMapIntensity: 1.2,
  });
  if (pack.orbAlbedo) {
    mat.map = pack.orbAlbedo;
    mat.emissiveMap = pack.orbAlbedo;
  }
  if (pack.envMap) mat.envMap = pack.envMap;
  return mat;
}

export function makeMoonMaterial(pack, tint = 0xe9d5ff, emissive = 0xc4b5fd) {
  const mat = new THREE.MeshStandardMaterial({
    color: tint,
    emissive,
    emissiveIntensity: 0.55,
    metalness: 0.1,
    roughness: 0.85,
  });
  if (pack.moonAlbedo) mat.map = pack.moonAlbedo;
  return mat;
}
