# DEAD ZONE: EVACUATION

A 3D zombie shooter with allied AI teammates, built with Three.js.

## Quick Start

1. Open `index.html` in a modern browser (Chrome, Edge, Firefox)
2. Click **SELECT MAP** to choose your operation zone
3. Click **DEPLOY** to begin
4. Click the game window to lock your mouse
5. Survive all 15 waves to win

## Maps

| Map | Size | Difficulty | Description |
|-----|------|------------|-------------|
| **Outpost Alpha** | Medium | Normal | Military compound in the wasteland. Tight corridors, open courtyards. Classic survival. |
| **Dead City** | Large | Hard | Abandoned downtown district. Neon-lit streets, dark alleys, towering buildings. Urban nightmare. |

### Outpost Alpha
The original map — a walled military compound with scattered buildings, concrete barriers, wrecked vehicles, and street lights. 120×120 playable area.

### Dead City
A full city grid with:
- 3 horizontal + 3 vertical streets with lane markings, crosswalks, curbs, and sidewalks
- 16 city blocks filled with procedural buildings (8–36 units tall)
- Hundreds of illuminated windows (warm yellow, cool blue, white)
- 40+ street lights with real point lights
- 8 neon signs (BAR, HOTEL, GUNS, MEDS, etc.) with colored glow
- 32+ parked cars plus 4 wrecked/abandoned vehicles
- Dumpsters, fire hydrants, concrete barriers, trash cans, newspaper boxes, bus stop shelters
- Central park with trees, benches, and a lit fountain
- Dark alleys between building blocks
- Rooftop details: AC units, water towers
- Night atmosphere with moonlight, thin fog, and city glow
- 16 pickups and 28 spawn points spread across the map

## Controls

| Key | Action |
|-----|--------|
| WASD | Movement |
| Mouse | Aim |
| Left Click | Fire |
| Right Click | Aim Down Sights |
| R | Reload |
| 1/2/3 | Switch Weapon (Rifle/Shotgun/Pistol) |
| Shift | Sprint |
| Ctrl | Crouch |
| Space | Jump |
| G | Grenade |
| V | Melee Shove |
| T | Toggle Flashlight |
| Q | Squad: Follow Me |
| E | Squad: Hold / Revive |
| F | Squad: Focus Fire |
| X | Squad: Regroup |
| Tab | Squad Command Wheel |
| B | Supply Depot (between waves) |
| Esc | Pause Menu |

## Weapons

| Weapon | Damage | Fire Rate | Magazine | Role |
|--------|--------|-----------|----------|------|
| M4 Carbine | 28 | Fast | 30 | All-rounder |
| Remington 870 | 18×8 pellets | Slow | 8 | Close range devastation |
| M1911 | 35 | Medium | 12 | Precision sidearm |

## Flashlight

The flashlight is your primary tool for navigating dark maps:
- **Strong, wide beam** with long range for spotting enemies at distance
- **Soft ambient glow** around your position so the area immediately around you is never pitch black
- Toggle on/off with **T**

## Ally Team

| Name | Role | Specialty |
|------|------|-----------|
| REAPER | Assault | Aggressive combat, high accuracy |
| DOC | Medic | Revives downed teammates |
| HAVOC | Support | Suppressive fire, area control |

Each teammate is visible in the dark via:
- **Colored point light** on their body (blue/green/orange)
- **Glowing vertical beacon** column above them
- **Glowing ring** at their feet
- **Name indicator** sprite visible from distance

## Enemies

| Type | HP | Speed | Threat | Visual Cue |
|------|-----|-------|--------|------------|
| Runner | 180 | Fast | Melee pressure | Red glowing eyes |
| Crawler | 120 | Very Fast | Dodges, flanks | Yellow glowing eyes, low profile |
| Spitter | 220 | Medium | Ranged acid attack | Green glowing toxic sac |
| Tank | 900 | Slow | Heavy damage, armored | Orange body glow, massive size |
| Exploder | 160 | Medium | Explodes when near | Red pulsing boils, orange belly glow |

All zombies are visible in the dark via:
- **Bright glowing eyes** with high emissive intensity
- **Colored point lights** on their heads/bodies (red, yellow, green, orange)
- **Larger health bars** that appear when zombies start chasing
- Type-specific glow: spitter sacs, exploder boils, tank armor studs

## Supply Depot (Shop)

Between waves, press **B** to open the Supply Depot and spend currency earned from kills:

| Upgrade | Effect | Max Level |
|---------|--------|-----------|
| MEDKIT | Restore 50 HP | — |
| VITALITY | +25 Max Health | 3 |
| ARMOR | Reduce damage 10% | 3 |
| AMMO RESERVE | +40 reserve ammo | 4 |
| SHARPENED | +15% weapon damage | 3 |
| GRENADES | +2 grenades | 5 |

## Architecture

```
js/
├── main.js              Entry point
├── game-bundle.js       Pre-bundled game (loaded by browser)
├── engine/              Core systems
│   ├── Audio.js         Sound generation & playback
│   ├── Input.js         Keyboard/mouse handling
│   └── Renderer.js      Three.js setup
├── game/                Game logic
│   ├── Game.js          Main game controller
│   └── GameState.js     State & stats tracking
├── player/              Player systems
│   ├── Player.js        Movement, health & flashlight
│   ├── Weapon.js        Base weapon class
│   └── WeaponSystem.js  Weapon management
├── ai/                  Ally systems
│   ├── Ally.js          Individual ally AI & visibility
│   └── AllySquad.js     Squad coordination
├── enemies/             Zombie systems
│   ├── Zombie.js        Base zombie class & visibility
│   ├── RunnerZombie.js  Fast melee
│   ├── TankZombie.js    Heavy tank with glow
│   ├── SpitterZombie.js Ranged attacker with sac glow
│   ├── CrawlerZombie.js Flanking dodger with eye glow
│   ├── ExploderZombie.js Suicide bomber with boil glow
│   └── ZombieManager.js Spawn management
├── level/               World building
│   ├── Level.js         Outpost Alpha map
│   └── CityLevel.js     Dead City map
├── wave/                Encounter system
│   └── WaveManager.js   Wave progression
├── ui/                  Interface
│   └── UIManager.js     HUD, menus & map selection
├── effects/             Visual feedback
│   ├── Particles.js     Particle system
│   └── CameraShake.js   Screen shake
└── utils/               Helpers
    ├── MathUtils.js     Math functions
    └── ObjectPool.js    Object recycling
```

## Features

- **2 playable maps** with map selection menu
- Procedurally generated audio (no external files needed)
- 5 distinct zombie types with unique behaviors and visual cues
- 3 allied AI teammates with squad commands and visibility beacons
- 15-wave progression with scaling difficulty
- 3 weapons with distinct characteristics
- Pickup system (ammo, health, grenades)
- Supply Depot shop between waves
- Full HUD with teammate status, wave info, and kill feed
- Kill combo counter with score multiplier (up to x2 at a 10+ streak, shown under the crosshair with a decay bar)
- Wave-clear summary panel (kills, headshots, accuracy, best combo for the wave)
- Zombies you kill have a chance to drop glowing ammo/medkit pickups (despawn after 20s)
- Low-ammo / reload prompt when your magazine runs low or empty
- Floating damage numbers and hit markers
- Camera shake and particle effects
- Flashlight with ambient player glow
- Settings for volume, sensitivity, FOV, FPS counter

## Technical Notes

- Pure JavaScript ES modules, no build step required
- Three.js loaded from CDN
- All audio generated via Web Audio API
- Dynamic shadows, fog, and point lights for atmosphere
- Raycasting for hit detection
- State machine AI for allies and enemies
- Scene cleanup and rebuilding for map switching
- Object pooling for particle system

## Browser Requirements

- Chrome 90+, Edge 90+, Firefox 90+, Safari 15+
- WebGL 2.0 support
- Pointer Lock API support
