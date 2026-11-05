import { describe, expect, it, vi } from "vitest";

import {
    monsterEventSnapshot,
    monsterSnapshotCommands,
    nearestWithin,
    type MonsterSnapshot,
} from "../../../src/front/Services/monsterStream";

// The service only reads the session token from the game scene; Phaser has no place in this test.
vi.mock("../../../src/front/Phaser/Game/GameManager", () => ({ gameManager: {} }));

const TEXTURE_URL = "https://maps.example/tilesets/WA_Monsters.png";

const monster = (id: string, extra: Partial<MonsterSnapshot> = {}): MonsterSnapshot => ({
    id,
    x: 0,
    y: 0,
    name: id,
    sprite: "slime",
    hp: 100,
    maxHp: 100,
    ...extra,
});

const previous = (...monsters: MonsterSnapshot[]): Map<string, MonsterSnapshot> =>
    new Map(monsters.map((entry) => [entry.id, entry]));

describe("monsterSnapshotCommands", () => {
    it("spawns ids the scene does not know yet", () => {
        expect(monsterSnapshotCommands(new Map(), [monster("a", { x: 32, y: 64 })], TEXTURE_URL)).toEqual([
            {
                op: "spawn",
                id: "a",
                x: 32,
                y: 64,
                name: "a",
                hp: 100,
                maxHp: 100,
                textureUrl: TEXTURE_URL,
                frameStart: 0,
            },
        ]);
    });

    it("picks the spritesheet frame from the monster sprite", () => {
        const [command] = monsterSnapshotCommands(new Map(), [monster("a", { sprite: "goblin" })], TEXTURE_URL);

        expect(command).toMatchObject({ op: "spawn", frameStart: 2 });
    });

    it("emits nothing for an unchanged snapshot", () => {
        expect(monsterSnapshotCommands(previous(monster("a")), [monster("a")], TEXTURE_URL)).toEqual([]);
    });

    it("moves ids whose position changed", () => {
        expect(monsterSnapshotCommands(previous(monster("a")), [monster("a", { x: 10, y: 20 })], TEXTURE_URL)).toEqual([
            { op: "move", id: "a", x: 10, y: 20 },
        ]);
    });

    it("updates ids whose health changed", () => {
        expect(monsterSnapshotCommands(previous(monster("a")), [monster("a", { hp: 40 })], TEXTURE_URL)).toEqual([
            { op: "hp", id: "a", hp: 40, maxHp: 100 },
        ]);
    });

    it("removes ids missing from the snapshot", () => {
        expect(monsterSnapshotCommands(previous(monster("a"), monster("b")), [monster("b")], TEXTURE_URL)).toEqual([
            { op: "remove", id: "a" },
        ]);
    });
});

describe("monsterEventSnapshot", () => {
    it("parses the snapshot carried by a data block", () => {
        expect(monsterEventSnapshot('event: monsters\ndata: [{"id":"a","x":1,"y":2}]')).toEqual([
            { id: "a", x: 1, y: 2 },
        ]);
    });

    it("ignores heartbeat blocks", () => {
        expect(monsterEventSnapshot(": ping")).toBeUndefined();
    });

    it("ignores malformed payloads instead of throwing", () => {
        expect(monsterEventSnapshot("data: not-json")).toBeUndefined();
    });
});

describe("nearestWithin", () => {
    it("returns null when there are no monsters", () => {
        expect(nearestWithin([], 0, 0, 100)).toBeNull();
    });

    it("picks the closest monster inside the distance", () => {
        const monsters = [monster("far", { x: 40 }), monster("near", { x: 10 })];
        expect(nearestWithin(monsters, 0, 0, 48)?.id).toBe("near");
    });

    it("ignores monsters outside the distance", () => {
        expect(nearestWithin([monster("a", { x: 200 })], 0, 0, 48)).toBeNull();
    });

    it("includes a monster exactly on the boundary", () => {
        expect(nearestWithin([monster("a", { x: 48 })], 0, 0, 48)?.id).toBe("a");
    });
});
