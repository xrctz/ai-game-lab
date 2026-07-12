/**
 * Node unit tests against shipped 3D pure helpers (data.js + pokemon.js).
 * Run: node 3D/tests/game-logic.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = {
  console, Math, Set, Map, Array, Object, JSON, Number, String, Boolean,
  parseInt, parseFloat, isNaN, Infinity, undefined,
};
vm.createContext(sandbox);

function load(rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

load('js/data.js');
load('js/pokemon.js');

function g(name) {
  return vm.runInContext(name, sandbox);
}

const createPokemon = g('createPokemon');
const partyAlive = g('partyAlive');
const firstAlive = g('firstAlive');
const canSwitchTo = g('canSwitchTo');
const getSwitchableIndices = g('getSwitchableIndices');
const applyBattleSwitch = g('applyBattleSwitch');
const buildTrainerParty = g('buildTrainerParty');
const applyTrainerReward = g('applyTrainerReward');
const serializeGameState = g('serializeGameState');
const deserializeGameState = g('deserializeGameState');
const hasValidSaveData = g('hasValidSaveData');
const typeEffectiveness = g('typeEffectiveness');
const catchChance = g('catchChance');
const SAVE_VERSION = g('SAVE_VERSION');
const NPCS = g('NPCS');

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

console.log('\n=== 3D / Type + catch helpers ===');
{
  assert(typeEffectiveness('water', ['fire']) === 2, 'water vs fire super effective');
  assert(typeEffectiveness('electric', ['ground']) === 0, 'electric vs ground immune');
  const wild = createPokemon('rattata', 5, { wild: true });
  const full = catchChance(wild, 1);
  assert(full > 0 && full <= 0.95, 'catch chance in range');
  wild.hp = Math.max(1, Math.floor(wild.maxHp / 2));
  assert(catchChance(wild, 1) > full, 'lower HP raises catch chance');
}

console.log('\n=== Switch eligibility ===');
{
  const party = [
    createPokemon('charmander', 5),
    createPokemon('squirtle', 5),
    createPokemon('bulbasaur', 5),
  ];
  party[2].hp = 0;
  assert(canSwitchTo(party, 0, 1) === true, 'can switch to living mon');
  assert(canSwitchTo(party, 0, 0) === false, 'cannot switch to self');
  assert(canSwitchTo(party, 0, 2) === false, 'cannot switch to fainted');
  assert(getSwitchableIndices(party, 0).join(',') === '1', 'switchable indices = [1]');
  const sw = applyBattleSwitch(party, 0, 1);
  assert(sw.ok && sw.playerIdx === 1 && sw.mon.speciesId === 'squirtle', 'applyBattleSwitch ok');
}

console.log('\n=== Party alive ===');
{
  const a = createPokemon('charmander', 5);
  const b = createPokemon('squirtle', 5);
  a.hp = 0;
  assert(partyAlive([a, b]) === true, 'partyAlive with one living');
  assert(firstAlive([a, b]) === 1, 'firstAlive index 1');
  b.hp = 0;
  assert(partyAlive([a, b]) === false, 'partyAlive all fainted');
}

console.log('\n=== Joey trainer balance (fair for Lv5 starter) ===');
{
  const joey = NPCS.find((n) => n.trainerId === 'joey');
  assert(!!joey && !!joey.trainer, 'Joey trainer config exists');
  const roster = joey.trainer.roster;
  assert(Array.isArray(roster) && roster.length >= 2, 'Joey has ≥2 Pokémon');
  const STARTER_LV = 5;
  const leadLv = roster[0].level;
  assert(leadLv <= STARTER_LV + 2, `Joey lead level ${leadLv} ≤ starter+2 (${STARTER_LV + 2})`);
  assert(roster.every((e) => e.level <= STARTER_LV + 2), 'all Joey mons ≤ starter+2');
  const party = buildTrainerParty(roster);
  assert(party.length >= 2, 'buildTrainerParty length ≥ 2');
  assert(party[0].hp > 0 && party[1].hp > 0, 'trainer mons start alive');
  // Sanity: starter can deal damage concept — create starter and verify atk/stats exist
  const starter = createPokemon('squirtle', STARTER_LV);
  assert(starter.stats.atk > 0 && starter.maxHp > 0, 'Lv5 starter has usable combat stats');
  assert(starter.maxHp >= party[0].maxHp * 0.6, 'starter HP competitive with Joey lead');
}

console.log('\n=== Trainer reward ===');
{
  const bag = { pokeball: 1, potion: 0, superball: 0 };
  const next = applyTrainerReward(bag, { pokeball: 3, potion: 2, superball: 1 });
  assert(next.pokeball === 4 && next.potion === 2 && next.superball === 1, 'reward merge');
  assert(bag.pokeball === 1, 'original bag not mutated');
}

console.log('\n=== Save round-trip ===');
{
  const mon = createPokemon('charmander', 8, { nickname: 'Blaze' });
  mon.hp = Math.floor(mon.maxHp / 2);
  const state = {
    party: [mon],
    bag: { pokeball: 4, potion: 2, superball: 1 },
    player: { x: 10, y: 11, dir: 'up' },
    flags: {
      shopGift: true,
      mewtwoDefeated: false,
      caughtSpecies: new Set(['charmander', 'pidgey']),
      trainersDefeated: new Set(['joey']),
    },
    steps: 42,
    battlesWon: 3,
  };
  const ser = serializeGameState(state);
  assert(ser && ser.version === SAVE_VERSION, 'serialize version');
  const loaded = deserializeGameState(JSON.parse(JSON.stringify(ser)));
  assert(loaded.party[0].speciesId === 'charmander', 'species restored');
  assert(loaded.party[0].level === 8, 'level restored');
  assert(loaded.party[0].hp === mon.hp, 'hp restored');
  assert(loaded.bag.pokeball === 4, 'bag restored');
  assert(loaded.player.x === 10 && loaded.player.y === 11, 'position restored');
  assert(loaded.flags.trainersDefeated.has('joey'), 'trainersDefeated restored');
  assert(loaded.flags.caughtSpecies.has('pidgey'), 'caughtSpecies restored');
  assert(hasValidSaveData(ser) === true, 'hasValidSaveData true');
  assert(hasValidSaveData(null) === false, 'hasValidSaveData false for null');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
