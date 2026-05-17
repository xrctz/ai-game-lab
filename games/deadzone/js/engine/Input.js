export class Input {
    constructor() {
        this.keys = {};
        this.keysJustPressed = {};
        this.keysJustReleased = {};
        this.mouse = { x: 0, y: 0, dx: 0, dy: 0 };
        this.mouseButtons = {};
        this.mouseButtonsJustPressed = {};
        this.mouseButtonsJustReleased = {};
        this.locked = false;
        this.embedded = false;
        this._lockRetryCount = 0;
        this._lockRetryMax = 1;

        try { this.embedded = window.self !== window.top; } catch(e) { this.embedded = true; }
        if (/[?&]embed=1(?:&|$)/.test(location.search)) this.embedded = true;

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onLockChange = this._onLockChange.bind(this);
        this._onLockError = this._onLockError.bind(this);

        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('mousedown', this._onMouseDown);
        document.addEventListener('mouseup', this._onMouseUp);
        document.addEventListener('pointerlockchange', this._onLockChange);
        document.addEventListener('pointerlockerror', this._onLockError);

        this.sensitivity = 0.002;
    }

    setSensitivity(value) {
        this.sensitivity = value * 0.001;
    }

    requestPointerLock(element) {
        this._lockRetryCount = 0;
        this._attemptLock(element);
    }

    _attemptLock(element) {
        try {
            var promise = element.requestPointerLock();
            if (promise && typeof promise.catch === 'function') {
                promise.catch(function(err) {
                    console.warn('[Dead Zone] Pointer lock failed:', err);
                });
            }
        } catch(e) {
            console.warn('[Dead Zone] Pointer lock error:', e);
        }
    }

    exitPointerLock() {
        try { document.exitPointerLock(); } catch(e) {}
    }

    _onLockError() {
        console.warn('[Dead Zone] pointerlockerror fired');
        if (this.embedded) {
            var overlay = document.getElementById('embed-overlay');
            var lockError = document.getElementById('embed-lock-error');
            if (overlay) overlay.style.display = 'grid';
            if (lockError) lockError.style.display = 'block';
        }
    }

    _onKeyDown(e) {
        if (!this.keys[e.code]) {
            this.keysJustPressed[e.code] = true;
        }
        this.keys[e.code] = true;
    }

    _onKeyUp(e) {
        this.keys[e.code] = false;
        this.keysJustReleased[e.code] = true;
    }

    _onMouseMove(e) {
        if (this.locked) {
            this.mouse.dx = e.movementX * this.sensitivity;
            this.mouse.dy = e.movementY * this.sensitivity;
        }
    }

    _onMouseDown(e) {
        if (!this.mouseButtons[e.button]) {
            this.mouseButtonsJustPressed[e.button] = true;
        }
        this.mouseButtons[e.button] = true;
    }

    _onMouseUp(e) {
        this.mouseButtons[e.button] = false;
        this.mouseButtonsJustReleased[e.button] = true;
    }

    _onLockChange() {
        this.locked = !!document.pointerLockElement;
    }

    isKeyDown(code) {
        return !!this.keys[code];
    }

    isKeyJustPressed(code) {
        return !!this.keysJustPressed[code];
    }

    isMouseDown(button = 0) {
        return !!this.mouseButtons[button];
    }

    isMouseJustPressed(button = 0) {
        return !!this.mouseButtonsJustPressed[button];
    }

    getMouseDelta() {
        return { x: this.mouse.dx, y: this.mouse.dy };
    }

    update() {
        this.mouse.dx = 0;
        this.mouse.dy = 0;
        this.keysJustPressed = {};
        this.keysJustReleased = {};
        this.mouseButtonsJustPressed = {};
        this.mouseButtonsJustReleased = {};
    }

    isLocked() {
        return this.locked;
    }
}
