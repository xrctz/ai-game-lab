# Player trainer assets

3D Trainer (Pokémon Red–inspired) built in Blender, posed for a walk cycle, and exported for the game.

## Animation

- **Walk**: 6 frames per direction (`walk_0` … `walk_5`) — full left/right biped cycle  
  (leg stride, arm swing, body bob, head counter-motion)
- **Idle**: 2 frames per direction (`idle_0`, `idle_1`) — breathing sway
- **Blender**: 24-frame walk Action keyframed on body parts in `player_trainer.blend`
- **GLB**: `player_trainer.glb` includes animation data for 3D viewers

## Files

| Pattern | Use |
|---------|-----|
| `{dir}_walk_{0-5}.png` | Overworld walk cycle |
| `{dir}_idle_{0-1}.png` | Overworld idle breath |
| `{dir}_idle.png` / `walk1` / `walk2` | Legacy aliases |
| `portrait.png` | UI still |
| `preview_walk_sheet.png` | Contact sheet of down-facing walk |
| `player_trainer.glb` | Animated 3D model |
| `../../player_trainer.blend` | Editable Blender source |

`dir` ∈ `down` | `up` | `left` | `right`

Sprites are 256×256 RGBA. The game scales them into 48px tiles in `js/game.js` (`drawPlayerSprite`).

## How the game maps frames

`walkPhase` runs **0 → 2** over one tile (two steps).  
Full biped cycle = `phase % 2`, mapped onto frames 0–5.
