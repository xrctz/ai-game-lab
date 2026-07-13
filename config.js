/**
 * AI Game Lab — Library OS cinematic (live hub)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AIGL_Config = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var ROOT = '/ai-game-lab';
  var HUB = ROOT;
  var BUILD = '26-cinematic';

  return {
    BUILD: BUILD,
    ROOT: ROOT,
    HUB: HUB,
    GAMES: ROOT + '/games',
    ASSETS: ROOT + '/showcase',
    STYLE: HUB + '/styles.css?v=' + BUILD,
    SCRIPT: HUB + '/script.js?v=' + BUILD,
    PLAYER_URLS: HUB + '/player-urls.js?v=' + BUILD,
    FAVICON: ROOT + '/showcase/favicon.svg?v=' + BUILD,
    MANIFEST: ROOT + '/showcase/manifest.json',
    BRAND: ROOT + '/showcase/brand-mark.svg?v=' + BUILD,
    GITHUB: 'https://github.com/xrctz/ai-game-lab',
    pages: {
      home: HUB + '/',
      showcase: HUB + '/showcase/',
      play: HUB + '/play/',
      story: HUB + '/story/',
      updates: HUB + '/updates/',
      mindcraft: HUB + '/mindcraft-info.html',
      nightofthedead: HUB + '/nightofthedead-info.html'
    },
    preview: function (name) {
      return ROOT + '/showcase/previews/' + name;
    },
    mascot: function (name) {
      return ROOT + '/showcase/mascots/' + name + '?v=' + BUILD;
    }
  };
});
