import type { CalendarEventInterface } from "@workadventure/shared-utils";
import { flushSync, mount, unmount } from "svelte";
import { readable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MeetingStartToast from "../../../../src/front/Components/Calendar/MeetingStartToast.svelte";
import { calendarEventsStore } from "../../../../src/front/Stores/CalendarStore";

const { openTab, setChatVisible, walkToMoveTarget, onMapExit } = vi.hoisted(() => ({
    openTab: vi.fn(),
    setChatVisible: vi.fn(),
    walkToMoveTarget: vi.fn(),
    onMapExit: vi.fn(() => Promise.resolve()),
}));

// Transitions need animation frames jsdom does not drive; keep the DOM removal synchronous.
vi.mock("svelte/transition", () => ({ fly: () => ({ duration: 0, css: () => "" }) }));
vi.mock("../../../../src/front/Api/ScriptUtils", () => ({ scriptUtils: { openTab } }));
vi.mock("../../../../src/front/Stores/ChatStore", () => ({ chatVisibilityStore: { set: setChatVisible } }));
vi.mock("../../../../src/front/Phaser/Game/GameManager", () => ({
    gameManager: { getCurrentGameScene: () => ({ walkToMoveTarget, onMapExit }) },
}));
vi.mock("../../../../src/front/Components/Calendar/useNow", () => ({
    now: readable(new Date(2026, 10, 25, 10, 0)),
}));
vi.mock("../../../../src/i18n/i18n-svelte", () => {
    const locale = {
        externalModule: {
            calendar: {
                join: () => "Join",
                goThere: () => "Go there",
                reminder: () => "Meeting reminder",
                dismissReminder: () => "Dismiss",
                startsNow: () => "Starts now",
                noLink: () => "No link",
            },
        },
    };
    return { default: readable(locale), locale: readable("en-US"), setLocale: () => undefined };
});

// jsdom has no Web Animations API; the fly transition needs Element.animate.
if (typeof Element !== "undefined" && typeof Element.prototype.animate !== "function") {
    Element.prototype.animate = () =>
        ({ finished: Promise.resolve(), cancel: () => undefined, onfinish: null }) as unknown as Animation;
}

function waEvent(): CalendarEventInterface {
    return {
        id: "standup",
        title: "Standup",
        description: "",
        start: new Date(2026, 10, 25, 10, 0),
        end: new Date(2026, 10, 25, 10, 30),
        resource: { onlineMeeting: { joinUrl: `${window.location.origin}/#Lounge`, isWorkAdventure: true } },
    };
}

function render(events: CalendarEventInterface[]) {
    calendarEventsStore.set(new Map(events.map((event) => [event.id, event])));
    const target = document.createElement("div");
    const component = mount(MeetingStartToast, { target });
    flushSync();
    return { target, component };
}

describe("MeetingStartToast", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        calendarEventsStore.set(new Map());
    });

    it("walks to the meeting room when Join is clicked, then dismisses the toast", async () => {
        const { target, component } = render([waEvent()]);

        const link = target.querySelector("a");
        expect(link).not.toBeNull();
        link?.click();
        flushSync();

        expect(walkToMoveTarget).toHaveBeenCalledWith("Lounge");
        expect(openTab).not.toHaveBeenCalled();

        // The dismissed event is dropped: the toast unmounts instead of coming back on the next tick.
        flushSync();
        expect(target.querySelector("a")).toBeNull();

        await unmount(component);
    });
});
