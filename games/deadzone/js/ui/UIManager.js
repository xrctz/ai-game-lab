export class UIManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.elements = {};
        this.killFeedEntries = [];
        this.maxKillFeed = 5;
        this.damageNumbers = [];
        this._cacheElements();
        this._createDamageNumberContainer();
    }

    _cacheElements() {
        const ids = [
            'loading-screen', 'loading-bar', 'loading-text',
            'main-menu', 'controls-screen', 'settings-screen', 'map-select-screen', 'map-grid',
            'hud', 'crosshair', 'hit-marker', 'damage-vignette',
            'health-bar', 'health-text',
            'weapon-name', 'ammo-current', 'ammo-reserve',
            'wave-label', 'wave-enemies', 'objective-text',
            'fps-counter', 'kill-feed', 'interaction-prompt', 'interaction-text',
            'pause-menu', 'game-over-screen', 'victory-screen',
            'go-waves', 'go-kills', 'go-headshots', 'go-accuracy',
            'v-waves', 'v-kills', 'v-headshots', 'v-score',
            'wave-announce', 'wave-announce-text', 'wave-announce-sub',
            'squad-wheel',
            'setting-volume', 'setting-sensitivity', 'setting-fov', 'setting-fps',
            'ally-health-0', 'ally-health-1', 'ally-health-2',
            'ally-status-0', 'ally-status-1', 'ally-status-2',
            'shop-panel', 'shop-currency', 'shop-items',
            'combo-display', 'combo-count', 'combo-mult', 'combo-timer',
            'reload-prompt',
            'wave-summary', 'wave-summary-title',
            'ws-kills', 'ws-headshots', 'ws-accuracy', 'ws-combo'
        ];

        for (const id of ids) {
            this.elements[id] = document.getElementById(id);
        }

        this.elements['teammate-cards'] = document.querySelectorAll('.teammate-card');
    }

    get(id) {
        return this.elements[id];
    }

    show(id) {
        const el = this.elements[id];
        if (el) el.classList.remove('hidden');
    }

    hide(id) {
        const el = this.elements[id];
        if (el) el.classList.add('hidden');
    }

    setHTML(id, html) {
        const el = this.elements[id];
        if (el) el.innerHTML = html;
    }

    setStyle(id, prop, value) {
        const el = this.elements[id];
        if (el) el.style[prop] = value;
    }

    updateLoading(progress, text) {
        this.setStyle('loading-bar', 'width', `${progress}%`);
        if (text) this.setHTML('loading-text', text);
    }

    hideLoading() {
        this.hide('loading-screen');
    }

    showMenu(menuId) {
        this.hide('main-menu');
        this.hide('controls-screen');
        this.hide('settings-screen');
        this.hide('map-select-screen');
        this.hide('pause-menu');
        this.hide('game-over-screen');
        this.hide('victory-screen');
        if (menuId) this.show(menuId);
    }

    updateHUD(player, weapon, allies, waveManager, fps, weaponIndex, crosshairSpread) {
        if (!player) return;

        const healthPct = (player.health / player.maxHealth) * 100;
        this.setStyle('health-bar', 'width', `${healthPct}%`);
        this.setHTML('health-text', Math.ceil(player.health));

        if (healthPct < 25) {
            this.setStyle('health-bar', 'background', '#c62828');
        } else if (healthPct < 50) {
            this.setStyle('health-bar', 'background', '#ff9800');
        } else {
            this.setStyle('health-bar', 'background', 'linear-gradient(90deg, #c62828, #e53935)');
        }

        if (weapon) {
            this.setHTML('weapon-name', weapon.name);
            this.setHTML('ammo-current', weapon.currentAmmo);
            this.setHTML('ammo-reserve', weapon.reserveAmmo);

            if (weapon.currentAmmo <= 0) {
                this.setStyle('ammo-current', 'color', '#c62828');
            } else if (weapon.currentAmmo <= weapon.magazineSize * 0.3) {
                this.setStyle('ammo-current', 'color', '#ff9800');
            } else {
                this.setStyle('ammo-current', 'color', '#fff');
            }

            if (weapon.reloading) {
                this.setHTML('weapon-name', `${weapon.name} - RELOADING`);
            }

            this._updateReloadPrompt(weapon);
        }

        const slots = document.querySelectorAll('.weapon-slot');
        slots.forEach((slot, i) => {
            slot.classList.toggle('active', i === (weaponIndex || 0));
        });

        this._updateCrosshairSpread(crosshairSpread || 0);

        if (allies) {
            for (let i = 0; i < allies.length; i++) {
                const ally = allies[i];
                const card = this.elements['teammate-cards']?.[i];

                if (!ally.alive) {
                    this.setStyle(`ally-health-${i}`, 'width', '0%');
                    this.setHTML(`ally-status-${i}`, 'DEAD');
                    if (card) card.classList.add('downed');
                    continue;
                }

                const healthPct = (ally.health / ally.maxHealth) * 100;
                this.setStyle(`ally-health-${i}`, 'width', `${healthPct}%`);

                if (ally.downed) {
                    this.setStyle(`ally-health-${i}`, 'background', '#c62828');
                    this.setHTML(`ally-status-${i}`, `DOWNED ${Math.ceil(ally.downTimer)}s`);
                    if (card) card.classList.add('downed');
                } else {
                    this.setStyle(`ally-health-${i}`, 'background', '#4caf50');
                    this.setHTML(`ally-status-${i}`, ally.getStatusText());
                    if (card) card.classList.remove('downed');
                }
            }
        }

        if (waveManager) {
            this.setHTML('wave-label', `WAVE ${waveManager.currentWave}`);
            this.setHTML('wave-enemies', `ENEMIES: ${waveManager.enemiesRemaining}`);

            if (waveManager.isBetween()) {
                this.setHTML('objective-text', 'WAVE CLEAR - PREPARE FOR NEXT');
            } else if (waveManager.isActive()) {
                this.setHTML('objective-text', 'ELIMINATE ALL HOSTILES');
            }
        }

        if (fps !== undefined && this.gameState.settings.showFPS) {
            this.show('fps-counter');
            this.setHTML('fps-counter', `FPS: ${fps}`);
        } else {
            this.hide('fps-counter');
        }
    }

    _updateReloadPrompt(weapon) {
        const el = this.elements['reload-prompt'];
        if (!el) return;

        if (weapon.reloading || weapon.reserveAmmo <= 0) {
            el.classList.add('hidden');
            return;
        }

        if (weapon.currentAmmo <= 0) {
            el.textContent = 'PRESS R TO RELOAD';
            el.classList.add('empty');
            el.classList.remove('hidden');
        } else if (weapon.currentAmmo <= weapon.magazineSize * 0.3) {
            el.textContent = 'LOW AMMO - PRESS R';
            el.classList.remove('empty');
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    }

    updateCombo(streak, timerFrac, multiplier) {
        if (streak >= 2) {
            this.show('combo-display');
            const countEl = this.elements['combo-count'];
            if (countEl && this._lastComboCount !== streak) {
                this._lastComboCount = streak;
                countEl.textContent = `x${streak}`;
                countEl.classList.remove('combo-pop');
                void countEl.offsetWidth;
                countEl.classList.add('combo-pop');
            }
            this.setHTML('combo-mult', `SCORE x${multiplier.toFixed(1)}`);
            this.setStyle('combo-timer', 'width', `${Math.max(0, Math.min(1, timerFrac)) * 100}%`);
        } else {
            this._lastComboCount = 0;
            this.hide('combo-display');
        }
    }

    showWaveSummary(waveNum, stats) {
        this.setHTML('wave-summary-title', `WAVE ${waveNum} CLEAR`);
        this.setHTML('ws-kills', stats.kills);
        this.setHTML('ws-headshots', stats.headshots);
        this.setHTML('ws-accuracy', `${stats.accuracy}%`);
        this.setHTML('ws-combo', `x${stats.bestCombo}`);

        const el = this.elements['wave-summary'];
        if (!el) return;
        el.classList.remove('hidden');
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
        clearTimeout(this._waveSummaryTimeout);
        this._waveSummaryTimeout = setTimeout(() => this.hide('wave-summary'), 5000);
    }

    showHitMarker(headshot = false) {
        const el = this.elements['hit-marker'];
        if (!el) return;
        el.classList.remove('hidden', 'headshot');
        if (headshot) el.classList.add('headshot');
        void el.offsetWidth;
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = 'hitFlash 0.15s ease-out';
        setTimeout(() => el.classList.add('hidden'), 150);
    }

    showDamageVignette(intensity) {
        this.setStyle('damage-vignette', 'opacity', Math.min(1, intensity));
        setTimeout(() => {
            this.setStyle('damage-vignette', 'opacity', '0');
        }, 200);
    }

    _updateCrosshairSpread(spread) {
        const base = 8;
        const spreadPx = base + spread * 40;
        ['top', 'bottom'].forEach(dir => {
            const el = document.querySelector(`.crosshair-${dir}`);
            if (el) el.style.height = `${spreadPx}px`;
        });
        ['left', 'right'].forEach(dir => {
            const el = document.querySelector(`.crosshair-${dir}`);
            if (el) el.style.width = `${spreadPx}px`;
        });
    }

    showShop(currency, upgrades) {
        const panel = this.elements['shop-panel'];
        if (!panel) return;
        this.setHTML('shop-currency', `CURRENCY: ${currency}`);
        const itemsEl = this.elements['shop-items'];
        if (!itemsEl) return;
        itemsEl.innerHTML = '';
        for (const upg of upgrades) {
            const item = document.createElement('div');
            item.className = 'shop-item';
            const canAfford = currency >= upg.cost && !upg.maxed;
            item.innerHTML = `
                <div class="shop-item-name">${upg.name}</div>
                <div class="shop-item-desc">${upg.desc}</div>
                <div class="shop-item-cost">${upg.maxed ? 'MAXED' : canAfford ? upg.cost + ' CR' : upg.cost + ' CR'}</div>
            `;
            item.classList.toggle('can-afford', canAfford);
            item.classList.toggle('maxed', upg.maxed);
            item.dataset.index = upgrades.indexOf(upg);
            item.addEventListener('click', () => {
                if (canAfford && this.gameState && this.gameState._purchaseUpgrade) {
                    this.gameState._purchaseUpgrade(upgrades.indexOf(upg));
                }
            });
            itemsEl.appendChild(item);
        }
        panel.classList.remove('hidden');
    }

    hideShop() {
        const panel = this.elements['shop-panel'];
        if (panel) panel.classList.add('hidden');
    }

    updateShopCurrency(currency) {
        this.setHTML('shop-currency', `CURRENCY: ${currency}`);
    }

    showDamageDirection(attackerPos, playerPos, playerRotation) {
        if (!attackerPos || !playerPos) return;

        const dx = attackerPos.x - playerPos.x;
        const dz = attackerPos.z - playerPos.z;
        const angle = Math.atan2(dx, dz) - playerRotation.y;

        const normalizedAngle = ((angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

        const arrows = ['damage-top', 'damage-right', 'damage-bottom', 'damage-left'];
        const directions = [
            { id: 'damage-top', range: [-Math.PI * 0.75, -Math.PI * 0.25] },
            { id: 'damage-right', range: [-Math.PI * 0.25, Math.PI * 0.25] },
            { id: 'damage-bottom', range: [Math.PI * 0.25, Math.PI * 0.75] },
            { id: 'damage-left', range: [Math.PI * 0.75, Math.PI * 1.0] }
        ];

        for (const dir of directions) {
            const el = document.querySelector(`.${dir.id}`);
            if (!el) continue;

            let inRange = false;
            if (dir.id === 'damage-left') {
                inRange = normalizedAngle >= dir.range[0] || normalizedAngle <= -Math.PI * 0.75;
            } else {
                inRange = normalizedAngle >= dir.range[0] && normalizedAngle <= dir.range[1];
            }

            if (inRange) {
                el.classList.add('active');
                setTimeout(() => el.classList.remove('active'), 400);
            }
        }
    }

    addKillFeed(message) {
        const feed = this.elements['kill-feed'];
        if (!feed) return;

        const entry = document.createElement('div');
        entry.className = 'kill-entry';
        entry.textContent = message;
        feed.appendChild(entry);

        this.killFeedEntries.push(entry);
        while (this.killFeedEntries.length > this.maxKillFeed) {
            const old = this.killFeedEntries.shift();
            if (old.parentNode) old.parentNode.removeChild(old);
        }

        setTimeout(() => {
            if (entry.parentNode) entry.parentNode.removeChild(entry);
            const idx = this.killFeedEntries.indexOf(entry);
            if (idx >= 0) this.killFeedEntries.splice(idx, 1);
        }, 3000);
    }

    showWaveAnnounce(waveNum, subtitle) {
        this.setHTML('wave-announce-text', `WAVE ${waveNum}`);
        this.setHTML('wave-announce-sub', subtitle || 'PREPARE YOURSELF');
        this.show('wave-announce');
        setTimeout(() => this.hide('wave-announce'), 3000);
    }

    showStreakAnnounce(count) {
        const messages = {
            5: 'BLOODLUST!',
            10: 'UNSTOPPABLE!',
            15: 'RAMPAGE!',
            20: 'GODLIKE!',
            25: 'LEGENDARY!'
        };
        const msg = messages[count] || `${count} KILL STREAK!`;
        this.setHTML('wave-announce-text', msg);
        this.setHTML('wave-announce-sub', `${count} CONSECUTIVE KILLS`);
        this.show('wave-announce');
        setTimeout(() => this.hide('wave-announce'), 2000);
    }

    showGameOver(stats) {
        this.setHTML('go-waves', stats.wavesCompleted);
        this.setHTML('go-kills', stats.kills);
        this.setHTML('go-headshots', stats.headshots);
        this.setHTML('go-accuracy', `${stats.accuracy}%`);
        this.show('game-over-screen');
    }

    showVictory(stats) {
        this.setHTML('v-waves', stats.wavesCompleted);
        this.setHTML('v-kills', stats.kills);
        this.setHTML('v-headshots', stats.headshots);
        this.setHTML('v-score', stats.score);
        this.show('victory-screen');
    }

    showSquadWheel() {
        this.show('squad-wheel');
    }

    hideSquadWheel() {
        this.hide('squad-wheel');
    }

    updateSettings(settings) {
        if (this.elements['setting-volume']) {
            this.elements['setting-volume'].value = settings.volume * 100;
        }
        if (this.elements['setting-sensitivity']) {
            this.elements['setting-sensitivity'].value = settings.sensitivity;
        }
        if (this.elements['setting-fov']) {
            this.elements['setting-fov'].value = settings.fov;
        }
        if (this.elements['setting-fps']) {
            this.elements['setting-fps'].checked = settings.showFPS;
        }
    }

    showInteraction(text) {
        this.setHTML('interaction-text', text);
        this.show('interaction-prompt');
    }

    hideInteraction() {
        this.hide('interaction-prompt');
    }

    _createDamageNumberContainer() {
        this.damageNumberContainer = document.createElement('div');
        this.damageNumberContainer.id = 'damage-numbers';
        this.damageNumberContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:110;';
        document.getElementById('game-container').appendChild(this.damageNumberContainer);
    }

    showDamageNumber(worldPos, damage, isHeadshot, camera, rendererDom) {
        const vec = worldPos.clone();
        vec.project(camera);

        const x = (vec.x * 0.5 + 0.5) * rendererDom.clientWidth;
        const y = (-(vec.y * 0.5) + 0.5) * rendererDom.clientHeight;

        if (vec.z > 1) return; // Behind camera

        const el = document.createElement('div');
        el.className = 'damage-number' + (isHeadshot ? ' headshot-dmg' : '');
        el.textContent = Math.round(damage);
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.color = isHeadshot ? '#ff4444' : '#ffffff';
        el.style.fontSize = isHeadshot ? '28px' : '20px';
        this.damageNumberContainer.appendChild(el);

        const entry = { el, timer: 1.0, startY: y };
        this.damageNumbers.push(entry);

        setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
            const idx = this.damageNumbers.indexOf(entry);
            if (idx >= 0) this.damageNumbers.splice(idx, 1);
        }, 1000);
    }

    updateDamageNumbers(dt) {
        for (const entry of this.damageNumbers) {
            entry.timer -= dt;
            const t = 1 - entry.timer;
            entry.el.style.transform = `translate(-50%, -50%) translateY(${-t * 60}px)`;
            entry.el.style.opacity = Math.max(0, 1 - t * 1.2);
        }
    }

    showLowHealthPulse(healthPct) {
        let pulseEl = document.getElementById('low-health-pulse');
        if (!pulseEl) {
            pulseEl = document.createElement('div');
            pulseEl.id = 'low-health-pulse';
            pulseEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:95;background:radial-gradient(ellipse at center, transparent 30%, rgba(180,0,0,0.4) 100%);opacity:0;transition:opacity 0.3s;';
            document.getElementById('game-container').appendChild(pulseEl);
        }

        if (healthPct < 25) {
            const intensity = 1 - (healthPct / 25);
            const pulse = 0.3 + Math.sin(Date.now() * 0.008) * 0.15 * intensity;
            pulseEl.style.opacity = pulse * intensity;
        } else {
            pulseEl.style.opacity = '0';
        }
    }

    hideAll() {
        this.hide('hud');
        this.hide('main-menu');
        this.hide('controls-screen');
        this.hide('settings-screen');
        this.hide('map-select-screen');
        this.hide('pause-menu');
        this.hide('game-over-screen');
        this.hide('victory-screen');
        this.hide('wave-announce');
        this.hide('squad-wheel');
        this.hide('interaction-prompt');
        this.hide('shop-panel');
        this.hide('combo-display');
        this.hide('reload-prompt');
        this.hide('wave-summary');
    }
}
