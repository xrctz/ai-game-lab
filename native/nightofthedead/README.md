# Night of the Dead — Native 3D Zombie Game

**Native Ubuntu C# FPS** (OpenGL via Raylib). Not a browser game.

```
3D Zombie Game/
└── native/NightOfTheDead/     ← C# / .NET 10 + Raylib-cs
    ├── Program.cs
    ├── GameApp.cs             ← full game
    └── NightOfTheDead.csproj
```

## Requirements

- Ubuntu (X11/Wayland + GPU drivers)
- [.NET SDK 10+](https://dotnet.microsoft.com/download) (`dotnet --version`)

## Run

```bash
# From this folder:
./run.sh

# Or:
cd native/NightOfTheDead
dotnet run -c Release
```

## Build / ship

```bash
cd native/NightOfTheDead
dotnet build -c Release

# Framework-dependent binary:
./bin/Release/net10.0/NightOfTheDead

# Self-contained single-folder publish (no global .NET needed on target):
dotnet publish -c Release -r linux-x64 --self-contained true -o ../../dist
../../dist/NightOfTheDead
```

## Controls

| Input | Action |
|-------|--------|
| Enter / Click / Space | Start / restart |
| WASD | Move |
| Shift | Sprint |
| Mouse | Look (cursor locked in-game) |
| LMB | Shoot |
| R | Reload |
| Space | Jump |
| Esc | Free / recapture mouse (in-game) or back to menu (game over) |
| Esc / Q | Quit (menu) |

## Stack (polyglot visuals)

| Piece | Language / tech | Role |
|-------|-----------------|------|
| Gameplay / loop | **C#** (.NET 10) | Core FPS, window, window, rendering |
| Zombie AI + auto-aim score | **Rust** `native/rust_sim` → `libnotd_sim.so` | Fast FFI hot loop (P/Invoke) |
| GPU runtime | **Raylib** → OpenGL 3.3 | Native desktop render |
| Post FX | **GLSL** `assets/shaders/post.*` | Optional grade / grain |
| Textures | **Python** `tools/generate_textures.py` | Procedural PNG bake |
| Config | **JSON** `assets/visuals.json` | Visual knobs without recompile |

### Rust piece (what it does)

Rust is great for **safe, fast native code**. Here it owns:

- `notd_update_zombies` — chase, separation, attack cooldowns  
- `notd_pick_target` — wide-cone auto-aim scoring  
- `notd_apply_hit` — damage helper  

C# loads `libnotd_sim.so` and falls back to pure C# AI if the library is missing.

```bash
# Build Rust sim alone
cd native/rust_sim && cargo build --release
cp target/release/libnotd_sim.so ../NightOfTheDead/
```

```
C# scene  →  RenderTexture  →  GLSL post  →  screen
                ↑
         Python PNGs (ground, brick, skin, …)
```

Rebuild textures anytime:

```bash
cd native/NightOfTheDead
python3 tools/generate_textures.py
dotnet build -c Release
```

Verified on NVIDIA (e.g. RTX 5070 Ti) with OpenGL 3.3.

## Gameplay

- Night arena with ruins, lamps, moon
- Endless zombie waves (scale HP/speed)
- Hitscan gun, headshot bonus
- HP, ammo, reload, sprint, jump
- Menu → fight → YOU DIED → rise again

## Extending

All gameplay lives in `native/NightOfTheDead/GameApp.cs`. Split into files under `Game/` as you ship more systems (weapons, maps, multiplayer, assets).

Add NuGet packages as needed (`dotnet add package ...`). Models/textures: load with Raylib `LoadModel` / `LoadTexture` and drop files in `assets/`.
