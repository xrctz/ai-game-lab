/**
 * DeadTakeover v10 Visual Effects Engine.
 * Floating damage numbers, wave announcements, atmospheric effects,
 * kill streak banners, weapon HUD, crosshair feedback, screen shake.
 * Works via DOM observation - no bundle modification needed.
 */
(function(){
  'use strict';

  var DAMAGE_NUMBER_MAX = 20;
  var KILL_STREAK_THRESHOLD = [3, 5, 8, 12, 20];
  var KILL_STREAK_NAMES = ['Killing Spree', 'Rampage', 'Unstoppable', 'Legendary', 'GODLIKE'];
  var KILL_STREAK_DURATION = 2500;
  var WAVE_ANNOUNCE_DURATION = 2800;

  var damageNumbers = [];
  var lastKills = -1;
  var lastWave = -1;
  var streakTimer = null;
  var waveTimer = null;
  var sessionStartTime = Date.now();
  var totalKills = 0;
  var hudObserver = null;

  function $(id){ return document.getElementById(id); }

  function pad2(n){ return n < 10 ? '0' + n : String(n); }

  function isGameplayActive(){
    var menu = $('menu-overlay');
    if(menu){
      var style = window.getComputedStyle(menu);
      if(style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0.05){
        return false;
      }
    }
    var hud = $('hud');
    if(hud){
      var hudStyle = window.getComputedStyle(hud);
      if(hudStyle.display === 'none' || hudStyle.visibility === 'hidden'){
        return false;
      }
    }
    return true;
  }

  function syncBaselineFromHUD(){
    var statsEl = $('stats-meta');
    var worldEl = $('world-stats');
    if(statsEl){
      var km = (statsEl.textContent || '').match(/Kills:\s*(\d+)/i);
      if(km) lastKills = parseInt(km[1], 10);
    }
    if(worldEl){
      var wm = (worldEl.textContent || '').match(/Wave\s*(\d+)/i);
      if(wm) lastWave = parseInt(wm[1], 10);
    }
  }

  function spawnDamageNumber(amount, type, screenX, screenY){
    if(!isGameplayActive()) return;
    var container = $('dt-fx-damage-overlay');
    if(!container) return;

    var el = document.createElement('div');
    el.className = 'dmg-number dmg-' + (type || 'normal');

    var prefix = '';
    var suffix = '';
    var text = '';

    switch(type){
      case 'crit':
        text = amount; suffix = 'CRIT'; break;
      case 'headshot':
        text = amount; suffix = 'HEAD'; break;
      case 'heal':
        prefix = '+'; text = amount; break;
      case 'miss':
        text = 'MISS'; break;
      default:
        text = amount;
    }

    el.innerHTML = (prefix ? '<span class="dmg-prefix">' + prefix + '</span>' : '')
      + text
      + (suffix ? '<span class="dmg-suffix">' + suffix + '</span>' : '');

    var cx = screenX || (window.innerWidth / 2 + (Math.random() - 0.5) * 120);
    var cy = screenY || (window.innerHeight / 2 - 20 + (Math.random() - 0.5) * 60);
    el.style.left = cx + 'px';
    el.style.top = cy + 'px';

    container.appendChild(el);
    damageNumbers.push(el);

    while(damageNumbers.length > DAMAGE_NUMBER_MAX){
      var old = damageNumbers.shift();
      if(old.parentNode) old.parentNode.removeChild(old);
    }

    var duration = type === 'crit' || type === 'headshot' ? 1400 : 1200;
    setTimeout(function(){
      if(el.parentNode) el.parentNode.removeChild(el);
      var idx = damageNumbers.indexOf(el);
      if(idx >= 0) damageNumbers.splice(idx, 1);
    }, duration);
  }

  function announceWave(waveNum, subText){
    if(!isGameplayActive()) return;
    var el = $('wave-announce');
    var numEl = $('wave-announce-number');
    var subEl = $('wave-announce-sub');
    if(!el || !numEl) return;

    if(waveTimer) clearTimeout(waveTimer);

    numEl.textContent = waveNum;
    if(subEl) subEl.textContent = subText || 'Incoming';
    el.classList.add('active');

    numEl.style.animation = 'none';
    numEl.offsetHeight;
    numEl.style.animation = '';

    waveTimer = setTimeout(function(){
      el.classList.remove('active');
    }, WAVE_ANNOUNCE_DURATION);
  }

  function showKillStreak(streakCount){
    var banner = $('kill-streak-banner');
    var textEl = $('ksb-text');
    var subEl = $('ksb-sub');
    if(!banner || !textEl) return;

    var name = '';
    var sub = '';
    for(var i = KILL_STREAK_THRESHOLD.length - 1; i >= 0; i--){
      if(streakCount >= KILL_STREAK_THRESHOLD[i]){
        name = KILL_STREAK_NAMES[i];
        sub = streakCount + ' kills';
        break;
      }
    }
    if(!name) return;

    textEl.textContent = name;
    if(subEl) subEl.textContent = sub;

    banner.classList.remove('fade-out');
    banner.classList.add('active');

    if(streakTimer) clearTimeout(streakTimer);
    streakTimer = setTimeout(function(){
      banner.classList.remove('active');
      banner.classList.add('fade-out');
    }, KILL_STREAK_DURATION);
  }

  function updateWeaponHUD(){
    var info = $('weapon-info');
    if(info){
      info.style.display = isGameplayActive() ? '' : 'none';
    }
    if(!isGameplayActive()) return;

    var statsEl = $('stats-meta');
    if(!statsEl) return;
    var statsText = statsEl.textContent || '';

    var ammoMatch = statsText.match(/Ammo:\s*(\d+)\s*\/\s*(\d+)/i);
    if(!ammoMatch) return;

    var current = parseInt(ammoMatch[1], 10);
    var reserve = parseInt(ammoMatch[2], 10);

    var currentEl = $('weapon-ammo-current');
    var reserveEl = $('weapon-ammo-reserve');
    var barFill = $('weapon-info-bar-fill');

    if(currentEl){
      currentEl.textContent = current;
      currentEl.classList.remove('ammo-low', 'ammo-empty');
      if(current === 0) currentEl.classList.add('ammo-empty');
      else if(current <= 5) currentEl.classList.add('ammo-low');
    }
    if(reserveEl) reserveEl.textContent = reserve;
    if(barFill){
      var pct = Math.max(0, Math.min(100, (current / Math.max(1, current + reserve)) * 100));
      barFill.style.width = pct + '%';
    }
  }

  function updateHealthOverlay(){
    if(!isGameplayActive()){
      var overlayOff = $('low-health-overlay');
      if(overlayOff) overlayOff.classList.remove('active', 'critical');
      return;
    }

    var healthFill = $('health-fill');
    if(!healthFill) return;
    var widthStr = healthFill.style.width || '';
    var pct = parseFloat(widthStr);
    if(isNaN(pct)) pct = 100;

    var overlay = $('low-health-overlay');
    if(!overlay) return;

    overlay.classList.remove('active', 'critical');
    if(pct <= 15) overlay.classList.add('critical');
    else if(pct <= 35) overlay.classList.add('active');
  }

  function crosshairHitConfirm(isHeadshot){
    var ch = $('crosshair');
    if(!ch) return;
    var cls = isHeadshot ? 'headshot-confirm' : 'hit-confirm';
    ch.classList.add(cls);
    setTimeout(function(){ ch.classList.remove(cls); }, 150);
  }

  function screenShake(intensity){
    if(!isGameplayActive()) return;
    var app = $('app');
    if(!app) return;
    var cls = intensity === 'heavy' ? 'screen-shake-heavy' : 'screen-shake-light';
    app.classList.add(cls);
    setTimeout(function(){ app.classList.remove(cls); }, intensity === 'heavy' ? 300 : 150);
  }

  function processHUDChanges(){
    if(!isGameplayActive()) return;

    var statsEl = $('stats-meta');
    var worldEl = $('world-stats');
    if(!statsEl) return;

    var statsText = statsEl.textContent || '';
    var worldText = worldEl ? worldEl.textContent || '' : '';

    var killsMatch = statsText.match(/Kills:\s*(\d+)/i);
    if(killsMatch){
      var kills = parseInt(killsMatch[1], 10);
      if(lastKills >= 0 && kills > lastKills){
        var diff = kills - lastKills;
        totalKills += diff;

        for(var t = 0; t < KILL_STREAK_THRESHOLD.length; t++){
          if(totalKills === KILL_STREAK_THRESHOLD[t]){
            showKillStreak(totalKills);
            screenShake('heavy');
            break;
          }
        }

        if(diff >= 3) screenShake('heavy');
        else if(diff >= 2) screenShake('light');
      }
      lastKills = kills;
    }

    var waveMatch = worldText.match(/Wave\s*(\d+)/i);
    if(waveMatch){
      var wave = parseInt(waveMatch[1], 10);
      if(lastWave >= 0 && wave > lastWave){
        announceWave(wave, wave >= 10 ? 'HORDE INCOMING' : 'Incoming');
        screenShake('light');
      }
      lastWave = wave;
    }
  }

  function observeHUD(){
    var statsEl = $('stats-meta');
    if(!statsEl) return;

    if(hudObserver) hudObserver.disconnect();

    hudObserver = new MutationObserver(function(){
      processHUDChanges();
    });

    hudObserver.observe(statsEl, { childList: true, characterData: true, subtree: true });

    var worldEl = $('world-stats');
    if(worldEl){
      hudObserver.observe(worldEl, { childList: true, characterData: true, subtree: true });
    }

    var healthFill = $('health-fill');
    if(healthFill){
      new MutationObserver(function(){ updateHealthOverlay(); })
        .observe(healthFill, { attributes: true, attributeFilter: ['style'] });
    }

    setInterval(function(){
      updateWeaponHUD();
      updateHealthOverlay();
    }, 250);
  }

  function getSessionTime(){
    var s = Math.floor((Date.now() - sessionStartTime) / 1000);
    var m = Math.floor(s / 60);
    return pad2(m) + ':' + pad2(s % 60);
  }

  window.__dtVisualEffects = {
    spawnDamageNumber: spawnDamageNumber,
    announceWave: announceWave,
    showKillStreak: showKillStreak,
    crosshairHitConfirm: crosshairHitConfirm,
    screenShake: screenShake,
    updateWeaponHUD: updateWeaponHUD,
    getTotalKills: function(){ return totalKills; },
    getSessionTime: getSessionTime,
    isGameplayActive: isGameplayActive
  };

  window.__dtDamageNumber = spawnDamageNumber;
  window.__dtWaveAnnounce = announceWave;

  function init(){
    observeHUD();
    syncBaselineFromHUD();

    var menu = $('menu-overlay');
    if(menu){
      new MutationObserver(function(){
        if(isGameplayActive()){
          syncBaselineFromHUD();
        } else {
          var overlay = $('low-health-overlay');
          if(overlay) overlay.classList.remove('active', 'critical');
          var banner = $('kill-streak-banner');
          if(banner) banner.classList.remove('active', 'fade-out');
        }
        updateWeaponHUD();
      }).observe(menu, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    console.log('[visual-effects] v10 effects engine active');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
