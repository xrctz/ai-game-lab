import { Ally } from './Ally.js';

export class AllySquad {
    constructor(scene) {
        this.scene = scene;
        this.allies = [];
        this.lastCommand = null;
        this.commandCooldown = 0;
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
            }
        }

        for (const ally of this.allies) {
            ally.update(dt, playerPos, enemies, this.allies, this.lastCommand, gameState);
        }
    }

    issueCommand(command) {
        this.lastCommand = command;
        this.commandCooldown = 0.5;
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
    }
}
