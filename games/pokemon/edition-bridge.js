/**
 * Pokémon Adventure — edition hub bridge (2D / 3D)
 */
(function () {
  'use strict';
  var edition = document.documentElement.getAttribute('data-pokemon-edition');
  if (!edition) return;

  try {
    localStorage.setItem('pokemon-adventure-last-edition', edition);
  } catch (e) {}

  var isEmbed = false;
  try {
    isEmbed = window.self !== window.top;
  } catch (e) {
    isEmbed = true;
  }
  if (/[?&]embed=1(?:&|$)/.test(location.search)) isEmbed = true;
  if (!isEmbed) return;

  var chip = document.createElement('div');
  chip.textContent = 'HUB · ' + edition.toUpperCase();
  chip.style.cssText =
    'position:fixed;top:8px;right:8px;z-index:9999;font-family:monospace;font-size:8px;' +
    'padding:5px 7px;border:2px solid #4a9bc7;color:#ffcb05;background:rgba(10,21,36,.9)';
  document.body.appendChild(chip);
})();
