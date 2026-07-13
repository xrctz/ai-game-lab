/**
 * Pokémon Adventure — hub embed bridge v1
 */
(function () {
  'use strict';
  if (window.__pokemonHubBridge) return;
  window.__pokemonHubBridge = 'v1';

  var LAST_EDITION_KEY = 'pokemon-adventure-last-edition';

  function isEmbed() {
    try {
      if (window.self !== window.top) return true;
    } catch (e) {
      return true;
    }
    return /(?:^|[?&])embed=1(?:&|$)/.test(location.search);
  }

  function injectStyles() {
    if (document.getElementById('poke-hub-bridge-css')) return;
    var s = document.createElement('style');
    s.id = 'poke-hub-bridge-css';
    s.textContent = [
      '#poke-hub-chip{position:fixed;top:10px;right:10px;z-index:50;',
      'font-family:Press Start 2P,monospace;font-size:7px;padding:6px 8px;',
      'border:2px solid #4a9bc7;color:#ffcb05;background:rgba(10,21,36,.92)}',
      '#poke-continue{margin-top:8px;display:inline-block;font-size:8px;color:#ffcb05;',
      'text-decoration:none;border:2px solid #ffcb05;padding:8px 10px}',
      '#poke-continue:hover{background:rgba(255,203,5,.12)}'
    ].join('');
    document.head.appendChild(s);
  }

  function rememberEdition(edition) {
    try { localStorage.setItem(LAST_EDITION_KEY, edition); } catch (e) {}
  }

  function mountLauncher() {
    injectStyles();
    if (isEmbed()) {
      var chip = document.createElement('div');
      chip.id = 'poke-hub-chip';
      chip.textContent = 'HUB';
      document.body.appendChild(chip);
    }

    var last = null;
    try { last = localStorage.getItem(LAST_EDITION_KEY); } catch (e) {}

    if (last === '2d' || last === '3d') {
      var href = last === '3d' ? '3D/' : '2D/';
      var label = last === '3d' ? 'Continue 3D Edition' : 'Continue 2D Edition';
      var link = document.createElement('a');
      link.id = 'poke-continue';
      link.href = href;
      link.textContent = '▶ ' + label;
      var cards = document.querySelector('.cards');
      if (cards) cards.parentNode.insertBefore(link, cards.nextSibling);
    }

    document.querySelectorAll('a.card').forEach(function (card) {
      card.addEventListener('click', function () {
        var href = card.getAttribute('href') || '';
        rememberEdition(href.indexOf('3D') >= 0 ? '3d' : '2d');
      });
    });
  }

  window.__pokemonRememberEdition = rememberEdition;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountLauncher);
  } else {
    mountLauncher();
  }
})();
