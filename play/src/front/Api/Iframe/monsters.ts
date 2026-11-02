import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";

export interface MonsterSpawnOptions {
    id: string;
    x: number;
    y: number;
    textureUrl: string;
    frameStart?: number;
    name?: string;
    hp?: number;
    maxHp?: number;
}

/**
 * Renders and animates game entities (monsters and NPCs) natively in the game instead
 * of as map tiles, so they move smoothly, show a health bar and react to hits while
 * the player keeps keyboard focus.
 */
export class WorkadventureMonsterCommands extends IframeApiContribution<WorkadventureMonsterCommands> {
    callbacks = [];

    /**
     * Spawns a monster or NPC. The spritesheet must hold 32x32 frames.
     */
    spawn(options: MonsterSpawnOptions): void {
        sendToWorkadventure({ type: "monster", data: { op: "spawn", ...options } });
    }

    /**
     * Walks the entity toward a position (pixels), at a constant speed.
     */
    move(id: string, x: number, y: number): void {
        sendToWorkadventure({ type: "monster", data: { op: "move", id, x, y } });
    }

    setHp(id: string, hp: number, maxHp?: number): void {
        sendToWorkadventure({ type: "monster", data: { op: "hp", id, hp, maxHp } });
    }

    /**
     * Plays a floating damage number and reduces the health bar.
     */
    damage(id: string, amount: number): void {
        sendToWorkadventure({ type: "monster", data: { op: "damage", id, amount } });
    }

    remove(id: string): void {
        sendToWorkadventure({ type: "monster", data: { op: "remove", id } });
    }
}

export default new WorkadventureMonsterCommands();
