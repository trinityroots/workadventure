import { describe, expect, it } from "vitest";
import { isIframeEventWrapper, isIframeResponseEvent } from "../../../src/front/Api/Events/IframeEvent";

describe("key down events", () => {
    it("accepts the iframe opt-in for key events", () => {
        expect(isIframeEventWrapper.safeParse({ type: "onKeyDown", data: undefined }).success).toBe(true);
    });

    it("accepts a key event sent to map scripts", () => {
        const parsed = isIframeResponseEvent.safeParse({
            type: "keyDownEvent",
            data: { key: "x", code: "KeyX", repeat: false },
        });
        expect(parsed.success).toBe(true);
    });

    it("rejects a key event without a key", () => {
        const parsed = isIframeResponseEvent.safeParse({
            type: "keyDownEvent",
            data: { code: "KeyX", repeat: false },
        });
        expect(parsed.success).toBe(false);
    });
});
