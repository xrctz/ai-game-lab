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

/** Crystal facet sparkle map for emissive / transmission accents. */
export function createCrystalFacetMap(size = 256, seed = 3.7) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0a0618';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 48; i++) {
    const x = hash2(i * 2.1 + seed, seed) * size;
    const y = hash2(i * 3.3, seed * 1.7) * size;
    const w = 8 + hash2(i, i * 0.5) * 28;
    const h = 4 + hash2(i * 1.1, i) * 18;
    const rot = hash2(i * 0.7, seed) * Math.PI;
    const hue = hash2(i * 1.9, seed * 2) > 0.5 ? '#3de8ff' : '#c4b5fd';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.45, hue + 'cc');
    g.addColorStop(0.55, '#ffffff');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // Hex lattice hints
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.18)';
  ctx.lineWidth = 1;
  const step = size / 8;
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cx = col * step + (row % 2) * step * 0.5;
      const cy = row * step * 0.86;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k - Math.PI / 6;
        const px = cx + Math.cos(a) * step * 0.28;
        const py = cy + Math.sin(a) * step * 0.28;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Orb emissive sparkle — bright facets on dark glass core. */
export function createOrbEmissiveMap(size = 256) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a0f2e';
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.42);
  core.addColorStop(0, '#fff8e8');
  core.addColorStop(0.25, '#ffc857');
  core.addColorStop(0.55, '#ff9f3d');
  core.addColorStop(1, '#000');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 36; i++) {
    const ang = (i / 36) * Math.PI * 2 + hash2(i, 1.2) * 0.4;
    const r = size * (0.12 + hash2(i * 2, i) * 0.28);
    const sx = cx + Math.cos(ang) * r;
    const sy = cy + Math.sin(ang) * r;
    const spark = ctx.createRadialGradient(sx, sy, 0, sx, sy, 4 + hash2(i, i) * 8);
    spark.addColorStop(0, '#ffffff');
    spark.addColorStop(0.4, '#ffe08a');
    spark.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spark;
    ctx.beginPath();
    ctx.arc(sx, sy, 6 + hash2(i * 1.3, i) * 6, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft energy wake / trail sprite. */
export function createWakeSprite(color = '#3de8ff', size = 256) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const cx = size / 2;
  const cy = size * 0.55;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.48);
  g.addColorStop(0, color);
  g.addColorStop(0.2, color + 'cc');
  g.addColorStop(0.55, color + '44');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Elongated wake streak
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1.8, 0.55);
  const streak = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.35);
  streak.addColorStop(0, '#ffffffaa');
  streak.addColorStop(0.35, color + '88');
  streak.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = streak;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Road overlay: edge lines + dashed center + crystal hex grid + sector ticks. */
export function createRoadOverlay(size = 1024) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');

  // Base transparent dark crystal sheen with violet depth
  const g = ctx.createLinearGradient(0, 0, size, 0);
  g.addColorStop(0, 'rgba(16, 8, 42, 0.96)');
  g.addColorStop(0.08, 'rgba(45, 28, 95, 0.62)');
  g.addColorStop(0.5, 'rgba(24, 16, 58, 0.38)');
  g.addColorStop(0.92, 'rgba(45, 28, 95, 0.62)');
  g.addColorStop(1, 'rgba(16, 8, 42, 0.96)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Subtle longitudinal crystal grain
  ctx.globalAlpha = 0.14;
  for (let i = 0; i < 24; i++) {
    const x = (i / 24) * size;
    const grain = ctx.createLinearGradient(x, 0, x + size * 0.04, 0);
    grain.addColorStop(0, 'rgba(61, 232, 255, 0)');
    grain.addColorStop(0.5, 'rgba(167, 139, 250, 0.8)');
    grain.addColorStop(1, 'rgba(61, 232, 255, 0)');
    ctx.fillStyle = grain;
    ctx.fillRect(x, 0, size * 0.04, size);
  }
  ctx.globalAlpha = 1;

  // Edge neon rails strip
  const edgeGlow = ctx.createLinearGradient(0, 0, size * 0.12, 0);
  edgeGlow.addColorStop(0, 'rgba(61, 232, 255, 0.98)');
  edgeGlow.addColorStop(0.35, 'rgba(139, 92, 246, 0.65)');
  edgeGlow.addColorStop(1, 'rgba(61, 232, 255, 0)');
  ctx.fillStyle = edgeGlow;
  ctx.fillRect(0, 0, size * 0.1, size);
  const edgeGlowR = ctx.createLinearGradient(size, 0, size * 0.88, 0);
  edgeGlowR.addColorStop(0, 'rgba(255, 61, 154, 0.95)');
  edgeGlowR.addColorStop(0.35, 'rgba(139, 92, 246, 0.6)');
  edgeGlowR.addColorStop(1, 'rgba(255, 61, 154, 0)');
  ctx.fillStyle = edgeGlowR;
  ctx.fillRect(size * 0.9, 0, size * 0.1, size);

  // Dashed center line with aurora tint
  ctx.strokeStyle = 'rgba(61, 232, 255, 0.9)';
  ctx.lineWidth = size * 0.011;
  ctx.setLineDash([size * 0.055, size * 0.038]);
  ctx.beginPath();
  ctx.moveTo(size * 0.5, 0);
  ctx.lineTo(size * 0.5, size);
  ctx.stroke();
  ctx.setLineDash([]);

  // Lane chevrons — brighter toward center
  for (let y = 0; y < size; y += size * 0.1) {
    const pulse = 0.18 + 0.1 * Math.sin((y / size) * Math.PI * 6);
    ctx.fillStyle = `rgba(167, 139, 250, ${pulse})`;
    ctx.beginPath();
    ctx.moveTo(size * 0.5, y);
    ctx.lineTo(size * 0.41, y + size * 0.038);
    ctx.lineTo(size * 0.59, y + size * 0.038);
    ctx.closePath();
    ctx.fill();
  }

  // Sector tick marks (readability)
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
  ctx.lineWidth = size * 0.004;
  for (let y = 0; y < size; y += size / 6) {
    ctx.beginPath();
    ctx.moveTo(size * 0.12, y);
    ctx.lineTo(size * 0.22, y);
    ctx.moveTo(size * 0.78, y);
    ctx.lineTo(size * 0.88, y);
    ctx.stroke();
  }

  // Micro circuit hex lines
  ctx.strokeStyle = 'rgba(61, 232, 255, 0.14)';
  ctx.lineWidth = 1;
  const hexStep = size / 16;
  for (let row = 0; row < 18; row++) {
    for (let col = 0; col < 18; col++) {
      const hx = col * hexStep + (row % 2) * hexStep * 0.5;
      const hy = row * hexStep * 0.86;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k - Math.PI / 6;
        const px = hx + Math.cos(a) * hexStep * 0.22;
        const py = hy + Math.sin(a) * hexStep * 0.22;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Emissive strip map for road (edges + center glow + sector pulses). */
export function createRoadEmissive(size = 512) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);

  let g = ctx.createLinearGradient(0, 0, size * 0.15, 0);
  g.addColorStop(0, '#3de8ff');
  g.addColorStop(0.6, '#2244aa');
  g.addColorStop(1, '#000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size * 0.09, size);

  g = ctx.createLinearGradient(size, 0, size * 0.85, 0);
  g.addColorStop(0, '#ff3d9a');
  g.addColorStop(0.6, '#662244');
  g.addColorStop(1, '#000');
  ctx.fillStyle = g;
  ctx.fillRect(size * 0.91, 0, size * 0.09, size);

  ctx.strokeStyle = '#3de8ff';
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = size * 0.018;
  ctx.setLineDash([size * 0.048, size * 0.042]);
  ctx.beginPath();
  ctx.moveTo(size * 0.5, 0);
  ctx.lineTo(size * 0.5, size);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Sector pulse bands
  for (let i = 0; i < 6; i++) {
    const y = (i / 6) * size;
    const band = ctx.createLinearGradient(0, y, 0, y + size * 0.04);
    band.addColorStop(0, 'rgba(52, 211, 153, 0)');
    band.addColorStop(0.5, 'rgba(52, 211, 153, 0.35)');
    band.addColorStop(1, 'rgba(52, 211, 153, 0)');
    ctx.fillStyle = band;
    ctx.fillRect(size * 0.25, y, size * 0.5, size * 0.04);
  }

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
  const roadNormal = createNormalMap(512, 2.4, 0.1);
  roadNormal.repeat.set(1, 8);
  const roadRough = createRoughnessMap(512, 0.24, 0.38, 1);
  roadRough.repeat.set(1, 8);
  const roadOverlay = createRoadOverlay(1024);
  roadOverlay.repeat.set(1, 8);
  const roadEmissive = createRoadEmissive(512);
  roadEmissive.repeat.set(1, 8);

  const crystalNormal = createNormalMap(512, 3.8, 2.2);
  crystalNormal.repeat.set(2, 2);
  const crystalRough = createRoughnessMap(512, 0.18, 0.48, 3);
  crystalRough.repeat.set(2, 2);
  const crystalFacet = createCrystalFacetMap(256, 3.7);
  crystalFacet.repeat.set(2, 2);

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

  const orbEmissive = createOrbEmissiveMap(256);

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
    crystalFacet,
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
    orbEmissive,
    envSky,
    envMap,
    glowCyan: createGlowSprite('#3de8ff'),
    glowPink: createGlowSprite('#ff3d9a'),
    glowGold: createGlowSprite('#ffc857'),
    glowViolet: createGlowSprite('#a78bfa'),
    glowAurora: createGlowSprite('#34d399'),
    wakeCyan: createWakeSprite('#3de8ff'),
    wakePink: createWakeSprite('#ff3d9a'),
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
    metalness: 0.78,
    roughness: 0.28,
    emissive: 0x1a1040,
    emissiveIntensity: 0.5,
    envMapIntensity: 1.25,
  });
  if (pack.roadAlbedo) {
    mat.map = pack.roadAlbedo;
  } else {
    mat.color.set(0x1a1440);
  }
  if (pack.roadEmissive) {
    mat.emissiveMap = pack.roadEmissive;
    mat.emissive.set(0xffffff);
    mat.emissiveIntensity = 0.95;
  }
  if (pack.roadNormal) {
    mat.normalMap = pack.roadNormal;
    mat.normalScale = new THREE.Vector2(0.95, 0.95);
  }
  if (pack.roadRough) {
    mat.roughnessMap = pack.roadRough;
    mat.roughness = 0.5;
  }
  if (pack.envMap) mat.envMap = pack.envMap;
  return mat;
}

export function makeCrystalMaterial(pack, tint = 0xa78bfa, emissive = 0x6d28d9) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: tint,
    metalness: 0.42,
    roughness: 0.14,
    transmission: 0.42,
    thickness: 1.4,
    transparent: true,
    opacity: 0.9,
    emissive,
    emissiveIntensity: 0.72,
    envMapIntensity: 1.55,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    ior: 1.52,
  });
  if (pack.crystalAlbedo) mat.map = pack.crystalAlbedo;
  if (pack.crystalFacet) {
    mat.emissiveMap = pack.crystalFacet;
    mat.emissive = new THREE.Color(0xffffff);
    mat.emissiveIntensity = 0.35;
  }
  if (pack.crystalNormal) {
    mat.normalMap = pack.crystalNormal;
    mat.normalScale = new THREE.Vector2(1.35, 1.35);
  }
  if (pack.crystalRough) mat.roughnessMap = pack.crystalRough;
  if (pack.envMap) mat.envMap = pack.envMap;
  return mat;
}

export function makeRailMaterial(pack) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xc4b5fd,
    metalness: 0.62,
    roughness: 0.12,
    transparent: true,
    opacity: 0.92,
    emissive: 0xffffff,
    emissiveIntensity: 1.35,
    transmission: 0.32,
    thickness: 0.7,
    envMapIntensity: 1.65,
    clearcoat: 0.9,
    clearcoatRoughness: 0.06,
  });
  if (pack.railEmissive) {
    mat.map = pack.railEmissive;
    mat.emissiveMap = pack.railEmissive;
  }
  if (pack.railNormal) {
    mat.normalMap = pack.railNormal;
    mat.normalScale = new THREE.Vector2(0.65, 0.65);
  }
  if (pack.envMap) mat.envMap = pack.envMap;
  return mat;
}

export function makeDesertMaterial(pack) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.58,
    roughness: 0.48,
    emissive: 0x1a0a30,
    emissiveIntensity: 0.32,
    envMapIntensity: 0.75,
  });
  if (pack.desertAlbedo) mat.map = pack.desertAlbedo;
  else mat.color.set(0x1e1035);
  if (pack.desertNormal) {
    mat.normalMap = pack.desertNormal;
    mat.normalScale = new THREE.Vector2(1.5, 1.5);
  }
  if (pack.desertRough) mat.roughnessMap = pack.desertRough;
  if (pack.crystalFacet) {
    mat.emissiveMap = pack.crystalFacet;
    mat.emissive = new THREE.Color(0x4c1d95);
    mat.emissiveIntensity = 0.12;
  }
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
    metalness: 0.45,
    roughness: 0.32,
    emissive: 0x2e1065,
    emissiveIntensity: 0.55,
    transmission: 0.2,
    thickness: 2,
    envMapIntensity: 1.2,
    clearcoat: 0.6,
  });
  if (pack.crystalAlbedo) mat.map = pack.crystalAlbedo;
  if (pack.crystalFacet) {
    mat.emissiveMap = pack.crystalFacet;
    mat.emissive = new THREE.Color(0xa78bfa);
    mat.emissiveIntensity = 0.28;
  }
  if (pack.crystalNormal) {
    mat.normalMap = pack.crystalNormal;
    mat.normalScale = new THREE.Vector2(1.7, 1.7);
  }
  if (pack.crystalRough) mat.roughnessMap = pack.crystalRough;
  if (pack.envMap) mat.envMap = pack.envMap;
  return mat;
}

const ORB_PALETTE = [0xffc857, 0x3de8ff, 0xff6bb5, 0x34d399, 0xff9f3d, 0xc4b5fd];

export function makeOrbMaterial(pack, tint = 0xffc857, emissive = 0xffc857) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: tint,
    metalness: 0.25,
    roughness: 0.1,
    emissive,
    emissiveIntensity: 1.85,
    transparent: true,
    opacity: 0.96,
    transmission: 0.48,
    thickness: 0.9,
    envMapIntensity: 1.45,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
  });
  if (pack.orbAlbedo) {
    mat.map = pack.orbAlbedo;
  }
  if (pack.orbEmissive) {
    mat.emissiveMap = pack.orbEmissive;
    mat.emissive = new THREE.Color(0xffffff);
    mat.emissiveIntensity = 2.1;
  }
  if (pack.envMap) mat.envMap = pack.envMap;
  return mat;
}

export function getOrbPalette(i) {
  return ORB_PALETTE[i % ORB_PALETTE.length];
}

export function makeMoonMaterial(pack, tint = 0xe9d5ff, emissive = 0xc4b5fd) {
  const mat = new THREE.MeshStandardMaterial({
    color: tint,
    emissive,
    emissiveIntensity: 0.62,
    metalness: 0.12,
    roughness: 0.82,
  });
  if (pack.moonAlbedo) mat.map = pack.moonAlbedo;
  return mat;
}
