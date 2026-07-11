/**
 * Dead Zone entry (modular path). Prefer game-bundle.js on production pages;
 * this module entry stays available for local ES-module development.
 */
async function initGame() {
    try {
        if (!window.THREE) {
            throw new Error('Three.js not loaded');
        }

        const loadingText = document.getElementById('loading-text');
        if (loadingText) loadingText.textContent = 'MOUNTING SYSTEMS…';

        const { Game } = await import('./game/Game.js');
        const game = new Game();
        await game.init();
        window.__deadZoneGame = game;
        if (loadingText) loadingText.textContent = 'READY';
    } catch (err) {
        console.error('Game initialization failed:', err);
        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.textContent = 'ERROR: ' + err.message;
            loadingText.style.color = '#ff4444';
        }
        const loadingBar = document.getElementById('loading-bar');
        if (loadingBar) {
            loadingBar.style.background = '#ff4444';
        }
    }
}

// Only auto-boot if THREE is present and no bundle already claimed the page
if (!window.__deadZoneBundleBooted) {
    initGame();
}
