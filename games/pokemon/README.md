# Pokémon Adventure

Browser-based Pokémon-style mini RPG with **two full editions**:

| Edition | Path | Tech |
|---------|------|------|
| **2D** | [`2D/`](2D/) | Canvas overworld, pixel sprites, retro UI |
| **3D** | [`3D/`](3D/) | Three.js world, Blender GLB models, 3D battles |

Open the root page to choose a version.

## How to run

```bash
npm start
```

Then open **http://localhost:3000**

- Launcher: `/`
- 2D game: `/2D/`
- 3D game: `/3D/`

## How to play (both)

| Control | Action |
|--------|--------|
| **WASD** / **Arrows** | Move |
| **E** / **Space** | Interact / dialogue |
| **M** | Party |
| **B** | Bag |
| **P** | Save |

**3D only:** drag mouse on the world to orbit the camera · mouse wheel zoom · **Q/R** rotate

### Goal

1. Choose a starter (Charmander, Squirtle, or Bulbasaur)
2. Catch **6 different species**
3. Heal at the **Pokémon Center**
4. Battle **Youngster Joey** (multi-Pokémon trainer)
5. Defeat **Mewtwo** in the northern cave

## Project structure

```
├── index.html          # Version launcher
├── package.json
├── 2D/                 # Full original 2D game
│   ├── index.html
│   ├── css/ js/ assets/ tests/
│   └── README.md
└── 3D/                 # Full 3D edition
    ├── index.html
    ├── css/style3d.css
    ├── js/
    │   ├── data.js      # Shared species / map / NPCs
    │   ├── pokemon.js   # Stats, damage, catch, save helpers
    │   ├── world3d.js   # Map → Three.js meshes + GLBs
    │   ├── battle3d.js  # 3D battle arena
    │   └── game3d.js    # Main 3D engine
    └── assets/
        ├── models/      # Blender-exported GLBs
        ├── sprites/     # Pokémon billboards + UI
        └── ui/
```

## Tests

```bash
npm test
```

Runs the 2D pure-logic suite (switch, trainer rewards, save round-trip, type chart).

## Art notes

3D models in `3D/assets/models/*.glb` are generated procedurally with Blender.
Procedural fallbacks spawn if a GLB fails to load.

Regenerate/extend the models with the headless Blender generator (models are
committed, so this is only needed when changing the art):

```bash
# needs Blender (e.g. `sudo apt-get install -y blender`)
blender --background --python ../../scripts/blender/gen_pokemon_assets.py            # all assets
blender --background --python ../../scripts/blender/gen_pokemon_assets.py -- tree     # one asset
RENDER=1 blender --background --python ../../scripts/blender/gen_pokemon_assets.py -- lamp   # + preview PNG
```

The in-game loader (`3D/js/world3d.js`) auto-normalizes every model (strips
studio junk, re-scales to a per-model target height, sits soles on y=0), so new
models only need to be built centered on X/Y with the base at Z=0. New props
(`fountain`, `cattail`, `pokeball`) are placed on non-walkable tiles so they
never block movement.

Fan project for educational/entertainment purposes. Pokémon is a trademark of Nintendo/Creatures/Game Freak.
