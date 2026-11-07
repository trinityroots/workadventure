import { describe, expect, it } from "vitest";
import { playSfx } from "./gameSfx";

describe("playSfx", () => {
    it("is a safe no-op for every effect without WebAudio", () => {
        for (const name of ["open", "close", "click", "fanfare", "npcPop", "ding", "hit", "coin", "wave"] as const) {
            expect(() => playSfx(name)).not.toThrow();
        }
    });
});
