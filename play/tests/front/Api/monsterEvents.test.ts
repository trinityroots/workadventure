import { describe, expect, it } from "vitest";
import { isIframeEventWrapper } from "../../../src/front/Api/Events/IframeEvent";

describe("monster commands", () => {
    it("accepts spawning a monster", () => {
        const parsed = isIframeEventWrapper.safeParse({
            type: "monster",
            data: {
                op: "spawn",
                id: "goblin-1",
                x: 640,
                y: 672,
                textureUrl: "/monsters.png",
                name: "Goblin",
                hp: 60,
                maxHp: 60,
            },
        });
        expect(parsed.success).toBe(true);
    });

    it("accepts moving, damaging and removing a monster", () => {
        expect(
            isIframeEventWrapper.safeParse({ type: "monster", data: { op: "move", id: "goblin-1", x: 672, y: 640 } })
                .success,
        ).toBe(true);
        expect(
            isIframeEventWrapper.safeParse({ type: "monster", data: { op: "damage", id: "goblin-1", amount: 12 } })
                .success,
        ).toBe(true);
        expect(
            isIframeEventWrapper.safeParse({ type: "monster", data: { op: "remove", id: "goblin-1" } }).success,
        ).toBe(true);
    });

    it("rejects a spawn without an id", () => {
        const parsed = isIframeEventWrapper.safeParse({
            type: "monster",
            data: { op: "spawn", x: 640, y: 672, textureUrl: "/monsters.png" },
        });
        expect(parsed.success).toBe(false);
    });
});
