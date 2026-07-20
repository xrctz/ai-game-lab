import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const weaponSource = await readFile(new URL('../js/player/Weapon.js', import.meta.url), 'utf8');
const weaponModuleUrl = `data:text/javascript;base64,${Buffer.from(weaponSource).toString('base64')}`;
globalThis.window = {};
const { Weapon } = await import(weaponModuleUrl);

test('automatic weapons keep firing while the trigger is held', () => {
    const weapon = new Weapon({ automatic: true });

    assert.equal(weapon.shouldFire(true, false), true);
    assert.equal(weapon.shouldFire(false, false), false);
});

test('semi-automatic weapons require a fresh trigger press', () => {
    const weapon = new Weapon({ automatic: false });

    assert.equal(weapon.shouldFire(true, true), true);
    assert.equal(weapon.shouldFire(true, false), false);
    assert.equal(weapon.shouldFire(false, false), false);
});

test('the static-hosted bundle uses the same trigger policy', async () => {
    const bundle = await readFile(new URL('../js/game-bundle.js', import.meta.url), 'utf8');

    assert.match(bundle, /shouldFire\(isTriggerHeld, isTriggerPressed\)/);
    assert.match(
        bundle,
        /weapon\?\.shouldFire\(this\.input\.isMouseDown\(0\), this\.input\.isMouseJustPressed\(0\)\)/
    );
});
