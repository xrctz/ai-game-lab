/**
 * 3D World builder — converts WORLD_MAP tiles into a Three.js scene.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const TILE_SIZE = 2.0;
export const MODEL_BASE = 'assets/models/';

const TILE_MAT = {
  path:   0xc4a35a,
  grass:  0x4a9e3a,
  tree:   0x1e4d28,
  water:  0x2a6fcf,
  sand:   0xd4b896,
  rock:   0x5a5a6e,
  floor:  0xe8d5b0,
  door:   0x8b5a2b,
  flower: 0x6bb85a,
  forest: 0x2d6b2d,
  cave:   0x3a3a4a,
  heal:   0xff8a8a,
};

function tileKey(t) {
  const T = window.TILE;
  switch (t) {
    case T.PATH: return 'path';
    case T.GRASS: return 'grass';
    case T.TREE: return 'tree';
    case T.WATER: return 'water';
    case T.SAND: return 'sand';
    case T.ROCK: return 'rock';
    case T.FLOOR: return 'floor';
    case T.DOOR: return 'door';
    case T.FLOWER: return 'flower';
    case T.FOREST: return 'forest';
    case T.CAVE: return 'cave';
    case T.HEAL: return 'heal';
    default: return 'path';
  }
}

function tileHeight(t) {
  const T = window.TILE;
  if (t === T.WATER) return -0.35;
  if (t === T.ROCK) return 0.9;
  if (t === T.TREE) return 0.15;
  if (t === T.CAVE || t === T.SAND) return 0.05;
  if (t === T.FLOOR || t === T.DOOR || t === T.HEAL) return 0.12;
  return 0;
}

/** Vertical thickness of the ground slab for a tile type. */
function tileElev(t) {
  const h = tileHeight(t);
  return Math.max(0.08, 0.12 + Math.abs(h) * 0.5);
}

/**
 * World-space Y of the top of the tile slab (where feet should rest).
 */
export function tileSurfaceY(tx, ty) {
  const map = window.WORLD_MAP;
  const t = (map && map[ty] && map[ty][tx] != null) ? map[ty][tx] : 0;
  const h = tileHeight(t);
  return h + tileElev(t) + 0.01; // tiny epsilon so soles clear the slab
}

export function surfaceYAtWorld(x, z) {
  const { x: tx, y: ty } = worldToTile(x, z);
  return tileSurfaceY(tx, ty);
}

function mapW() { return window.MAP_W; }
function mapH() { return window.MAP_H; }

export function tileToWorld(tx, ty) {
  return {
    x: (tx - mapW() / 2) * TILE_SIZE + TILE_SIZE / 2,
    z: (ty - mapH() / 2) * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function worldToTile(x, z) {
  const tx = Math.floor((x + (mapW() / 2) * TILE_SIZE) / TILE_SIZE);
  const ty = Math.floor((z + (mapH() / 2) * TILE_SIZE) / TILE_SIZE);
  return { x: tx, y: ty };
}

/** Blender studio leftovers that must never appear in-game. */
const JUNK_NAME_RE = /^(ground|floor_ring|floor|plane|grid|camera|light|empty|axis|collection)$/i;

export class World3D {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'World';
    scene.add(this.group);
    this.landmarkGroup = new THREE.Group();
    this.landmarkGroup.name = 'Landmarks';
    this.group.add(this.landmarkGroup);
    this.cueGroup = new THREE.Group();
    this.cueGroup.name = 'InteractCues';
    this.group.add(this.cueGroup);
    this.loader = new GLTFLoader();
    this.models = {};
    this.npcMeshes = [];
    this.propMeshes = [];
    this.landmarkMeshes = [];
    this.interactCues = [];
    this.encounterCue = null;
    this.materials = {};
    this.minimapCanvas = null;
    this._sun = null;
    this._hemi = null;
  }

  async loadModels(onProgress) {
    const files = {
      player: 'player_trainer.glb',
      tree: 'tree.glb',
      // tallgrass / flowers: procedural only — GLB blades are fine in Blender but
      // flower blooms + stray pieces were reading as floating dark cubes in-game.
      sign: 'sign.glb',
      heal_pad: 'heal_pad.glb',
      cave: 'cave.glb',
      nurse: 'nurse_joy.glb',
      oak: 'professor_oak.glb',
      shop: 'shop_clerk.glb',
      kid: 'youngster_joey.glb',
      // New environment props (built in Blender)
      rock: 'rock.glb',
      berry_tree: 'berry_tree.glb',
      lamp: 'lamp.glb',
      lily: 'lily.glb',
      bush: 'bush.glb',
    };
    const keys = Object.keys(files);
    let done = 0;
    await Promise.all(keys.map(async (key) => {
      try {
        const gltf = await this.loader.loadAsync(MODEL_BASE + files[key]);
        this.models[key] = gltf.scene;
        this._normalizeModel(this.models[key], key);
      } catch (e) {
        console.warn('Model load failed:', key, e);
        this.models[key] = null;
      }
      done++;
      if (onProgress) onProgress(done / keys.length);
    }));
    // Explicit procedural-only keys
    this.models.tallgrass = null;
    this.models.flowers = null;
    this.models.heal_machine = null;
    this.models.pc = null;
  }

  _normalizeModel(root, key) {
    // Strip Blender studio junk (Ground plane, Floor_Ring, helpers, etc.)
    // BEFORE measuring bounds so scale/feet sit correctly.
    const junk = [];
    root.traverse((c) => {
      const n = (c.name || '');
      const matName = (c.isMesh && c.material && (c.material.name || c.material[0]?.name)) || '';
      const matStr = Array.isArray(c.material)
        ? c.material.map((m) => m?.name || '').join(' ')
        : (c.material?.name || '');
      if (
        JUNK_NAME_RE.test(n) ||
        /ground|floor_ring|floor ring/i.test(n) ||
        /m_ground|m_floorring|m_floor_ring/i.test(matStr) ||
        /m_ground|m_floorring|m_floor_ring/i.test(matName)
      ) {
        junk.push(c);
      }
    });
    for (const c of junk) {
      c.visible = false;
      if (c.parent) c.parent.remove(c);
    }

    // Characters: FrontSide only (DoubleSide caused dark z-fight flecks).
    // Thin props (grass/flowers) keep DoubleSide so blades read from both sides.
    const doubleSide = key === 'tallgrass' || key === 'flowers' || key === 'tree' || key === 'lily';
    root.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
        if (c.material) {
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          const cloned = mats.map((m) => {
            const cm = m.clone();
            cm.side = doubleSide ? THREE.DoubleSide : THREE.FrontSide;
            return cm;
          });
          c.material = Array.isArray(c.material) ? cloned : cloned[0];
        }
      }
    });

    // Fit to unit height using character/prop only (junk already removed)
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) return;
    const size = new THREE.Vector3();
    box.getSize(size);
    // Prefer height (Y) for humanoids so wide leftover geometry can't squash them
    let refDim = size.y > 0.01 ? size.y : Math.max(size.x, size.y, size.z, 0.001);
    if (key === 'tree' || key === 'cave' || key === 'lily') {
      refDim = Math.max(size.x, size.y, size.z, 0.001);
    }
    let targetH = 1.6;
    if (key === 'tree') targetH = 2.8;
    if (key === 'tallgrass' || key === 'flowers') targetH = 0.9;
    if (key === 'sign') targetH = 1.2;
    if (key === 'heal_pad') targetH = 0.15;
    if (key === 'heal_machine' || key === 'pc') targetH = 1.4;
    if (key === 'cave') targetH = 2.5;
    if (key === 'rock') targetH = 1.15;
    if (key === 'berry_tree') targetH = 1.9;
    if (key === 'lamp') targetH = 2.4;
    if (key === 'lily') targetH = 1.3;
    if (key === 'bush') targetH = 0.75;
    if (['nurse', 'oak', 'shop', 'kid', 'player'].includes(key)) targetH = 1.7;
    const s = targetH / Math.max(refDim, 0.001);
    root.scale.setScalar(s);
    // Sit soles on local y=0
    root.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(root);
    root.position.y -= box2.min.y;
  }

  cloneModel(key) {
    const src = this.models[key];
    if (!src) return null;
    const c = src.clone(true);
    c.traverse((o) => {
      if (o.isMesh && o.material) o.material = o.material.clone();
    });
    return c;
  }

  mat(hex, opts = {}) {
    const id = hex + (opts.transparent ? 't' : '') + (opts.emissive || '');
    if (!this.materials[id]) {
      this.materials[id] = new THREE.MeshStandardMaterial({
        color: hex,
        roughness: opts.roughness ?? 0.85,
        metalness: opts.metalness ?? 0.05,
        transparent: !!opts.transparent,
        opacity: opts.opacity ?? 1,
        emissive: opts.emissive ? new THREE.Color(opts.emissive) : undefined,
        emissiveIntensity: opts.emissiveIntensity ?? 0,
      });
    }
    return this.materials[id];
  }

  /** Configure overworld fog + sun for depth and landmark readability. */
  setupAtmosphere(scene, renderer) {
    if (!scene) return;
    scene.background = new THREE.Color(0x7eb8e8);
    scene.fog = new THREE.FogExp2(0x9ec8e8, 0.012);

    if (renderer) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
    }

    // Retune existing lights if present on scene
    scene.traverse((o) => {
      if (o.isDirectionalLight && o.castShadow) this._sun = o;
      if (o.isHemisphereLight) this._hemi = o;
    });
    if (this._hemi) {
      this._hemi.color.setHex(0xfff6e8);
      this._hemi.groundColor.setHex(0x2d5a28);
      this._hemi.intensity = 0.92;
    }
    if (this._sun) {
      this._sun.color.setHex(0xfff0d4);
      this._sun.intensity = 1.25;
    }
  }

  build() {
    // Clear world geometry but keep landmark/cue container groups
    const keep = new Set([this.landmarkGroup, this.cueGroup]);
    [...this.group.children].forEach((ch) => {
      if (!keep.has(ch)) this.group.remove(ch);
    });
    if (!this.group.children.includes(this.landmarkGroup)) this.group.add(this.landmarkGroup);
    if (!this.group.children.includes(this.cueGroup)) this.group.add(this.cueGroup);
    while (this.landmarkGroup.children.length) this.landmarkGroup.remove(this.landmarkGroup.children[0]);
    while (this.cueGroup.children.length) this.cueGroup.remove(this.cueGroup.children[0]);
    this.npcMeshes = [];
    this.propMeshes = [];
    this.landmarkMeshes = [];
    this.interactCues = [];

    const T = window.TILE;
    const map = window.WORLD_MAP;
    const MW = mapW();
    const MH = mapH();

    // Ground tiles
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        const t = map[y][x];
        const key = tileKey(t);
        const pos = tileToWorld(x, y);
        const h = tileHeight(t);
        const elev = tileElev(t);

        // Base slab
        const geo = new THREE.BoxGeometry(TILE_SIZE * 0.98, elev, TILE_SIZE * 0.98);
        let color = TILE_MAT[key] || TILE_MAT.path;
        let matOpts = {};
        if (t === T.WATER) {
          matOpts = { transparent: true, opacity: 0.85, roughness: 0x0a2040, emissive: 0x0a3a80, emissiveIntensity: 0.15 };
          color = TILE_MAT.water;
        }
        if (t === T.HEAL) {
          matOpts = { emissive: 0xff4444, emissiveIntensity: 0.35 };
        }
        const mesh = new THREE.Mesh(geo, this.mat(color, matOpts));
        mesh.position.set(pos.x, h + elev / 2, pos.z);
        mesh.receiveShadow = true;
        mesh.castShadow = t === T.ROCK || t === T.TREE;
        mesh.userData = { tileX: x, tileY: y, tile: t };
        this.group.add(mesh);

        const sy = tileSurfaceY(x, y);
        // Decor props
        if (t === T.TREE) {
          this._placeProp('tree', pos.x, pos.z, Math.random() * Math.PI * 2, 0.9 + Math.random() * 0.25, sy);
        } else if (t === T.FOREST || t === T.GRASS) {
          if (Math.random() < (t === T.FOREST ? 0.55 : 0.35)) {
            this._placeProp('tallgrass', pos.x + (Math.random() - 0.5) * 0.6, pos.z + (Math.random() - 0.5) * 0.6, Math.random() * Math.PI, 0.8 + Math.random() * 0.3, sy);
          }
          // Occasional berry tree or flowering bush for variety
          const r = Math.random();
          if (r < 0.05) {
            this._placeProp('berry_tree', pos.x + (Math.random() - 0.5) * 0.4, pos.z + (Math.random() - 0.5) * 0.4, Math.random() * Math.PI * 2, 0.85 + Math.random() * 0.3, sy);
          } else if (r < 0.13) {
            this._placeProp('bush', pos.x + (Math.random() - 0.5) * 0.5, pos.z + (Math.random() - 0.5) * 0.5, Math.random() * Math.PI * 2, 0.8 + Math.random() * 0.35, sy);
          }
        } else if (t === T.FLOWER) {
          this._placeProp('flowers', pos.x, pos.z, Math.random() * Math.PI * 2, 1, sy);
        } else if (t === T.HEAL) {
          this._placeProp('heal_pad', pos.x, pos.z, 0, 1, sy);
        } else if (t === T.ROCK) {
          // Scatter boulders on cliff/rock walls for a rugged mountain look
          if (Math.random() < 0.14) {
            this._placeProp('rock', pos.x + (Math.random() - 0.5) * 0.5, pos.z + (Math.random() - 0.5) * 0.5, Math.random() * Math.PI * 2, 0.7 + Math.random() * 0.5, sy);
          }
        } else if (t === T.WATER) {
          // Floating lily pads on some water tiles
          if (Math.random() < 0.28) {
            this._placeProp('lily', pos.x + (Math.random() - 0.5) * 0.7, pos.z + (Math.random() - 0.5) * 0.7, Math.random() * Math.PI * 2, 0.7 + Math.random() * 0.4, sy);
          }
        }

        // Building volumes for floors
        if (t === T.FLOOR || t === T.DOOR || t === T.HEAL) {
          // Detect Pokémon Center region (x~6-7) vs mart (x~21-22) vs oak (x~10-13,16-18)
        }
      }
    }

    // Buildings — solid 4-wall houses + flush box roofs (no hollow-box interior leak / cone floaters)
    this._buildBuilding(6.5, 10.5, 3.2, 3.2, 2.2, 0xffb6c1, true); // Center pink roof
    this._buildBuilding(21.5, 10.5, 3.2, 3.2, 2.2, 0x4a90d9, false); // Mart
    this._buildBuilding(11.5, 10.5, 4.5, 3.0, 2.0, 0xc4a35a, false); // Oak lab
    this._buildBuilding(17, 10.5, 3.0, 3.0, 2.0, 0xb8956a, false); // house

    // Cave entrance prop
    const cavePos = tileToWorld(3, 3);
    this._placeProp('cave', cavePos.x, cavePos.z - 0.5, 0, 1.2, tileSurfaceY(3, 3));

    // Street lamps lining the town road (offset to tile corners so they don't
    // sit in the player's walking path). Only placed on walkable path tiles.
    const lampTiles = [[5, 12], [13, 12], [19, 12], [25, 12], [9, 9], [19, 9]];
    for (const [lx, ly] of lampTiles) {
      const row = map[ly];
      if (!row || row[lx] !== T.PATH) continue;
      const lp = tileToWorld(lx, ly);
      this._placeProp('lamp', lp.x + 0.62, lp.z + 0.62, 0, 1, tileSurfaceY(lx, ly));
    }

    // NOTE: Do NOT place heal_machine / pc as free world props — they sat inside
    // hollow building boxes and read as dark rectangles floating mid-air.

    // NPCs
    for (const npc of window.NPCS) {
      const p = tileToWorld(npc.x, npc.y);
      const sy = tileSurfaceY(npc.x, npc.y);
      let modelKey = npc.role;
      if (npc.role === 'sign') modelKey = 'sign';
      let mesh = this.cloneModel(modelKey);
      if (!mesh) {
        mesh = this._fallbackNpc(npc.role);
      }
      mesh.position.set(p.x, sy, p.z);
      mesh.userData.npc = npc;
      mesh.userData.isNpc = true;
      mesh.userData.idlePhase = Math.random() * Math.PI * 2;
      mesh.userData.baseY = sy;
      this.group.add(mesh);
      this.npcMeshes.push(mesh);
    }

    // Ambient decorations: path edge stones
    this._addBoundaryFence();

    // Landmark beacons for navigation (Center, Mart, Lab, Cave)
    this._buildLandmarkMarkers();

    // Interact rings on NPCs + key tiles
    this._buildInteractCues();
    this._buildEncounterCue();

    // Water animation markers
    this.waterMeshes = [];
    this.group.traverse((o) => {
      if (o.userData?.tile === window.TILE.WATER) this.waterMeshes.push(o);
    });

    this._buildMinimap();
  }

  _placeProp(key, x, z, rotY = 0, scale = 1, surfaceY = null) {
    let m = this.cloneModel(key);
    if (!m) {
      m = this._fallbackProp(key);
    }
    const y = surfaceY != null ? surfaceY : surfaceYAtWorld(x, z);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    m.scale.multiplyScalar(scale);
    // Environment motion: grass / flowers / trees / bushes sway in the wind
    if (key === 'tallgrass' || key === 'flowers' || key === 'tree' || key === 'berry_tree' || key === 'bush') {
      m.userData.sway = true;
      m.userData.swayPhase = Math.random() * Math.PI * 2;
      const swayAmps = { tree: 0.03, berry_tree: 0.035, bush: 0.05, tallgrass: 0.09, flowers: 0.06 };
      m.userData.swayAmp = swayAmps[key] ?? 0.06;
      m.userData.baseRotY = rotY;
      m.userData.baseScale = m.scale.x;
    }
    if (key === 'heal_pad') {
      m.userData.pulse = true;
      m.userData.swayPhase = Math.random() * Math.PI * 2;
      m.userData.baseScale = m.scale.x;
    }
    // Lily pads gently bob on the water surface
    if (key === 'lily') {
      m.userData.bob = true;
      m.userData.swayPhase = Math.random() * Math.PI * 2;
      m.userData.baseY = y;
    }
    this.group.add(m);
    this.propMeshes.push(m);
    return m;
  }

  _fallbackProp(key) {
    const g = new THREE.Group();
    if (key === 'tree') {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.8, 6), this.mat(0x6b3e1a));
      trunk.position.y = 0.4;
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 7), this.mat(0x2d7a2d));
      leaves.position.y = 1.4;
      g.add(trunk, leaves);
    } else if (key === 'tallgrass') {
      // Simple green reeds only — no dark cubes
      for (let i = 0; i < 7; i++) {
        const h = 0.45 + Math.random() * 0.35;
        const blade = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.05, h, 5),
          this.mat([0x3d9e3d, 0x4cb04a, 0x2d7a2d][i % 3])
        );
        blade.position.set((Math.random() - 0.5) * 0.55, h / 2, (Math.random() - 0.5) * 0.55);
        blade.rotation.z = (Math.random() - 0.5) * 0.25;
        blade.rotation.x = (Math.random() - 0.5) * 0.15;
        g.add(blade);
      }
    } else if (key === 'flowers') {
      // Procedural blooms only (yellow centers + colored petals) — never dark cubes
      const petalColors = [0xff69b4, 0xffd700, 0xff6347, 0xda70d6, 0xffffff];
      for (let i = 0; i < 4; i++) {
        const ox = (Math.random() - 0.5) * 0.55;
        const oz = (Math.random() - 0.5) * 0.55;
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.025, 0.22, 5),
          this.mat(0x3d9e3d)
        );
        stem.position.set(ox, 0.11, oz);
        const petal = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 8, 8),
          this.mat(petalColors[i % petalColors.length])
        );
        petal.position.set(ox, 0.24, oz);
        const center = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 6, 6),
          this.mat(0xffdd33)
        );
        center.position.set(ox, 0.28, oz);
        g.add(stem, petal, center);
      }
    } else if (key === 'sign') {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), this.mat(0x6b3e1a));
      post.position.y = 0.5;
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.08), this.mat(0xc4a35a));
      board.position.y = 1.0;
      g.add(post, board);
    } else if (key === 'heal_pad') {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 16), this.mat(0xff6666, { emissive: 0xff2222, emissiveIntensity: 0.4 }));
      pad.position.y = 0.04;
      g.add(pad);
    } else if (key === 'heal_machine') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.5), this.mat(0xeeeeee));
      body.position.y = 0.6;
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.05), this.mat(0x88ccff, { emissive: 0x4488ff, emissiveIntensity: 0.5 }));
      screen.position.set(0, 0.9, 0.28);
      g.add(body, screen);
    } else if (key === 'pc') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.5), this.mat(0xdd3333));
      body.position.y = 0.45;
      g.add(body);
    } else if (key === 'cave') {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.35, 8, 12, Math.PI), this.mat(0x4a4a5a));
      arch.rotation.x = Math.PI / 2;
      arch.position.y = 1.2;
      g.add(arch);
    } else if (key === 'rock') {
      const cols = [0x66686e, 0x565862, 0x72747a];
      for (let i = 0; i < 3; i++) {
        const r = 0.35 - i * 0.08;
        const b = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), this.mat(cols[i]));
        b.position.set((i - 1) * 0.35, r * 0.7, (Math.random() - 0.5) * 0.3);
        g.add(b);
      }
    } else if (key === 'berry_tree') {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.7, 6), this.mat(0x5c3d20));
      trunk.position.y = 0.35;
      const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), this.mat(0x2a7a2e));
      foliage.position.y = 1.1;
      g.add(trunk, foliage);
      for (let i = 0; i < 5; i++) {
        const berry = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), this.mat(0xc71a20));
        const a = Math.random() * Math.PI * 2;
        berry.position.set(Math.cos(a) * 0.5, 1.1 + (Math.random() - 0.3) * 0.4, Math.sin(a) * 0.5);
        g.add(berry);
      }
    } else if (key === 'lamp') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.18, 8), this.mat(0x1a1c22, { metalness: 0.6 }));
      base.position.y = 0.09;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.7, 8), this.mat(0x1a1c22, { metalness: 0.6 }));
      pole.position.y = 1.0;
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.28), this.mat(0xffdb72, { emissive: 0xffc050, emissiveIntensity: 1.2 }));
      glass.position.y = 2.05;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.2, 4), this.mat(0x14161c, { metalness: 0.6 }));
      cap.position.y = 2.32;
      g.add(base, pole, glass, cap);
    } else if (key === 'lily') {
      const padCols = [0x2a6b30, 0x347a3a];
      for (let i = 0; i < 4; i++) {
        const r = 0.28 + Math.random() * 0.18;
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 10), this.mat(padCols[i % 2]));
        pad.position.set((Math.random() - 0.5) * 0.9, 0.02, (Math.random() - 0.5) * 0.9);
        g.add(pad);
      }
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), this.mat(0xf58cc6));
      flower.position.set(0, 0.1, 0);
      g.add(flower);
    } else if (key === 'bush') {
      const cols = [0x256b28, 0x2f7a30];
      for (let i = 0; i < 4; i++) {
        const r = 0.3 - i * 0.03;
        const lobe = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), this.mat(cols[i % 2]));
        lobe.position.set((Math.random() - 0.5) * 0.5, 0.3 + Math.random() * 0.1, (Math.random() - 0.5) * 0.5);
        g.add(lobe);
      }
    } else {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), this.mat(0x888888)));
    }
    g.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return g;
  }

  _fallbackNpc(role) {
    const g = new THREE.Group();
    const colors = {
      oak: 0xc9a86c,
      nurse: 0xffb6c1,
      shop: 0x5b8def,
      kid: 0xffcc66,
      sign: 0xc4a35a,
    };
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.7, 4, 8),
      this.mat(colors[role] || 0xffffff)
    );
    body.position.y = 0.85;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), this.mat(0xffe0bd));
    head.position.y = 1.55;
    g.add(body, head);
    g.traverse((c) => { if (c.isMesh) c.castShadow = true; });
    return g;
  }

  _buildBuilding(tileX, tileY, wTiles, dTiles, height, roofColor, pink) {
    const p = tileToWorld(tileX, tileY);
    const baseY = tileSurfaceY(Math.floor(tileX), Math.floor(tileY));
    const w = wTiles * TILE_SIZE;
    const d = dTiles * TILE_SIZE;
    // Single solid block for the house body — never edge-on-culls into "floating slabs"
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf5f0e6,
      roughness: 0.88,
      metalness: 0.04,
      side: THREE.FrontSide,
    });
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, height, d),
      wallMat
    );
    body.position.set(p.x, baseY + height / 2, p.z);
    body.castShadow = true;
    body.receiveShadow = true;
    this.group.add(body);

    // No separate door mesh — dark free-standing door boxes were the mid-air floaters.

    // Flat box roof flush on the body
    const roofH = 0.32;
    const roofOver = 0.22;
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w + roofOver * 2, roofH, d + roofOver * 2),
      this.mat(roofColor || 0xcc4444)
    );
    roof.position.set(p.x, baseY + height + roofH / 2, p.z);
    roof.castShadow = true;
    roof.receiveShadow = true;
    this.group.add(roof);

    if (pink) {
      const ry = baseY + height + roofH + 0.08;
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.2), this.mat(0xe3350d));
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.7), this.mat(0xe3350d));
      crossH.position.set(p.x, ry, p.z);
      crossV.position.set(p.x, ry, p.z);
      this.group.add(crossH, crossV);
    }
  }

  _addBoundaryFence() {
    // Soft fog volume edges already handled by fog; skip heavy fence
  }

  _buildLandmarkMarkers() {
    const landmarks = window.LANDMARKS || [];
    for (const lm of landmarks) {
      const pos = tileToWorld(lm.tx, lm.ty);
      const sy = tileSurfaceY(lm.tx, lm.ty);
      const g = new THREE.Group();
      g.position.set(pos.x, sy, pos.z);
      g.userData.landmark = lm;

      // Glowing pillar beacon
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.1, 2.6, 6),
        this.mat(lm.color, { emissive: lm.color, emissiveIntensity: 0.55, roughness: 0.4 })
      );
      pole.position.y = 1.3;
      g.add(pole);

      // Floating ring at top
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.05, 6, 20),
        this.mat(lm.color, { emissive: lm.color, emissiveIntensity: 0.7, transparent: true, opacity: 0.85 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 2.75;
      ring.userData.pulse = true;
      ring.userData.phase = lm.tx * 0.7 + lm.ty;
      g.add(ring);

      // Ground halo for readability at distance
      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.95, 24),
        this.mat(lm.color, { emissive: lm.color, emissiveIntensity: 0.35, transparent: true, opacity: 0.45 })
      );
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.04;
      halo.userData.pulse = true;
      halo.userData.phase = lm.tx + lm.ty * 0.5;
      g.add(halo);

      this.landmarkGroup.add(g);
      this.landmarkMeshes.push(g);
    }

    // Extra cave mouth warning glow
    const cavePos = tileToWorld(3, 3);
    const caveY = tileSurfaceY(3, 3);
    const warn = new THREE.PointLight(0x9b7bff, 0.9, 8, 2);
    warn.position.set(cavePos.x, caveY + 2.2, cavePos.z - 0.5);
    warn.userData.pulse = true;
    warn.userData.phase = 0;
    this.landmarkGroup.add(warn);
    this.landmarkMeshes.push(warn);
  }

  _buildInteractCues() {
    // NPC foot rings
    for (const mesh of this.npcMeshes) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.72, 24),
        this.mat(0xffcb05, { emissive: 0xffcb05, emissiveIntensity: 0.5, transparent: true, opacity: 0.55 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(mesh.position);
      ring.position.y += 0.06;
      ring.userData.isInteractCue = true;
      ring.userData.npc = mesh.userData.npc;
      ring.userData.phase = mesh.userData.idlePhase || 0;
      ring.visible = false;
      this.cueGroup.add(ring);
      this.interactCues.push(ring);
      mesh.userData.interactCue = ring;
    }

    // Heal pad tiles — persistent soft ring
    const T = window.TILE;
    const map = window.WORLD_MAP;
    for (let y = 0; y < mapH(); y++) {
      for (let x = 0; x < mapW(); x++) {
        if (map[y][x] !== T.HEAL) continue;
        const pos = tileToWorld(x, y);
        const sy = tileSurfaceY(x, y);
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.5, 0.85, 28),
          this.mat(0xff6688, { emissive: 0xff4466, emissiveIntensity: 0.45, transparent: true, opacity: 0.5 })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(pos.x, sy + 0.08, pos.z);
        ring.userData.isHealCue = true;
        ring.userData.phase = x + y;
        ring.userData.tileX = x;
        ring.userData.tileY = y;
        this.cueGroup.add(ring);
        this.interactCues.push(ring);
      }
    }
  }

  _buildEncounterCue() {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.92, 32),
      this.mat(0x88ff66, { emissive: 0x55cc44, emissiveIntensity: 0.4, transparent: true, opacity: 0 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.userData.isEncounterCue = true;
    this.cueGroup.add(ring);
    this.encounterCue = ring;
  }

  /** Show rustle ring when player stands on wild-grass tiles. */
  setEncounterCue(tx, ty, visible) {
    if (!this.encounterCue) return;
    if (!visible) {
      this.encounterCue.material.opacity = 0;
      return;
    }
    const pos = tileToWorld(tx, ty);
    const sy = tileSurfaceY(tx, ty);
    this.encounterCue.position.set(pos.x, sy + 0.1, pos.z);
    this.encounterCue.material.opacity = 0.28;
  }

  /** Highlight interact cue for the tile the player is facing. */
  setActiveInteractCue(targetNpc) {
    for (const cue of this.interactCues) {
      if (!cue.userData?.isInteractCue) continue;
      const match = targetNpc && cue.userData.npc === targetNpc;
      cue.visible = !!match;
      if (match) {
        cue.material.opacity = 0.85;
        cue.material.emissiveIntensity = 0.85;
      }
    }
  }

  /** Find NPC or tile the player can interact with from current tile + facing. */
  findInteractTarget(tx, ty, dir, flags = {}) {
    let fx = tx;
    let fy = ty;
    if (dir === 'up') fy--;
    else if (dir === 'down') fy++;
    else if (dir === 'left') fx--;
    else if (dir === 'right') fx++;

    const npc = (window.NPCS || []).find((n) => n.x === fx && n.y === fy);
    if (npc) {
      let label = `Talk to ${npc.name}`;
      if (npc.healsParty || npc.role === 'nurse') label = 'Heal at Pokémon Center';
      else if (npc.trainer && npc.trainerId && !flags.trainersDefeated?.has(npc.trainerId)) {
        label = `Battle ${npc.name}`;
      } else if (npc.giveItems) label = 'Visit Poké Mart';
      return { type: 'npc', npc, label, tx: fx, ty: fy };
    }

    if (fx >= 0 && fy >= 0 && fx < mapW() && fy < mapH()) {
      const T = window.TILE;
      const tile = window.WORLD_MAP[fy][fx];
      if (tile === T.WATER) return { type: 'tile', label: 'Look at water', tx: fx, ty: fy };
      if (tile === T.TREE) return { type: 'tile', label: 'Inspect tree', tx: fx, ty: fy };
      if (tile === T.HEAL) return { type: 'tile', label: 'Stand on heal pad', tx: fx, ty: fy };
    }
    return null;
  }

  _buildMinimap() {
    const MW = mapW();
    const MH = mapH();
    const c = document.createElement('canvas');
    c.width = MW;
    c.height = MH;
    const ctx = c.getContext('2d');
    const colors = {
      path: '#c4a35a', grass: '#5a9e4a', tree: '#1e4d28', water: '#3a7fcf',
      sand: '#d4b896', rock: '#5a5a6e', floor: '#e8d5b0', door: '#8b5a2b',
      flower: '#6bb85a', forest: '#2d6b2d', cave: '#3a3a4a', heal: '#ff8a8a',
    };
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        const k = tileKey(window.WORLD_MAP[y][x]);
        ctx.fillStyle = colors[k] || '#888';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    this.minimapCanvas = c;
  }

  updateMinimap(playerTx, playerTy) {
    const el = document.getElementById('minimap');
    if (!el || !this.minimapCanvas) return;
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 64;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.minimapCanvas, 0, 0, 96, 64);
    const px = (playerTx / mapW()) * 96;
    const py = (playerTy / mapH()) * 64;
    ctx.fillStyle = '#ffcb05';
    ctx.fillRect(px - 2, py - 2, 4, 4);
    el.style.backgroundImage = `url(${c.toDataURL()})`;
    el.style.backgroundSize = 'cover';
  }

  faceNpcToward(npcMesh, targetX, targetZ) {
    if (!npcMesh) return;
    const dx = targetX - npcMesh.position.x;
    const dz = targetZ - npcMesh.position.z;
    npcMesh.rotation.y = Math.atan2(dx, dz);
  }

  animate(t) {
    // Gentle water bob / color
    for (const m of this.waterMeshes || []) {
      if (m.material && m.material.emissiveIntensity != null) {
        m.material.emissiveIntensity = 0.12 + Math.sin(t * 2.4 + m.position.x) * 0.08;
      }
      // Soft vertical shimmer on water slabs
      if (m.position) {
        const base = m.userData._baseY != null ? m.userData._baseY : (m.userData._baseY = m.position.y);
        m.position.y = base + Math.sin(t * 1.8 + m.position.x * 0.5) * 0.02;
      }
    }
    // Sway grass / flowers / trees in the wind
    for (const p of this.propMeshes) {
      if (p.userData?.sway) {
        const phase = p.userData.swayPhase || 0;
        const amp = p.userData.swayAmp || 0.06;
        p.rotation.z = Math.sin(t * 2.2 + phase) * amp;
        p.rotation.x = Math.cos(t * 1.7 + phase) * amp * 0.45;
        if (p.userData.baseRotY != null) {
          p.rotation.y = p.userData.baseRotY + Math.sin(t * 0.6 + phase) * amp * 0.3;
        }
      }
      if (p.userData?.pulse) {
        const phase = p.userData.swayPhase || 0;
        const base = p.userData.baseScale || 1;
        const s = base * (1 + Math.sin(t * 3 + phase) * 0.06);
        p.scale.setScalar(s);
        p.traverse((c) => {
          if (c.isMesh && c.material?.emissiveIntensity != null) {
            c.material.emissiveIntensity = 0.35 + Math.sin(t * 3 + phase) * 0.2;
          }
        });
      }
      if (p.userData?.bob) {
        const phase = p.userData.swayPhase || 0;
        const base = p.userData.baseY || 0;
        p.position.y = base + Math.sin(t * 1.6 + phase) * 0.03;
        p.rotation.z = Math.sin(t * 1.2 + phase) * 0.04;
      }
    }
    // NPC idle breathing bob
    for (const npc of this.npcMeshes) {
      if (!npc.userData?.isNpc) continue;
      const phase = npc.userData.idlePhase || 0;
      const baseY = npc.userData.baseY || 0;
      npc.position.y = baseY + Math.sin(t * 2 + phase) * 0.04;
      const breath = 1 + Math.sin(t * 2 + phase) * 0.015;
      npc.scale.set(breath, 1 + Math.sin(t * 2 + phase + 0.5) * 0.02, breath);
      if (npc.userData.interactCue) {
        npc.userData.interactCue.position.x = npc.position.x;
        npc.userData.interactCue.position.z = npc.position.z;
      }
    }

    // Landmark + heal cue pulse
    for (const lm of this.landmarkMeshes) {
      if (lm.isPointLight && lm.userData?.pulse) {
        const ph = lm.userData.phase || 0;
        lm.intensity = 0.7 + Math.sin(t * 2.2 + ph) * 0.25;
      } else {
        lm.traverse((c) => {
          if (c.userData?.pulse && c.material) {
            const ph = c.userData.phase || 0;
            const s = 1 + Math.sin(t * 2.5 + ph) * 0.08;
            c.scale.set(s, s, s);
            if (c.material.emissiveIntensity != null) {
              c.material.emissiveIntensity = 0.45 + Math.sin(t * 3 + ph) * 0.2;
            }
          }
        });
      }
    }
    for (const cue of this.interactCues) {
      if (cue.userData?.isHealCue && cue.material) {
        const ph = cue.userData.phase || 0;
        cue.material.opacity = 0.35 + Math.sin(t * 2.8 + ph) * 0.15;
        cue.rotation.z = t * 0.4;
      }
      if (cue.userData?.isInteractCue && cue.visible && cue.material) {
        const ph = cue.userData.phase || 0;
        cue.material.opacity = 0.65 + Math.sin(t * 4 + ph) * 0.2;
        cue.scale.setScalar(1 + Math.sin(t * 3.5 + ph) * 0.06);
      }
    }
    if (this.encounterCue?.material?.opacity > 0) {
      this.encounterCue.rotation.z = t * 0.6;
      this.encounterCue.material.opacity = 0.22 + Math.sin(t * 3) * 0.08;
    }
  }
}

export function createPlayerMesh(world) {
  let mesh = world.cloneModel('player');
  if (!mesh) {
    mesh = world._fallbackNpc('player');
    // recolor body blue-ish trainer
    mesh.traverse((c) => {
      if (c.isMesh && c.material?.color) c.material.color.setHex(0x3b4cca);
    });
  }
  mesh.userData.isPlayer = true;
  return mesh;
}
