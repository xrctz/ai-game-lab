/**
 * AI Game Lab — player URL helpers
 * Games stay at repo-root /games/; hub is the template shell only.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AIGL_PlayerUrls = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
  var ROOT = (g.AIGL_Config && g.AIGL_Config.ROOT) || '/ai-game-lab';

  var GAME_URLS = {
    zombie: ROOT + '/games/zombie/index.html',
    deadzone: ROOT + '/games/deadzone/index.html',
    voxel: ROOT + '/games/voxel/index.html',
    minecraft: ROOT + '/games/voxel/index.html',
    racing: ROOT + '/games/racing/index.html',
    fnaf: ROOT + '/games/fnaf/index.html',
    pokemon: ROOT + '/games/pokemon/index.html'
  };

  var GAME_NAMES = {
    zombie: 'DeadTakeover Protocol',
    deadzone: 'Dead Zone: Evacuation',
    voxel: 'CraftVerse Engine',
    minecraft: 'CraftVerse Engine',
    mindcraft: 'Mindcraft Control Deck',
    racing: 'VEIL RUSH',
    fnaf: 'Midnight Watch',
    pokemon: 'Pokémon Adventure',
    nightofthedead: 'Night of the Dead'
  };

  var GAME_META = {
    zombie: { genre: 'FPS', engine: 'Three.js', status: 'playable', accent: '#ff4d6a' },
    deadzone: { genre: 'FPS', engine: 'Three.js', status: 'playable', accent: '#f59e0b' },
    voxel: { genre: 'Sandbox', engine: 'WebGL', status: 'playable', accent: '#34d399' },
    racing: { genre: 'Racing', engine: 'Three.js', status: 'playable', accent: '#38bdf8' },
    fnaf: { genre: 'Horror', engine: 'Three.js', status: 'playable', accent: '#a78bfa' },
    pokemon: { genre: 'RPG', engine: 'Canvas + Three.js', status: 'playable', accent: '#fbbf24' },
    mindcraft: { genre: 'Tool', engine: 'Java + Node', status: 'local', accent: '#94a3b8' },
    nightofthedead: { genre: 'FPS', engine: 'Raylib + .NET', status: 'native', accent: '#fb7185' }
  };

  function normalizeQuality(q) {
    if (q === 'low' || q === 'balanced' || q === 'high') return q;
    return 'balanced';
  }

  function getStandaloneUrl(game, opts) {
    opts = opts || {};
    var base = GAME_URLS[game];
    if (!base) return null;
    if (game === 'zombie') {
      return base + '?quality=' + encodeURIComponent(normalizeQuality(opts.quality));
    }
    return base;
  }

  function appendTouch(url, opts) {
    if (!url) return url;
    if (opts && opts.touch) {
      return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'touch=1';
    }
    return url;
  }

  function getEmbedUrl(game, opts) {
    opts = opts || {};
    var base = GAME_URLS[game];
    if (!base) return null;
    var url;
    if (game === 'zombie') {
      var params = ['quality=' + encodeURIComponent(normalizeQuality(opts.quality)), 'embed=1'];
      if (opts.debug) params.push('debug=1');
      url = base + '?' + params.join('&');
    } else if (game === 'deadzone' || game === 'voxel' || game === 'minecraft' ||
        game === 'racing' || game === 'fnaf' || game === 'pokemon') {
      url = base + '?embed=1';
    } else {
      url = base;
    }
    return appendTouch(url, opts);
  }

  function isPlayableGame(game) {
    return !!(GAME_URLS[game]);
  }

  function getGameName(game) {
    return GAME_NAMES[game] || game || 'Unknown';
  }

  function getGameMeta(game) {
    return GAME_META[game] || { genre: 'Other', engine: '—', status: 'unknown', accent: '#a78bfa' };
  }

  return {
    GAME_URLS: GAME_URLS,
    GAME_NAMES: GAME_NAMES,
    GAME_META: GAME_META,
    normalizeQuality: normalizeQuality,
    getStandaloneUrl: getStandaloneUrl,
    getEmbedUrl: getEmbedUrl,
    isPlayableGame: isPlayableGame,
    getGameName: getGameName,
    getGameMeta: getGameMeta
  };
});
