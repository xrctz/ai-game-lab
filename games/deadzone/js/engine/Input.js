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

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onLockChange = this._onLockChange.bind(this);

        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('mousedown', this._onMouseDown);
        document.addEventListener('mouseup', this._onMouseUp);
        document.addEventListener('pointerlockchange', this._onLockChange);

        this.sensitivity = 0.002;
    }

    setSensitivity(value) {
        this.sensitivity = value * 0.001;
    }

    requestPointerLock(element) {
        element.requestPointerLock();
    }

    exitPointerLock() {
        document.exitPointerLock();
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
