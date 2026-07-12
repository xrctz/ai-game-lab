/**
 * Pokemon instance helpers — stats, leveling, creation
 */

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function calcStat(base, level, isHP = false) {
  if (isHP) {
    return Math.floor(((2 * base) * level) / 100) + level + 10;
  }
  return Math.floor(((2 * base) * level) / 100) + 5;
}

function createPokemon(speciesId, level, opts = {}) {
  const sp = SPECIES[speciesId];
  if (!sp) {
    console.warn('Unknown species:', speciesId);
    return createPokemon('rattata', level, opts);
  }

  const moves = (opts.moves || sp.moves)
    .filter((m) => MOVES[m])
    .slice(0, 4)
    .map((m) => ({
      id: m,
      name: MOVES[m].name,
      type: MOVES[m].type,
      power: MOVES[m].power,
      accuracy: MOVES[m].accuracy,
      pp: MOVES[m].pp,
      maxPp: MOVES[m].pp,
      cat: MOVES[m].cat,
      effect: MOVES[m].effect || null,
      priority: MOVES[m].priority || 0,
    }));

  const maxHp = calcStat(sp.base.hp, level, true);
  const mon = {
    speciesId,
    name: opts.nickname || sp.name,
    types: [...sp.types],
    level,
    sprite: sp.sprite,
    spriteBack: sp.spriteBack || sp.sprite,
    spriteAni: sp.spriteAni || sp.sprite,
    spriteAniBack: sp.spriteAniBack || sp.spriteBack || sp.sprite,
    spriteArt: sp.spriteArt || sp.sprite,
    color: sp.color,
    exp: 0,
    expToNext: expForLevel(level + 1),
    maxHp,
    hp: opts.hp != null ? opts.hp : maxHp,
    stats: {
      atk: calcStat(sp.base.atk, level),
      def: calcStat(sp.base.def, level),
      spa: calcStat(sp.base.spa, level),
      spd: calcStat(sp.base.spd, level),
      spe: calcStat(sp.base.spe, level),
    },
    // battle stages (-6 to +6)
    stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    moves,
    status: null, // 'paralyze' | 'poison' | null
    catchRate: sp.catchRate,
    expYield: sp.expYield,
    wild: !!opts.wild,
  };
  return mon;
}

function expForLevel(level) {
  // Medium-fast: level^3
  return level * level * level;
}

function stageMultiplier(stage) {
  const s = clamp(stage, -6, 6);
  if (s >= 0) return (2 + s) / 2;
  return 2 / (2 - s);
}

function getEffectiveStat(mon, stat) {
  if (stat === 'hp') return mon.hp;
  const base = mon.stats[stat];
  const stage = mon.stages[stat] || 0;
  let mult = stageMultiplier(stage);
  if (mon.status === 'paralyze' && stat === 'spe') mult *= 0.5;
  return Math.max(1, Math.floor(base * mult));
}

function typeEffectiveness(moveType, defenderTypes) {
  let mult = 1;
  const chart = TYPE_CHART[moveType] || {};
  for (const t of defenderTypes) {
    if (chart[t] != null) mult *= chart[t];
  }
  return mult;
}

function calcDamage(attacker, defender, move) {
  if (move.power <= 0) return { damage: 0, effectiveness: 1, critical: false, missed: false };

  // Accuracy check
  if (Math.random() * 100 > move.accuracy) {
    return { damage: 0, effectiveness: 1, critical: false, missed: true };
  }

  const level = attacker.level;
  const isPhysical = move.cat === 'physical';
  const atkStat = getEffectiveStat(attacker, isPhysical ? 'atk' : 'spa');
  const defStat = getEffectiveStat(defender, isPhysical ? 'def' : 'spd');

  let damage = Math.floor(
    ((2 * level) / 5 + 2) * move.power * (atkStat / Math.max(1, defStat)) / 50 + 2
  );

  // STAB
  if (attacker.types.includes(move.type)) {
    damage = Math.floor(damage * 1.5);
  }

  // Type effectiveness
  const effectiveness = typeEffectiveness(move.type, defender.types);
  damage = Math.floor(damage * effectiveness);

  // Critical (6.25%)
  const critical = Math.random() < 1 / 16;
  if (critical) damage = Math.floor(damage * 1.5);

  // Random factor 85–100%
  damage = Math.floor(damage * (randInt(85, 100) / 100));

  // Minimum 1 if it should hit and not immune
  if (effectiveness > 0 && damage < 1) damage = 1;

  return { damage, effectiveness, critical, missed: false };
}

function applyStatusEffect(move, user, target, log) {
  if (!move.effect || move.effect === 'none') {
    if (move.power === 0 && move.name === 'Splash') {
      log(`${user.name} is just splashing around...`);
    }
    return;
  }

  switch (move.effect) {
    case 'atk_down':
      target.stages.atk = clamp(target.stages.atk - 1, -6, 6);
      log(`${target.name}'s Attack fell!`);
      break;
    case 'def_down':
      target.stages.def = clamp(target.stages.def - 1, -6, 6);
      log(`${target.name}'s Defense fell!`);
      break;
    case 'spd_down':
      target.stages.spe = clamp(target.stages.spe - 1, -6, 6);
      log(`${target.name}'s Speed fell!`);
      break;
    case 'heal_full':
      user.hp = user.maxHp;
      user.status = null;
      log(`${user.name} restored its HP!`);
      break;
    case 'leech':
      log(`${target.name} was seeded!`);
      target._leech = true;
      break;
    case 'paralyze':
      if (target.status == null) {
        target.status = 'paralyze';
        log(`${target.name} is paralyzed! It may be unable to move!`);
      }
      break;
    case 'drain': {
      // handled via damage
      break;
    }
    default:
      break;
  }
}

function gainExp(mon, amount) {
  if (mon.level >= 100) return { leveled: false, levels: 0 };
  mon.exp += amount;
  let levels = 0;
  while (mon.exp >= mon.expToNext && mon.level < 100) {
    mon.exp -= mon.expToNext;
    mon.level += 1;
    levels += 1;
    // Recalc stats, keep HP ratio
    const ratio = mon.hp / mon.maxHp;
    const sp = SPECIES[mon.speciesId];
    mon.maxHp = calcStat(sp.base.hp, mon.level, true);
    mon.hp = Math.max(1, Math.floor(mon.maxHp * ratio));
    mon.stats = {
      atk: calcStat(sp.base.atk, mon.level),
      def: calcStat(sp.base.def, mon.level),
      spa: calcStat(sp.base.spa, mon.level),
      spd: calcStat(sp.base.spd, mon.level),
      spe: calcStat(sp.base.spe, mon.level),
    };
    mon.expToNext = expForLevel(mon.level + 1);
  }
  return { leveled: levels > 0, levels };
}

function healParty(party) {
  for (const mon of party) {
    mon.hp = mon.maxHp;
    mon.status = null;
    mon.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    mon._leech = false;
    for (const m of mon.moves) {
      m.pp = m.maxPp;
    }
  }
}

function partyAlive(party) {
  return party.some((m) => m.hp > 0);
}

function firstAlive(party) {
  return party.findIndex((m) => m.hp > 0);
}

function pickWildEncounter(zone) {
  const table = ENCOUNTERS[zone] || ENCOUNTERS.route1;
  const total = table.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const e of table) {
    roll -= e.weight;
    if (roll <= 0) {
      const lv = randInt(e.minLv, e.maxLv);
      return createPokemon(e.species, lv, { wild: true });
    }
  }
  const e = table[0];
  return createPokemon(e.species, e.minLv, { wild: true });
}

function catchChance(wild, ballBonus = 1) {
  // Simplified Gen-ish formula
  const maxHp = wild.maxHp;
  const hp = wild.hp;
  const rate = wild.catchRate;
  const a = ((3 * maxHp - 2 * hp) * rate * ballBonus) / (3 * maxHp);
  const chance = clamp(a / 255, 0.01, 0.95);
  // Bonus if low HP
  return chance;
}

function tryCatch(wild, ballBonus = 1) {
  const chance = catchChance(wild, ballBonus);
  return Math.random() < chance;
}

// ---------- Mid-battle switch helpers (pure) ----------

/**
 * Whether the player may intentionally switch to party[targetIdx]
 * during battle. Must be a different, living mon.
 */
function canSwitchTo(party, currentIdx, targetIdx) {
  if (!Array.isArray(party)) return false;
  if (targetIdx === currentIdx) return false;
  if (targetIdx < 0 || targetIdx >= party.length) return false;
  if (currentIdx < 0 || currentIdx >= party.length) return false;
  const mon = party[targetIdx];
  return !!(mon && mon.hp > 0);
}

/** Indices of living party members other than the active one. */
function getSwitchableIndices(party, currentIdx) {
  const out = [];
  if (!Array.isArray(party)) return out;
  for (let i = 0; i < party.length; i++) {
    if (canSwitchTo(party, currentIdx, i)) out.push(i);
  }
  return out;
}

/**
 * Apply a voluntary switch: clear stages on the incoming mon.
 * Returns { ok, playerIdx, mon } without mutating party order.
 */
function applyBattleSwitch(party, currentIdx, targetIdx) {
  if (!canSwitchTo(party, currentIdx, targetIdx)) {
    return { ok: false, playerIdx: currentIdx, mon: null };
  }
  const mon = party[targetIdx];
  mon.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  mon._leech = false;
  return { ok: true, playerIdx: targetIdx, mon };
}

// ---------- Trainer battle helpers (pure) ----------

/**
 * Build a trainer's party from a roster definition.
 * roster: [{ species, level }, ...]
 */
function buildTrainerParty(roster) {
  if (!Array.isArray(roster) || roster.length === 0) return [];
  return roster.map((entry) =>
    createPokemon(entry.species, entry.level || 5, { wild: false })
  );
}

/** Next living trainer mon index after the current one faints; -1 if none. */
function nextTrainerMonIndex(party, preferAfter = -1) {
  if (!Array.isArray(party)) return -1;
  for (let i = preferAfter + 1; i < party.length; i++) {
    if (party[i] && party[i].hp > 0) return i;
  }
  for (let i = 0; i <= preferAfter && i < party.length; i++) {
    if (party[i] && party[i].hp > 0) return i;
  }
  return -1;
}

/**
 * Merge a reward object into a bag copy.
 * reward: { pokeball?, potion?, superball? }
 */
function applyTrainerReward(bag, reward) {
  const next = {
    pokeball: bag?.pokeball || 0,
    potion: bag?.potion || 0,
    superball: bag?.superball || 0,
  };
  if (!reward) return next;
  for (const key of ['pokeball', 'potion', 'superball']) {
    if (typeof reward[key] === 'number' && reward[key] > 0) {
      next[key] += reward[key];
    }
  }
  return next;
}

function formatRewardText(reward) {
  if (!reward) return 'Nothing';
  const parts = [];
  if (reward.pokeball) parts.push(`${reward.pokeball} Poké Ball${reward.pokeball > 1 ? 's' : ''}`);
  if (reward.potion) parts.push(`${reward.potion} Potion${reward.potion > 1 ? 's' : ''}`);
  if (reward.superball) parts.push(`${reward.superball} Super Ball${reward.superball > 1 ? 's' : ''}`);
  return parts.length ? parts.join(', ') : 'Nothing';
}

// ---------- Save / load helpers (pure) ----------

const SAVE_VERSION = 1;
const SAVE_STORAGE_KEY = 'pokemon-adventure-save-v1';

function serializePokemon(mon) {
  return {
    speciesId: mon.speciesId,
    name: mon.name,
    level: mon.level,
    exp: mon.exp || 0,
    expToNext: mon.expToNext,
    hp: mon.hp,
    maxHp: mon.maxHp,
    status: mon.status || null,
    moves: (mon.moves || []).map((m) => ({
      id: m.id,
      pp: m.pp,
      maxPp: m.maxPp,
    })),
  };
}

function deserializePokemon(data) {
  if (!data || !data.speciesId) return null;
  const mon = createPokemon(data.speciesId, data.level || 5, {
    nickname: data.name,
    hp: data.hp,
  });
  if (data.exp != null) mon.exp = data.exp;
  if (data.expToNext != null) mon.expToNext = data.expToNext;
  mon.hp = clamp(data.hp != null ? data.hp : mon.maxHp, 0, mon.maxHp);
  mon.status = data.status || null;
  if (Array.isArray(data.moves)) {
    for (const saved of data.moves) {
      const move = mon.moves.find((m) => m.id === saved.id);
      if (move && saved.pp != null) {
        move.pp = clamp(saved.pp, 0, move.maxPp);
      }
    }
  }
  return mon;
}

/**
 * Serialize a snapshot of game progress for localStorage.
 * state: { party, bag, player:{x,y,dir}, flags, steps, battlesWon }
 */
function serializeGameState(state) {
  if (!state || !Array.isArray(state.party)) return null;
  const caught = state.flags?.caughtSpecies;
  const trainers = state.flags?.trainersDefeated;
  return {
    version: SAVE_VERSION,
    party: state.party.map(serializePokemon),
    bag: {
      pokeball: state.bag?.pokeball || 0,
      potion: state.bag?.potion || 0,
      superball: state.bag?.superball || 0,
    },
    player: {
      x: state.player?.x ?? 12,
      y: state.player?.y ?? 12,
      dir: state.player?.dir || 'down',
    },
    flags: {
      shopGift: !!state.flags?.shopGift,
      mewtwoDefeated: !!state.flags?.mewtwoDefeated,
      caughtSpecies: caught instanceof Set
        ? [...caught]
        : Array.isArray(caught)
          ? [...caught]
          : [],
      trainersDefeated: trainers instanceof Set
        ? [...trainers]
        : Array.isArray(trainers)
          ? [...trainers]
          : [],
    },
    steps: state.steps || 0,
    battlesWon: state.battlesWon || 0,
  };
}

/**
 * Deserialize a save object into a game snapshot.
 * Returns null if invalid.
 */
function deserializeGameState(data) {
  if (!data || data.version !== SAVE_VERSION) return null;
  if (!Array.isArray(data.party) || data.party.length === 0) return null;
  const party = data.party.map(deserializePokemon).filter(Boolean);
  if (!party.length) return null;
  return {
    party,
    bag: {
      pokeball: data.bag?.pokeball || 0,
      potion: data.bag?.potion || 0,
      superball: data.bag?.superball || 0,
    },
    player: {
      x: data.player?.x ?? 12,
      y: data.player?.y ?? 12,
      dir: data.player?.dir || 'down',
    },
    flags: {
      shopGift: !!data.flags?.shopGift,
      mewtwoDefeated: !!data.flags?.mewtwoDefeated,
      caughtSpecies: new Set(data.flags?.caughtSpecies || []),
      trainersDefeated: new Set(data.flags?.trainersDefeated || []),
    },
    steps: data.steps || 0,
    battlesWon: data.battlesWon || 0,
  };
}

function hasValidSaveData(data) {
  return deserializeGameState(data) != null;
}

// Expose for ES modules (game3d.js)
if (typeof window !== 'undefined') {
  Object.assign(window, {
    randInt, clamp, calcStat, createPokemon, expForLevel, stageMultiplier,
    getEffectiveStat, typeEffectiveness, calcDamage, applyStatusEffect, gainExp,
    healParty, partyAlive, firstAlive, pickWildEncounter, catchChance, tryCatch,
    canSwitchTo, getSwitchableIndices, applyBattleSwitch, buildTrainerParty,
    nextTrainerMonIndex, applyTrainerReward, formatRewardText, SAVE_VERSION,
    SAVE_STORAGE_KEY, serializePokemon, deserializePokemon, serializeGameState,
    deserializeGameState, hasValidSaveData,
  });
}
