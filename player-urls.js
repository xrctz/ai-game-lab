/**
 * AI Game Lab — pure player URL helpers (shipped hub code).
 * Used by script.js in the browser and by Node verification tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AIGL_PlayerUrls = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var GAME_URLS = {
    zombie: '/ai-game-lab/games/zombie/index.html',
    deadzone: '/ai-game-lab/games/deadzone/index.html',
    voxel: '/ai-game-lab/games/voxel/index.html',
    minecraft: '/ai-game-lab/games/voxel/index.html'
  };

  var GAME_NAMES = {
    zombie: 'DeadTakeover Protocol',
    deadzone: 'Dead Zone: Evacuation',
    voxel: 'CraftVerse Engine',
    minecraft: 'CraftVerse Engine',
    mindcraft: 'Mindcraft Control Deck'
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
      var quality = normalizeQuality(opts.quality);
      return base + '?quality=' + encodeURIComponent(quality);
    }
    return base;
  }

  function getEmbedUrl(game, opts) {
    opts = opts || {};
    var base = GAME_URLS[game];
    if (!base) return null;
    if (game === 'zombie') {
      var quality = normalizeQuality(opts.quality);
      var params = ['quality=' + encodeURIComponent(quality), 'embed=1'];
      if (opts.debug) params.push('debug=1');
      return base + '?' + params.join('&');
    }
    if (game === 'deadzone' || game === 'voxel' || game === 'minecraft') {
      return base + '?embed=1';
    }
    return base;
  }

  function isPlayableGame(game) {
    return !!(GAME_URLS[game]);
  }

  function getGameName(game) {
    return GAME_NAMES[game] || game || 'Unknown';
  }

  return {
    GAME_URLS: GAME_URLS,
    GAME_NAMES: GAME_NAMES,
    normalizeQuality: normalizeQuality,
    getStandaloneUrl: getStandaloneUrl,
    getEmbedUrl: getEmbedUrl,
    isPlayableGame: isPlayableGame,
    getGameName: getGameName
  };
});
