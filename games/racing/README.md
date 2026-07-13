# VEIL RUSH

**Race the light before dawn.**

An original 3D crystalline racing game. Pilot the **Dawnshard** photon skimmer across the floating **Glass Meridian** — a twilight circuit of prism gates, spectrum orbs, and aurora-lit crystal desert.

## How to play

Open the game with a local web server (ES modules require HTTP):

```bash
# From this folder
python3 -m http.server 8080
```

Then visit **http://localhost:8080**

### Controls

Auto-cruise is on — you always move forward.

| Key | Action |
|-----|--------|
| `W` / `↑` | Push harder |
| `S` / `↓` | Brake |
| `A` `D` / arrows | Steer |
| `Space` | Spectrum Boost (needs charge) |
| `Shift` | Drift (builds Spectrum) |
| `P` / `Esc` | Pause |
| `M` | Mute / unmute sound |

### Goal

Complete **3 laps** before the rival Veilrunners. Collect **Spectrum Orbs**, fly through **Prism Gates**, drift to charge your meter, then boost to overtake.

## Unique features

- Original setting: twin-moon crystal desert & floating meridian track
- Custom AI art & cinematics (title, vehicle, victory, racing tunnel)
- Spectrum Drive boost built by drifting and pickups
- Prism Gates, living energy wakes, minimap standings
- Three AI rivals: Nyx Arc, Sol Vire, Ember Quill
- Live lap timer with per-lap splits and an all-time best lap saved between sessions
- Slipstream: tuck in behind a rival to build a draft speed bonus (watch for the cyan vignette)
- Overtake feedback — `P2 ▲` flashes when you gain or lose a position
- Results screen lap-time table with best-lap highlight
- Synth audio (engine hum, boost, chimes, countdown) via WebAudio — no files, mutable with `M` or the HUD button

## Project layout

```
index.html
css/style.css
js/main.js      # game loop, UI, camera, race flow
js/track.js     # Glass Meridian track & world
js/skimmer.js   # Dawnshard + rivals physics
js/audio.js     # WebAudio synth (engine, cues, mute)
assets/images/  # generated key art
assets/videos/  # generated cinematics
```

## Credits

Built as an original experience — not based on any existing racing franchise. Visuals generated for this project; gameplay and world design are unique to VEIL RUSH.
