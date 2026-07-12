/**
 * Pokemon Adventure — Game Data
 * Species, moves, type chart, map, NPCs
 */

const TYPES = {
  normal: 'normal', fire: 'fire', water: 'water', grass: 'grass',
  electric: 'electric', ice: 'ice', fighting: 'fighting', poison: 'poison',
  ground: 'ground', flying: 'flying', psychic: 'psychic', bug: 'bug',
  rock: 'rock', ghost: 'ghost', dragon: 'dragon',
};

// Type effectiveness chart (attacker -> defender -> multiplier)
const TYPE_CHART = {
  normal:   { rock: 0.5, ghost: 0 },
  fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5 },
  water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5 },
  electric: { water: 2, grass: 0.5, electric: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5 },
  ground:   { fire: 2, grass: 0.5, electric: 2, poison: 2, flying: 0, bug: 0.5, rock: 2 },
  flying:   { grass: 2, electric: 0.5, fighting: 2, bug: 2, rock: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5 },
  bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 2, flying: 0.5, psychic: 2, ghost: 0.5 },
  rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2 },
  ghost:    { normal: 0, psychic: 2, ghost: 2 },
  dragon:   { dragon: 2 },
};

const MOVES = {
  tackle:     { name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, cat: 'physical' },
  scratch:    { name: 'Scratch', type: 'normal', power: 40, accuracy: 100, pp: 35, cat: 'physical' },
  growl:      { name: 'Growl', type: 'normal', power: 0, accuracy: 100, pp: 40, cat: 'status', effect: 'atk_down' },
  ember:      { name: 'Ember', type: 'fire', power: 40, accuracy: 100, pp: 25, cat: 'special' },
  flamethrower: { name: 'Flamethrower', type: 'fire', power: 90, accuracy: 100, pp: 15, cat: 'special' },
  watergun:   { name: 'Water Gun', type: 'water', power: 40, accuracy: 100, pp: 25, cat: 'special' },
  bubble:     { name: 'Bubble', type: 'water', power: 40, accuracy: 100, pp: 30, cat: 'special' },
  hydropump:  { name: 'Hydro Pump', type: 'water', power: 110, accuracy: 80, pp: 5, cat: 'special' },
  vinewhip:   { name: 'Vine Whip', type: 'grass', power: 45, accuracy: 100, pp: 25, cat: 'physical' },
  razorleaf:  { name: 'Razor Leaf', type: 'grass', power: 55, accuracy: 95, pp: 25, cat: 'physical' },
  solarbeam:  { name: 'Solar Beam', type: 'grass', power: 120, accuracy: 100, pp: 10, cat: 'special' },
  thundershock: { name: 'Thunder Shock', type: 'electric', power: 40, accuracy: 100, pp: 30, cat: 'special' },
  thunderbolt: { name: 'Thunderbolt', type: 'electric', power: 90, accuracy: 100, pp: 15, cat: 'special' },
  quickattack: { name: 'Quick Attack', type: 'normal', power: 40, accuracy: 100, pp: 30, cat: 'physical', priority: 1 },
  bite:       { name: 'Bite', type: 'normal', power: 60, accuracy: 100, pp: 25, cat: 'physical' },
  confusion:  { name: 'Confusion', type: 'psychic', power: 50, accuracy: 100, pp: 25, cat: 'special' },
  psybeam:    { name: 'Psybeam', type: 'psychic', power: 65, accuracy: 100, pp: 20, cat: 'special' },
  poisonsting: { name: 'Poison Sting', type: 'poison', power: 15, accuracy: 100, pp: 35, cat: 'physical' },
  stringshot: { name: 'String Shot', type: 'bug', power: 0, accuracy: 95, pp: 40, cat: 'status', effect: 'spd_down' },
  gust:       { name: 'Gust', type: 'flying', power: 40, accuracy: 100, pp: 35, cat: 'special' },
  wingattack: { name: 'Wing Attack', type: 'flying', power: 60, accuracy: 100, pp: 35, cat: 'physical' },
  rockthrow:  { name: 'Rock Throw', type: 'rock', power: 50, accuracy: 90, pp: 15, cat: 'physical' },
  mudslap:    { name: 'Mud-Slap', type: 'ground', power: 20, accuracy: 100, pp: 10, cat: 'special' },
  earthquake: { name: 'Earthquake', type: 'ground', power: 100, accuracy: 100, pp: 10, cat: 'physical' },
  icebeam:    { name: 'Ice Beam', type: 'ice', power: 90, accuracy: 100, pp: 10, cat: 'special' },
  slash:      { name: 'Slash', type: 'normal', power: 70, accuracy: 100, pp: 20, cat: 'physical' },
  bodySlam:   { name: 'Body Slam', type: 'normal', power: 85, accuracy: 100, pp: 15, cat: 'physical' },
  rest:       { name: 'Rest', type: 'psychic', power: 0, accuracy: 100, pp: 10, cat: 'status', effect: 'heal_full' },
  tailwhip:   { name: 'Tail Whip', type: 'normal', power: 0, accuracy: 100, pp: 30, cat: 'status', effect: 'def_down' },
  leechseed:  { name: 'Leech Seed', type: 'grass', power: 0, accuracy: 90, pp: 10, cat: 'status', effect: 'leech' },
  thunderwave: { name: 'Thunder Wave', type: 'electric', power: 0, accuracy: 90, pp: 20, cat: 'status', effect: 'paralyze' },
};

const SPECIES = {
  charmander: {
    id: 'charmander', name: 'Charmander', types: ['fire'],
    base: { hp: 39, atk: 52, def: 43, spa: 60, spd: 50, spe: 65 },
    sprite: 'assets/sprites/front/charmander.png',
    spriteBack: 'assets/sprites/back/charmander.png',
    spriteAni: 'assets/sprites/ani/charmander.gif',
    spriteAniBack: 'assets/sprites/ani-back/charmander.gif',
    spriteArt: 'assets/sprites/artwork/charmander.png',
    color: '#f08030',
    moves: ['scratch', 'growl', 'ember', 'slash'],
    catchRate: 45, expYield: 62,
    desc: 'The flame on its tail shows the strength of its life force.',
  },
  squirtle: {
    id: 'squirtle', name: 'Squirtle', types: ['water'],
    base: { hp: 44, atk: 48, def: 65, spa: 50, spd: 64, spe: 43 },
    sprite: 'assets/sprites/front/squirtle.png',
    spriteBack: 'assets/sprites/back/squirtle.png',
    spriteAni: 'assets/sprites/ani/squirtle.gif',
    spriteAniBack: 'assets/sprites/ani-back/squirtle.gif',
    spriteArt: 'assets/sprites/artwork/squirtle.png',
    color: '#6890f0',
    moves: ['tackle', 'tailwhip', 'bubble', 'watergun'],
    catchRate: 45, expYield: 63,
    desc: 'It shelters itself in its shell, then strikes back with spouts of water.',
  },
  bulbasaur: {
    id: 'bulbasaur', name: 'Bulbasaur', types: ['grass', 'poison'],
    base: { hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45 },
    sprite: 'assets/sprites/front/bulbasaur.png',
    spriteBack: 'assets/sprites/back/bulbasaur.png',
    spriteAni: 'assets/sprites/ani/bulbasaur.gif',
    spriteAniBack: 'assets/sprites/ani-back/bulbasaur.gif',
    spriteArt: 'assets/sprites/artwork/bulbasaur.png',
    color: '#78c850',
    moves: ['tackle', 'growl', 'vinewhip', 'leechseed'],
    catchRate: 45, expYield: 64,
    desc: 'A strange seed was planted on its back at birth. The plant sprouts and grows with this Pokémon.',
  },
  pikachu: {
    id: 'pikachu', name: 'Pikachu', types: ['electric'],
    base: { hp: 35, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 },
    sprite: 'assets/sprites/front/pikachu.png',
    spriteBack: 'assets/sprites/back/pikachu.png',
    spriteAni: 'assets/sprites/ani/pikachu.gif',
    spriteAniBack: 'assets/sprites/ani-back/pikachu.gif',
    spriteArt: 'assets/sprites/artwork/pikachu.png',
    color: '#f8d030',
    moves: ['quickattack', 'thundershock', 'thunderwave', 'thunderbolt'],
    catchRate: 190, expYield: 112,
    desc: 'When several of these Pokémon gather, their electricity can cause lightning storms.',
  },
  pidgey: {
    id: 'pidgey', name: 'Pidgey', types: ['normal', 'flying'],
    base: { hp: 40, atk: 45, def: 40, spa: 35, spd: 35, spe: 56 },
    sprite: 'assets/sprites/front/pidgey.png',
    spriteBack: 'assets/sprites/back/pidgey.png',
    spriteAni: 'assets/sprites/ani/pidgey.gif',
    spriteAniBack: 'assets/sprites/ani-back/pidgey.gif',
    spriteArt: 'assets/sprites/artwork/pidgey.png',
    color: '#a890f0',
    moves: ['tackle', 'gust', 'quickattack', 'wingattack'],
    catchRate: 255, expYield: 50,
    desc: 'A common sight in forests and woods. It flaps its wings at ground level to kick up blinding sand.',
  },
  rattata: {
    id: 'rattata', name: 'Rattata', types: ['normal'],
    base: { hp: 30, atk: 56, def: 35, spa: 25, spd: 35, spe: 72 },
    sprite: 'assets/sprites/front/rattata.png',
    spriteBack: 'assets/sprites/back/rattata.png',
    spriteAni: 'assets/sprites/ani/rattata.gif',
    spriteAniBack: 'assets/sprites/ani-back/rattata.gif',
    spriteArt: 'assets/sprites/artwork/rattata.png',
    color: '#a8a878',
    moves: ['tackle', 'tailwhip', 'quickattack', 'bite'],
    catchRate: 255, expYield: 51,
    desc: 'Bites anything when it attacks. Small and very quick, it is a common sight in many places.',
  },
  caterpie: {
    id: 'caterpie', name: 'Caterpie', types: ['bug'],
    base: { hp: 45, atk: 30, def: 35, spa: 20, spd: 20, spe: 45 },
    sprite: 'assets/sprites/front/caterpie.png',
    spriteBack: 'assets/sprites/back/caterpie.png',
    spriteAni: 'assets/sprites/ani/caterpie.gif',
    spriteAniBack: 'assets/sprites/ani-back/caterpie.gif',
    spriteArt: 'assets/sprites/artwork/caterpie.png',
    color: '#a8b820',
    moves: ['tackle', 'stringshot', 'poisonsting'],
    catchRate: 255, expYield: 39,
    desc: 'Its short feet are tipped with suction pads that enable it to tirelessly climb slopes and walls.',
  },
  weedle: {
    id: 'weedle', name: 'Weedle', types: ['bug', 'poison'],
    base: { hp: 40, atk: 35, def: 30, spa: 20, spd: 20, spe: 50 },
    sprite: 'assets/sprites/front/weedle.png',
    spriteBack: 'assets/sprites/back/weedle.png',
    spriteAni: 'assets/sprites/ani/weedle.gif',
    spriteAniBack: 'assets/sprites/ani-back/weedle.gif',
    spriteArt: 'assets/sprites/artwork/weedle.png',
    color: '#a8b820',
    moves: ['poisonsting', 'stringshot', 'tackle'],
    catchRate: 255, expYield: 39,
    desc: 'Often found in forests, eating leaves. It has a sharp venomous stinger on its head.',
  },
  ekans: {
    id: 'ekans', name: 'Ekans', types: ['poison'],
    base: { hp: 35, atk: 60, def: 44, spa: 40, spd: 54, spe: 55 },
    sprite: 'assets/sprites/front/ekans.png',
    spriteBack: 'assets/sprites/back/ekans.png',
    spriteAni: 'assets/sprites/ani/ekans.gif',
    spriteAniBack: 'assets/sprites/ani-back/ekans.gif',
    spriteArt: 'assets/sprites/artwork/ekans.png',
    color: '#a040a0',
    moves: ['wrap', 'poisonsting', 'bite', '//'],
    catchRate: 255, expYield: 58,
    desc: 'Moves silently and stealthily. Eats the eggs of birds, such as Pidgey and Spearow, whole.',
  },
  sandshrew: {
    id: 'sandshrew', name: 'Sandshrew', types: ['ground'],
    base: { hp: 50, atk: 75, def: 85, spa: 20, spd: 30, spe: 40 },
    sprite: 'assets/sprites/front/sandshrew.png',
    spriteBack: 'assets/sprites/back/sandshrew.png',
    spriteAni: 'assets/sprites/ani/sandshrew.gif',
    spriteAniBack: 'assets/sprites/ani-back/sandshrew.gif',
    spriteArt: 'assets/sprites/artwork/sandshrew.png',
    color: '#e0c068',
    moves: ['scratch', 'mudslap', 'slash', 'earthquake'],
    catchRate: 255, expYield: 60,
    desc: 'Burrows deep underground in arid locations far from water. It only emerges to hunt for food.',
  },
  geodude: {
    id: 'geodude', name: 'Geodude', types: ['rock', 'ground'],
    base: { hp: 40, atk: 80, def: 100, spa: 30, spd: 30, spe: 20 },
    sprite: 'assets/sprites/front/geodude.png',
    spriteBack: 'assets/sprites/back/geodude.png',
    spriteAni: 'assets/sprites/ani/geodude.gif',
    spriteAniBack: 'assets/sprites/ani-back/geodude.gif',
    spriteArt: 'assets/sprites/artwork/geodude.png',
    color: '#b8a038',
    moves: ['tackle', 'rockthrow', 'mudslap', 'earthquake'],
    catchRate: 255, expYield: 60,
    desc: 'Found in fields and mountains. Mistaking them for boulders, people often step or trip on them.',
  },
  abra: {
    id: 'abra', name: 'Abra', types: ['psychic'],
    base: { hp: 25, atk: 20, def: 15, spa: 105, spd: 55, spe: 90 },
    sprite: 'assets/sprites/front/abra.png',
    spriteBack: 'assets/sprites/back/abra.png',
    spriteAni: 'assets/sprites/ani/abra.gif',
    spriteAniBack: 'assets/sprites/ani-back/abra.gif',
    spriteArt: 'assets/sprites/artwork/abra.png',
    color: '#f85888',
    moves: ['confusion', 'psybeam', 'rest'],
    catchRate: 200, expYield: 62,
    desc: 'Using its ability to read minds, it will identify impending danger and teleport to safety.',
  },
  magikarp: {
    id: 'magikarp', name: 'Magikarp', types: ['water'],
    base: { hp: 20, atk: 10, def: 55, spa: 15, spd: 20, spe: 80 },
    sprite: 'assets/sprites/front/magikarp.png',
    spriteBack: 'assets/sprites/back/magikarp.png',
    spriteAni: 'assets/sprites/ani/magikarp.gif',
    spriteAniBack: 'assets/sprites/ani-back/magikarp.gif',
    spriteArt: 'assets/sprites/artwork/magikarp.png',
    color: '#6890f0',
    moves: ['tackle', 'splash'],
    catchRate: 255, expYield: 40,
    desc: 'In the distant past, it was somewhat stronger than the horribly weak descendants that exist today.',
  },
  eevee: {
    id: 'eevee', name: 'Eevee', types: ['normal'],
    base: { hp: 55, atk: 55, def: 50, spa: 45, spd: 65, spe: 55 },
    sprite: 'assets/sprites/front/eevee.png',
    spriteBack: 'assets/sprites/back/eevee.png',
    spriteAni: 'assets/sprites/ani/eevee.gif',
    spriteAniBack: 'assets/sprites/ani-back/eevee.gif',
    spriteArt: 'assets/sprites/artwork/eevee.png',
    color: '#a8a878',
    moves: ['tackle', 'tailwhip', 'quickattack', 'bite'],
    catchRate: 45, expYield: 65,
    desc: 'Its genetic code is irregular. It may mutate if it is exposed to radiation from element stones.',
  },
  growlithe: {
    id: 'growlithe', name: 'Growlithe', types: ['fire'],
    base: { hp: 55, atk: 70, def: 45, spa: 70, spd: 50, spe: 60 },
    sprite: 'assets/sprites/front/growlithe.png',
    spriteBack: 'assets/sprites/back/growlithe.png',
    spriteAni: 'assets/sprites/ani/growlithe.gif',
    spriteAniBack: 'assets/sprites/ani-back/growlithe.gif',
    spriteArt: 'assets/sprites/artwork/growlithe.png',
    color: '#f08030',
    moves: ['bite', 'ember', 'flamethrower', 'takeDown'],
    catchRate: 190, expYield: 70,
    desc: 'Very protective of its territory. It will bark and bite to repel intruders from its space.',
  },
  mewtwo: {
    id: 'mewtwo', name: 'Mewtwo', types: ['psychic'],
    base: { hp: 106, atk: 110, def: 90, spa: 154, spd: 90, spe: 130 },
    sprite: 'assets/sprites/front/mewtwo.png',
    spriteBack: 'assets/sprites/back/mewtwo.png',
    spriteAni: 'assets/sprites/ani/mewtwo.gif',
    spriteAniBack: 'assets/sprites/ani-back/mewtwo.gif',
    spriteArt: 'assets/sprites/artwork/mewtwo.png',
    color: '#f85888',
    moves: ['confusion', 'psybeam', 'psychic', 'swift'],
    catchRate: 3, expYield: 306,
    desc: 'It was created by a scientist after years of horrific gene splicing and DNA engineering experiments.',
    legendary: true,
  },
};

// Fix incomplete move references
SPECIES.ekans.moves = ['tackle', 'poisonsting', 'bite', 'bodySlam'];
SPECIES.growlithe.moves = ['bite', 'ember', 'flamethrower', 'bodySlam'];
SPECIES.mewtwo.moves = ['confusion', 'psybeam', 'slash', 'rest'];
SPECIES.magikarp.moves = ['tackle', 'splash'];

// Add missing splash move
MOVES.splash = { name: 'Splash', type: 'normal', power: 0, accuracy: 100, pp: 40, cat: 'status', effect: 'none' };
MOVES.wrap = { name: 'Wrap', type: 'normal', power: 15, accuracy: 90, pp: 20, cat: 'physical' };

// Wild encounter tables by map zone
const ENCOUNTERS = {
  route1: [
    { species: 'pidgey', weight: 40, minLv: 2, maxLv: 5 },
    { species: 'rattata', weight: 40, minLv: 2, maxLv: 4 },
    { species: 'caterpie', weight: 15, minLv: 2, maxLv: 4 },
    { species: 'weedle', weight: 5, minLv: 2, maxLv: 4 },
  ],
  forest: [
    { species: 'caterpie', weight: 25, minLv: 3, maxLv: 6 },
    { species: 'weedle', weight: 25, minLv: 3, maxLv: 6 },
    { species: 'pidgey', weight: 20, minLv: 4, maxLv: 7 },
    { species: 'pikachu', weight: 10, minLv: 5, maxLv: 8 },
    { species: 'ekans', weight: 15, minLv: 4, maxLv: 7 },
    { species: 'eevee', weight: 5, minLv: 6, maxLv: 8 },
  ],
  cave: [
    { species: 'geodude', weight: 35, minLv: 6, maxLv: 10 },
    { species: 'sandshrew', weight: 25, minLv: 6, maxLv: 10 },
    { species: 'zubat', weight: 20, minLv: 5, maxLv: 9 },
    { species: 'abra', weight: 12, minLv: 8, maxLv: 12 },
    { species: 'mewtwo', weight: 8, minLv: 18, maxLv: 22 },
  ],
  water: [
    { species: 'magikarp', weight: 60, minLv: 5, maxLv: 12 },
    { species: 'squirtle', weight: 10, minLv: 8, maxLv: 12 },
    { species: 'eevee', weight: 5, minLv: 10, maxLv: 12 },
  ],
  route2: [
    { species: 'pidgey', weight: 30, minLv: 5, maxLv: 8 },
    { species: 'rattata', weight: 20, minLv: 5, maxLv: 8 },
    { species: 'growlithe', weight: 20, minLv: 6, maxLv: 9 },
    { species: 'sandshrew', weight: 15, minLv: 6, maxLv: 9 },
    { species: 'abra', weight: 10, minLv: 7, maxLv: 10 },
    { species: 'eevee', weight: 5, minLv: 7, maxLv: 9 },
  ],
};

// Add zubat
SPECIES.zubat = {
  id: 'zubat', name: 'Zubat', types: ['poison', 'flying'],
  base: { hp: 40, atk: 45, def: 35, spa: 30, spd: 40, spe: 55 },
  sprite: 'assets/sprites/front/zubat.png',
    spriteBack: 'assets/sprites/back/zubat.png',
    spriteAni: 'assets/sprites/ani/zubat.gif',
    spriteAniBack: 'assets/sprites/ani-back/zubat.gif',
    spriteArt: 'assets/sprites/artwork/zubat.png',
    color: '#a040a0',
  moves: ['absorb', 'bite', 'wingattack', 'confuse'],
  catchRate: 255, expYield: 49,
  desc: 'Forms colonies in perpetually dark places. Uses ultrasonic waves to identify and approach targets.',
};
MOVES.absorb = { name: 'Absorb', type: 'grass', power: 20, accuracy: 100, pp: 25, cat: 'special', effect: 'drain' };
SPECIES.zubat.moves = ['bite', 'wingattack', 'gust', 'poisonsting'];

// Tile types for the map
// 0 = grass path (walkable, no encounter)
// 1 = tall grass (walkable, encounters)
// 2 = tree / wall (blocked)
// 3 = water (blocked unless surfing — blocked for now)
// 4 = sand / cave floor (walkable)
// 5 = rock wall (blocked)
// 6 = building floor (walkable)
// 7 = door / warp
// 8 = flowers (walkable, rare encounter)
// 9 = tall grass forest (higher encounter)
// 10 = cave floor dark
// 11 = heal pad

const TILE = {
  PATH: 0, GRASS: 1, TREE: 2, WATER: 3, SAND: 4, ROCK: 5,
  FLOOR: 6, DOOR: 7, FLOWER: 8, FOREST: 9, CAVE: 10, HEAL: 11,
};

// 30x20 overworld map
const MAP_W = 30;
const MAP_H = 20;

// Hand-crafted beginner town + routes
const WORLD_MAP = [
  // y=0  cave entrance area (north)
  [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
  [5,10,10,10,10,10,5,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  [5,10,10,10,10,10,5,2,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,2,2],
  [5,10,10,7,10,10,5,2,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,2,2],
  [5,5,5,4,5,5,5,2,9,9,1,1,1,1,1,1,1,1,1,1,1,1,9,9,9,9,9,9,2,2],
  // y=5  route north
  [2,2,2,4,2,2,2,2,9,9,1,1,1,1,1,1,1,1,1,1,1,1,9,9,2,2,2,2,2,2],
  [2,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,2],
  [2,1,1,0,1,1,1,1,1,1,0,1,1,8,8,8,1,1,0,1,1,1,1,1,1,0,1,1,1,2],
  [2,1,1,0,1,2,2,2,2,1,0,1,1,8,8,8,1,1,0,1,2,2,2,2,1,0,1,1,1,2],
  // y=9  town
  [2,0,0,0,0,2,6,6,2,0,0,0,0,0,0,0,0,0,0,0,2,6,6,2,0,0,0,0,0,2],
  [2,0,1,1,0,2,6,11,2,0,6,6,6,6,0,0,6,6,6,0,2,6,6,2,0,1,1,0,1,2],
  [2,0,1,1,0,2,7,6,2,0,6,7,6,6,0,0,6,7,6,0,2,7,6,2,0,1,1,0,1,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,1,1,0,1,1,0,1,1,1,0,3,3,3,3,3,3,3,0,1,1,1,0,1,1,0,1,1,1,2],
  // y=14  southern route
  [2,1,1,0,1,1,0,1,1,1,0,3,3,3,3,3,3,3,0,1,1,1,0,1,1,0,1,1,1,2],
  [2,1,1,0,0,0,0,0,0,0,0,3,3,3,3,3,3,3,0,0,0,0,0,0,0,0,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
];

// Zone lookup for encounters based on position
function getZone(x, y) {
  const t = WORLD_MAP[y] && WORLD_MAP[y][x];
  if (t === TILE.FOREST || (t === TILE.GRASS && y <= 5)) return 'forest';
  if (t === TILE.CAVE || t === TILE.SAND || (y <= 4 && x <= 6)) return 'cave';
  if (t === TILE.WATER) return 'water';
  // Deep south is tougher; keep town outskirts as starter route
  if (y >= 17) return 'route2';
  return 'route1';
}

// NPCs / interactables
const NPCS = [
  {
    x: 4, y: 12, role: 'oak', name: 'Professor Oak',
    dialogue: [
      'Welcome to Pallet Town, trainer!',
      'Tall grass hides wild Pokémon. Be careful!',
      'Talk to Nurse Joy at the Pokémon Center (pink roof) to heal your party!',
      'Your goal: catch 6 different species and defeat Mewtwo in the cave!',
    ],
  },
  {
    // Inside pink-roof Center, next to heal pad (7,10)
    x: 7, y: 11, role: 'nurse', name: 'Nurse Joy', healsParty: true,
    dialogue: [
      'Welcome to the Pokémon Center!',
      "I'll take your Pokémon for a few seconds.",
    ],
  },
  {
    x: 21, y: 11, role: 'shop', name: 'Shop Clerk',
    dialogue: [
      'Welcome to the Poké Mart!',
      'You received 5 Poké Balls, 3 Potions, and a Super Ball!',
      '(Visit anytime — free starter kit once.)',
    ],
    giveItems: true,
  },
  {
    x: 12, y: 6, role: 'kid', name: 'Youngster Joey',
    trainerId: 'joey',
    dialogue: [
      'My Rattata is in the top percentage of Rattata!',
      'You look tough... let\'s battle!',
    ],
    dialogueAfterWin: [
      'Whoa! Your team is strong!',
      'Here — take these supplies. You earned them!',
      'Try the forest up north — rare Pokémon hide there!',
    ],
    dialogueRematch: [
      'My Rattata is still the best around!',
      'Come back when you want a rematch... someday.',
      'The cave up north has a scary legend about Mewtwo!',
    ],
    // Multi-Pokémon trainer battle (not dialogue-only)
    trainer: {
      roster: [
        { species: 'rattata', level: 6 },
        { species: 'pidgey', level: 7 },
      ],
      reward: { pokeball: 3, potion: 2, superball: 1 },
    },
  },
  {
    x: 3, y: 3, role: 'sign', name: 'Cave Sign',
    dialogue: [
      'DANGER — Deep Cave',
      'A powerful presence lurks within...',
      'Only strong trainers should proceed.',
    ],
  },
];

const TILE_COLORS = {
  [TILE.PATH]:   '#c4a35a',
  [TILE.GRASS]:  '#5a9e4a',
  [TILE.TREE]:   '#1e4d28',
  [TILE.WATER]:  '#3a7fcf',
  [TILE.SAND]:   '#d4b896',
  [TILE.ROCK]:   '#5a5a6e',
  [TILE.FLOOR]:  '#e8d5b0',
  [TILE.DOOR]:   '#8b5a2b',
  [TILE.FLOWER]: '#6bb85a',
  [TILE.FOREST]: '#2d6b2d',
  [TILE.CAVE]:   '#3a3a4a',
  [TILE.HEAL]:   '#ff8a8a',
};

const TILE_DECOR = {
  [TILE.TREE]: '🌲',
  [TILE.WATER]: null,
  [TILE.FLOWER]: '🌸',
  [TILE.ROCK]: null,
  [TILE.HEAL]: '❤',
  [TILE.DOOR]: null,
  [TILE.FOREST]: '🌿',
};

function isWalkable(tile) {
  return [
    TILE.PATH, TILE.GRASS, TILE.SAND, TILE.FLOOR,
    TILE.DOOR, TILE.FLOWER, TILE.FOREST, TILE.CAVE, TILE.HEAL,
  ].includes(tile);
}

function isEncounterTile(tile) {
  return tile === TILE.GRASS || tile === TILE.FOREST || tile === TILE.CAVE || tile === TILE.FLOWER;
}
