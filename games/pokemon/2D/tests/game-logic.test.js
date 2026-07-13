/**
 * Node-runnable unit tests against shipped pure helpers.
 * Loads js/data.js + js/pokemon.js (no DOM required).
 *
 * Run: node tests/game-logic.test.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = {
  console,
  Math,
  Set,
  Map,
  Array,
  Object,
  JSON,
  Number,
  String,
  Boolean,
  parseInt,
  parseFloat,
  isNaN,
  Infinity,
  undefined,
};

vm.createContext(sandbox);

function load(rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

load('js/data.js');
load('js/pokemon.js');

// vm `const`/`let` bindings are not always mirrored as sandbox properties;
// call into the context for data lookups, and pull functions that are global.
function g(name) {
  return vm.runInContext(name, sandbox);
}

const typeEffectiveness = g('typeEffectiveness');
const catchChance = g('catchChance');
const createPokemon = g('createPokemon');
const partyAlive = g('partyAlive');
const firstAlive = g('firstAlive');
const canSwitchTo = g('canSwitchTo');
const getSwitchableIndices = g('getSwitchableIndices');
const applyBattleSwitch = g('applyBattleSwitch');
const buildTrainerParty = g('buildTrainerParty');
const nextTrainerMonIndex = g('nextTrainerMonIndex');
const applyTrainerReward = g('applyTrainerReward');
const formatRewardText = g('formatRewardText');
const serializeGameState = g('serializeGameState');
const deserializeGameState = g('deserializeGameState');
const hasValidSaveData = g('hasValidSaveData');
const SAVE_VERSION = g('SAVE_VERSION');
const NPCS = g('NPCS');
const rollShiny = g('rollShiny');
const SHINY_CHANCE = g('SHINY_CHANCE');
const applySecondaryEffect = g('applySecondaryEffect');
const statusResidualDamage = g('statusResidualDamage');
const getDayNight = g('getDayNight');
const DAY_CYCLE_STEPS = g('DAY_CYCLE_STEPS');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

function assertClose(a, b, msg, eps = 1e-9) {
  assert(Math.abs(a - b) < eps, `${msg} (got ${a}, expected ~${b})`);
}

console.log('\n=== Type effectiveness (shipped TYPE_CHART) ===');
{
  const waterVsFire = typeEffectiveness('water', ['fire']);
  assert(waterVsFire === 2, 'water vs fire is super effective (2x)');
  const fireVsWater = typeEffectiveness('fire', ['water']);
  assert(fireVsWater === 0.5, 'fire vs water is not very effective (0.5x)');
  const normalVsGhost = typeEffectiveness('normal', ['ghost']);
  assert(normalVsGhost === 0, 'normal vs ghost is immune (0x)');
  const grassVsWaterRock = typeEffectiveness('grass', ['water', 'rock']);
  assert(grassVsWaterRock === 4, 'grass vs water/rock is 4x');
  assert(typeEffectiveness('electric', ['ground']) === 0, 'electric vs ground is immune (0x)');
  assert(typeEffectiveness('fire', ['grass']) === 2, 'fire vs grass is super effective');
}

console.log('\n=== Catch chance (shipped formula) ===');
{
  const wild = createPokemon('rattata', 5, { wild: true });
  wild.hp = wild.maxHp;
  const full = catchChance(wild, 1);
  // a = ((3M-2M)*rate)/3M = rate/3; chance = clamp(rate/3/255)
  const expectedFull = Math.max(0.01, Math.min(0.95, wild.catchRate / 3 / 255));
  assertClose(full, expectedFull, 'full HP catch chance matches formula');

  wild.hp = Math.max(1, Math.floor(wild.maxHp / 2));
  const mid = catchChance(wild, 1);
  assert(mid > full, 'mid HP increases catch chance vs full');

  const superBall = catchChance(wild, 1.6);
  assert(superBall > mid, 'ball bonus increases catch chance at mid HP');
  assert(superBall <= 0.95, 'catch chance never exceeds 0.95');

  wild.hp = 1;
  const low = catchChance(wild, 1);
  assert(low >= mid, '1 HP catch chance is at least mid HP chance');
}

console.log('\n=== Party alive / firstAlive ===');
{
  const a = createPokemon('charmander', 5);
  const b = createPokemon('squirtle', 5);
  const c = createPokemon('bulbasaur', 5);
  a.hp = 0;
  b.hp = 10;
  c.hp = 0;
  const party = [a, b, c];
  assert(partyAlive(party) === true, 'partyAlive true when one living');
  assert(firstAlive(party) === 1, 'firstAlive returns index of first living mon');
  b.hp = 0;
  assert(partyAlive(party) === false, 'partyAlive false when all fainted');
  assert(firstAlive(party) === -1 || firstAlive(party) < 0, 'firstAlive < 0 when none living');
}

console.log('\n=== Switch eligibility ===');
{
  const p0 = createPokemon('charmander', 5);
  const p1 = createPokemon('squirtle', 5);
  const p2 = createPokemon('bulbasaur', 5);
  p2.hp = 0;
  const party = [p0, p1, p2];

  assert(canSwitchTo(party, 0, 1) === true, 'can switch to living non-active mon');
  assert(canSwitchTo(party, 0, 0) === false, 'cannot switch to active mon');
  assert(canSwitchTo(party, 0, 2) === false, 'cannot switch to fainted mon');
  assert(canSwitchTo(party, 0, 99) === false, 'cannot switch out of bounds');

  const idxs = getSwitchableIndices(party, 0);
  assert(idxs.length === 1 && idxs[0] === 1, 'getSwitchableIndices returns only living others');

  const sw = applyBattleSwitch(party, 0, 1);
  assert(sw.ok === true && sw.playerIdx === 1, 'applyBattleSwitch succeeds');
  assert(sw.mon === party[1], 'applyBattleSwitch returns target mon');
  // Stages cleared on switch-in
  party[1].stages.atk = 3;
  applyBattleSwitch(party, 0, 1);
  assert(party[1].stages.atk === 0, 'applyBattleSwitch clears stages');

  const bad = applyBattleSwitch(party, 0, 2);
  assert(bad.ok === false, 'applyBattleSwitch rejects fainted target');
}

console.log('\n=== Trainer party / reward helpers ===');
{
  const roster = [
    { species: 'rattata', level: 6 },
    { species: 'pidgey', level: 7 },
  ];
  const tp = buildTrainerParty(roster);
  assert(tp.length === 2, 'buildTrainerParty builds 2 mons');
  assert(tp[0].speciesId === 'rattata' && tp[0].level === 6, 'first mon is rattata lv6');
  assert(tp[1].speciesId === 'pidgey' && tp[1].level === 7, 'second mon is pidgey lv7');
  assert(tp.every((m) => m.hp > 0), 'trainer mons start alive');

  tp[0].hp = 0;
  assert(nextTrainerMonIndex(tp, 0) === 1, 'nextTrainerMonIndex finds second mon after first faints');
  tp[1].hp = 0;
  assert(nextTrainerMonIndex(tp, 0) === -1, 'nextTrainerMonIndex -1 when all fainted');

  const bag = { pokeball: 1, potion: 0, superball: 0 };
  const reward = { pokeball: 3, potion: 2, superball: 1 };
  const next = applyTrainerReward(bag, reward);
  assert(next.pokeball === 4, 'reward adds pokeballs');
  assert(next.potion === 2, 'reward adds potions');
  assert(next.superball === 1, 'reward adds superballs');
  assert(bag.pokeball === 1, 'applyTrainerReward does not mutate original bag');
  const text = formatRewardText(reward);
  assert(text.includes('Poké Ball') && text.includes('Potion'), 'formatRewardText describes items');
}

console.log('\n=== Save serialize / deserialize round-trip ===');
{
  const mon = createPokemon('charmander', 8, { nickname: 'Ember' });
  mon.hp = Math.floor(mon.maxHp / 2);
  mon.exp = 12;
  mon.moves[0].pp = Math.max(0, mon.moves[0].pp - 2);

  const state = {
    party: [mon, createPokemon('pikachu', 6)],
    bag: { pokeball: 7, potion: 4, superball: 2 },
    player: { x: 14, y: 11, dir: 'left' },
    flags: {
      shopGift: true,
      mewtwoDefeated: true,
      caughtSpecies: new Set(['charmander', 'pikachu', 'rattata']),
      trainersDefeated: new Set(['joey']),
    },
    steps: 123,
    battlesWon: 9,
  };

  const serialized = serializeGameState(state);
  assert(serialized != null, 'serializeGameState returns object');
  assert(serialized.version === SAVE_VERSION, 'save has version');
  assert(Array.isArray(serialized.flags.caughtSpecies), 'caughtSpecies serialized as array');
  assert(serialized.flags.mewtwoDefeated === true, 'mewtwo flag saved');
  assert(serialized.flags.trainersDefeated.includes('joey'), 'trainer win flag saved');

  const json = JSON.parse(JSON.stringify(serialized));
  const loaded = deserializeGameState(json);
  assert(loaded != null, 'deserializeGameState accepts round-trip JSON');
  assert(loaded.party.length === 2, 'party length restored');
  assert(loaded.party[0].speciesId === 'charmander', 'lead species restored');
  assert(loaded.party[0].name === 'Ember', 'nickname restored');
  assert(loaded.party[0].level === 8, 'level restored');
  assert(loaded.party[0].hp === mon.hp, 'hp restored');
  assert(loaded.bag.pokeball === 7 && loaded.bag.potion === 4 && loaded.bag.superball === 2, 'bag restored');
  assert(loaded.player.x === 14 && loaded.player.y === 11 && loaded.player.dir === 'left', 'position restored');
  assert(loaded.flags.mewtwoDefeated === true, 'mewtwo flag restored');
  assert(loaded.flags.shopGift === true, 'shop flag restored');
  assert(loaded.flags.caughtSpecies instanceof Set, 'caughtSpecies is Set');
  assert(loaded.flags.caughtSpecies.has('rattata'), 'caught species set restored');
  assert(loaded.flags.trainersDefeated.has('joey'), 'trainersDefeated restored');
  assert(loaded.steps === 123 && loaded.battlesWon === 9, 'counters restored');
  assert(hasValidSaveData(json) === true, 'hasValidSaveData true for valid save');
  assert(hasValidSaveData(null) === false, 'hasValidSaveData false for null');
  assert(hasValidSaveData({ version: 999 }) === false, 'hasValidSaveData false for bad version');
}

console.log('\n=== Shiny Pokémon ===');
{
  assert(SHINY_CHANCE > 0 && SHINY_CHANCE < 0.1, 'SHINY_CHANCE is a small positive rate');
  assert(rollShiny(0) === true, 'rollShiny true when rand below threshold');
  assert(rollShiny(0.99) === false, 'rollShiny false when rand above threshold');

  const plain = createPokemon('pidgey', 5);
  assert(plain.shiny === false, 'default mon is not shiny');
  const shiny = createPokemon('pidgey', 5, { shiny: true });
  assert(shiny.shiny === true, 'opts.shiny creates shiny mon');
}

console.log('\n=== Poison status (secondary effect + residual) ===');
{
  const weedle = createPokemon('weedle', 5);
  const sting = weedle.moves.find((m) => m.id === 'poisonsting');
  assert(!!sting && sting.effect === 'poison', 'Poison Sting carries poison effect');
  assert(sting.effectChance === 30, 'Poison Sting has 30% effect chance');

  const target = createPokemon('rattata', 5);
  const logs = [];
  const hit = applySecondaryEffect(sting, target, (m) => logs.push(m), 0);
  assert(hit === true && target.status === 'poison', 'secondary poison applies with low roll');
  assert(logs.length === 1 && logs[0].includes('poisoned'), 'poison logs a message');

  const target2 = createPokemon('rattata', 5);
  const miss = applySecondaryEffect(sting, target2, () => {}, 0.99);
  assert(miss === false && target2.status === null, 'secondary poison misses with high roll');

  const poisonType = createPokemon('ekans', 5);
  const immune = applySecondaryEffect(sting, poisonType, () => {}, 0);
  assert(immune === false && poisonType.status === null, 'poison types cannot be poisoned');

  const paralyzed = createPokemon('rattata', 5);
  paralyzed.status = 'paralyze';
  const blocked = applySecondaryEffect(sting, paralyzed, () => {}, 0);
  assert(blocked === false && paralyzed.status === 'paralyze', 'existing status is not overwritten');

  assert(statusResidualDamage(target) === Math.max(1, Math.floor(target.maxHp / 8)),
    'poison residual is 1/8 max HP');
  assert(statusResidualDamage(target2) === 0, 'no residual without status');
  target.hp = 0;
  assert(statusResidualDamage(target) === 0, 'no residual on fainted mon');
}

console.log('\n=== Day / night cycle ===');
{
  const day = getDayNight(0);
  assert(day.phase === 'day', 'cycle starts in daytime');
  assert(day.tint.a === 0, 'no tint during day');

  const night = getDayNight(Math.floor(DAY_CYCLE_STEPS * 0.75));
  assert(night.phase === 'night', 'mid-cycle back half is night');
  assert(night.tint.a > 0.2, 'night tint is visible');

  const wrapped = getDayNight(DAY_CYCLE_STEPS);
  assert(wrapped.phase === 'day', 'cycle wraps back to day');

  const dusk = getDayNight(Math.floor(DAY_CYCLE_STEPS * 0.58));
  assert(dusk.phase === 'dusk', 'dusk phase between day and night');
  assert(dusk.tint.a > 0, 'dusk has a tint');
}

console.log('\n=== Pokédex save fields (seen/shiny, backward compatible) ===');
{
  const shinyMon = createPokemon('pikachu', 7, { shiny: true });
  const state = {
    party: [shinyMon],
    bag: { pokeball: 1, potion: 1, superball: 0 },
    player: { x: 5, y: 6, dir: 'up' },
    flags: {
      shopGift: false,
      mewtwoDefeated: false,
      caughtSpecies: new Set(['pikachu']),
      trainersDefeated: new Set(),
      seenSpecies: new Set(['pikachu', 'pidgey', 'rattata']),
    },
    steps: 10,
    battlesWon: 1,
  };
  const serialized = serializeGameState(state);
  assert(Array.isArray(serialized.flags.seenSpecies), 'seenSpecies serialized as array');
  assert(serialized.party[0].shiny === true, 'shiny flag serialized');

  const loaded = deserializeGameState(JSON.parse(JSON.stringify(serialized)));
  assert(loaded.flags.seenSpecies instanceof Set, 'seenSpecies restored as Set');
  assert(loaded.flags.seenSpecies.has('pidgey'), 'seen-only species restored');
  assert(loaded.party[0].shiny === true, 'shiny flag restored');

  // Old save without seenSpecies / shiny — must still load with defaults
  const oldSave = JSON.parse(JSON.stringify(serialized));
  delete oldSave.flags.seenSpecies;
  delete oldSave.party[0].shiny;
  const oldLoaded = deserializeGameState(oldSave);
  assert(oldLoaded != null, 'old save without new fields still loads');
  assert(oldLoaded.party[0].shiny === false, 'shiny defaults to false for old saves');
  assert(oldLoaded.flags.seenSpecies instanceof Set, 'seenSpecies defaults to Set for old saves');
  assert(oldLoaded.flags.seenSpecies.has('pikachu'), 'old saves treat caught species as seen');
}

console.log('\n=== Joey trainer data shape (structure) ===');
{
  const joey = NPCS.find((n) => n.trainerId === 'joey');
  assert(!!joey, 'Youngster Joey NPC exists');
  assert(!!joey.trainer, 'Joey has trainer config');
  assert(Array.isArray(joey.trainer.roster) && joey.trainer.roster.length >= 2, 'Joey has ≥2 Pokémon roster');
  assert(!!joey.trainer.reward, 'Joey has win reward');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
