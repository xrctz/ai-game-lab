import { Ally } from './Ally.js';

export class AllySquad {
    constructor(scene) {
        this.scene = scene;
        this.allies = [];
        this.lastCommand = null;
        this.commandCooldown = 0;
        this.focusTarget = null;
    }

    init() {
        const configs = [
            { name: 'REAPER', role: 'assault', color: 0x4488ff, formationAngle: Math.PI * 0.7, x: 3, z: 2 },
            { name: 'DOC', role: 'medic', color: 0x44cc44, formationAngle: -Math.PI * 0.7, x: -3, z: 2 },
            { name: 'HAVOC', role: 'support', color: 0xff8844, formationAngle: Math.PI, x: 0, z: 4 }
        ];

        for (const config of configs) {
            const ally = new Ally(config, this.scene);
            this.allies.push(ally);
        }
    }

    update(dt, playerPos, enemies, gameState) {
        if (this.commandCooldown > 0) {
            this.commandCooldown -= dt;
            if (this.commandCooldown <= 0) {
                this.lastCommand = null;
                this.focusTarget = null;
            }
        }

        if (this.lastCommand === 'focus') {
            this.focusTarget = this._pickFocusTarget(playerPos, enemies);
        }

        for (const ally of this.allies) {
            ally.update(dt, playerPos, enemies, this.allies, this.lastCommand, gameState, this.focusTarget);
        }
    }

    _pickFocusTarget(playerPos, enemies) {
        let best = null;
        let bestScore = Infinity;

        for (const enemy of enemies) {
            if (!enemy.alive || enemy.health <= 0) continue;
            const playerDist = playerPos.distanceTo(enemy.position);
            if (playerDist > 40) continue;

            let squadDist = 0;
            let squadCount = 0;
            for (const ally of this.allies) {
                if (!ally.alive || ally.downed) continue;
                squadDist += ally.position.distanceTo(enemy.position);
                squadCount++;
            }
            const avgSquadDist = squadCount > 0 ? squadDist / squadCount : playerDist;
            const score = playerDist * 0.55 + avgSquadDist * 0.45;

            if (score < bestScore) {
                bestScore = score;
                best = enemy;
            }
        }

        return best;
    }

    issueCommand(command) {
        this.lastCommand = command;
        this.commandCooldown = 0.5;
        if (command === 'focus') {
            this.focusTarget = null;
        }
    }

    getAliveAllies() {
        return this.allies.filter(a => a.alive && !a.downed);
    }

    getDownedAllies() {
        return this.allies.filter(a => a.downed && a.alive);
    }

    getAllAllies() {
        return this.allies;
    }

    reset() {
        const positions = [
            { x: 3, z: 2 },
            { x: -3, z: 2 },
            { x: 0, z: 4 }
        ];
        for (let i = 0; i < this.allies.length; i++) {
            this.allies[i].reset(positions[i].x, positions[i].z);
        }
        this.lastCommand = null;
        this.commandCooldown = 0;
        this.focusTarget = null;
    }
}
