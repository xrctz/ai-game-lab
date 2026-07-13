# Pokémon Adventure — 2D Edition

Classic browser-based canvas overworld RPG (original version).

Return to the [version launcher](../) or try the [3D edition](../3D/).

## How to run

From repo root:

```bash
npm start
```

Open **http://localhost:3000/2D/**

Or from this folder:

```bash
npx --yes serve -l 3000
```

## How to play

| Control | Action |
|--------|--------|
| **WASD** / **Arrow keys** | Move |
| **E** / **Space** | Interact / advance dialogue |
| **M** | Open party |
| **B** | Open bag |
| **X** | Open Pokédex |
| **P** | Save game |
| **Title → Continue** | Load last save |

### Goal

1. Choose a starter (Charmander, Squirtle, or Bulbasaur)
2. Explore tall grass and catch **6 different species**
3. Heal at the **Pokémon Center** (pink roof) — talk to **Nurse Joy**
4. Challenge **Youngster Joey** north of town (real multi-Pokémon battle)
5. Find and defeat **Mewtwo** in the northern cave

### Features

- **Pokédex** (press **X**, or via the party menu): tracks every species you've
  seen (silhouette) and caught (full color + ball icon) across all 17 species
- **Shiny Pokémon**: ~1 in 48 wild encounters is shiny — golden sparkles, a
  recolored sprite, and a ★ by its name. Shininess is kept when caught and saved
- **Poison status**: Poison Sting has a 30% chance to poison (PSN tag in
  battle, 1/8 max HP chip damage per turn). Poison-types are immune
- **Day/night cycle**: the overworld cycles day → dusk → night → dawn as you
  walk, with a moonlight glow around you at night

### Tips

- In battle: **SWITCH** to change active Pokémon (costs a turn)
- Type matchups matter (Water beats Fire, etc.)
- If your whole party faints, you respawn healed at the Center
- Status conditions heal at the Pokémon Center or with Rest

## Tests

```bash
npm test
```

Fan project for educational/entertainment purposes. Pokémon is a trademark of Nintendo/Creatures/Game Freak.
