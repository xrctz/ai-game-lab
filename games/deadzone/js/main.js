async function initGame() {
    try {
        if (!window.THREE) {
            throw new Error('Three.js not loaded');
        }

        const { Game } = await import('./game/Game.js');
        const game = new Game();
        await game.init();
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

initGame();
