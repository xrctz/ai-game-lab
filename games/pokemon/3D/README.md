# Pokémon Adventure — 3D Edition

Full **Three.js** overworld built from the same map/NPC/battle rules as the 2D game, using **Blender-exported GLB** models.

Return to the [version launcher](../) or play the [2D edition](../2D/).

## How to run

From repo root:

```bash
npm start
```

Open **http://localhost:3000/3D/**

## Controls

| Control | Action |
|--------|--------|
| **WASD** / **Arrows** | Move (grid tiles) |
| **Mouse drag** | Orbit camera |
| **Mouse wheel** | Zoom |
| **Q / R** | Rotate camera |
| **E** / **Space** | Interact |
| **M / B / P** | Party / Bag / Save |

## Features

- 3D terrain from the hand-crafted town + routes map
- GLB props: trees, tall grass, flowers, heal pad/machine, PC, cave, sign
- GLB characters: player trainer, Nurse Joy, Oak, shop clerk, Joey
- Orbit third-person camera with shadows and fog
- Day/night cycle (~2.5 min per day): sky, fog and sun transition through sunrise, noon, sunset and night; street lamps glow brighter after dark
- Ambient wild Pokémon hop around the grass and forest routes (cosmetic)
- Footstep dust puffs as you walk
- 3D battle arena with Pokémon sprite billboards, attack lunges, camera shake on hits and floating damage/heal numbers (gold for crits, green for heals)
- Smoothly animated battle HP bars
- Mid-battle switch, trainer multi-mon fights, catch, save/load
- Minimap overlay

## Models

Source blends live under `../2D/assets/blender/` and `../2D/assets/player_trainer.blend`.  
Exports: `assets/models/*.glb`.

If a model fails to load, procedural placeholders are used automatically.
