import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { micState, conversationState, disableMicrophone } = vi.hoisted(() => {
    // Plain store fakes: vi.hoisted runs before the svelte/store import initializes.
    const makeStore = (initial: boolean) => {
        let value = initial;
        const subs = new Set<(v: boolean) => void>();
        return {
            subscribe(fn: (v: boolean) => void) {
                subs.add(fn);
                fn(value);
                return () => subs.delete(fn);
            },
            set(v: boolean) {
                value = v;
                subs.forEach((fn) => fn(v));
            },
        };
    };
    const micState = makeStore(true);
    return {
        micState,
        conversationState: makeStore(false),
        disableMicrophone: vi.fn(() => micState.set(false)),
    };
});

vi.mock("../../../src/front/Stores/MediaStore", () => ({
    requestedMicrophoneState: Object.assign(micState, { disableMicrophone }),
}));
vi.mock("../../../src/front/Stores/StreamableCollectionStore", () => ({
    isInActiveConversationStore: conversationState,
}));

import { onVisibility, onWindowFocusChange } from "../../../src/front/Stores/MicAutoMute";

describe("mic auto-mute on blur", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        micState.set(true);
        conversationState.set(false);
    });

    it("mutes an idle microphone when the window loses focus", () => {
        onWindowFocusChange(false);

        expect(disableMicrophone).toHaveBeenCalledTimes(1);
        expect(get(micState)).toBe(false);
    });

    it("keeps the microphone while a conversation is running", () => {
        conversationState.set(true);

        onWindowFocusChange(false);

        expect(disableMicrophone).not.toHaveBeenCalled();
    });

    it("does nothing when the window keeps focus", () => {
        onWindowFocusChange(true);

        expect(disableMicrophone).not.toHaveBeenCalled();
    });

    it("leaves an already-muted microphone alone", () => {
        micState.set(false);

        onWindowFocusChange(false);

        expect(disableMicrophone).not.toHaveBeenCalled();
    });

    it("mutes when the tab is hidden even though the window keeps focus", () => {
        onVisibility(false);

        expect(disableMicrophone).toHaveBeenCalledTimes(1);
    });

    it("keeps the microphone when the tab becomes visible again", () => {
        onVisibility(true);

        expect(disableMicrophone).not.toHaveBeenCalled();
    });
});
