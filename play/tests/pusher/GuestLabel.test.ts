import { describe, expect, it } from "vitest";
import { withGuestLabel } from "../../src/pusher/services/GuestLabel";

describe("withGuestLabel", () => {
    it("adds [Guest] after a guest's name", () => {
        expect(withGuestLabel("Anna Smith", true)).toBe("Anna Smith [Guest]");
    });

    it("leaves staff names unchanged", () => {
        expect(withGuestLabel("Mali", false)).toBe("Mali");
    });

    it("never adds the label twice, whatever the capitalisation", () => {
        expect(withGuestLabel("Anna [Guest]", true)).toBe("Anna [Guest]");
        expect(withGuestLabel("Anna [guest]", true)).toBe("Anna [Guest]");
    });

    it("trims stray spaces before adding the label", () => {
        expect(withGuestLabel("  Anna  ", true)).toBe("Anna [Guest]");
    });
});
