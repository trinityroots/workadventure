import type { CalendarEventInterface } from "@workadventure/shared-utils";
import { flushSync, mount, unmount } from "svelte";
import { readable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CalendarJoinButton from "../../../../src/front/Components/Calendar/CalendarJoinButton.svelte";

const { openTab, setChatVisible, walkToMoveTarget, onMapExit } = vi.hoisted(() => ({
    openTab: vi.fn(),
    setChatVisible: vi.fn(),
    walkToMoveTarget: vi.fn(),
    onMapExit: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../../../src/front/Api/ScriptUtils", () => ({ scriptUtils: { openTab } }));
vi.mock("../../../../src/front/Stores/ChatStore", () => ({ chatVisibilityStore: { set: setChatVisible } }));
vi.mock("../../../../src/front/Phaser/Game/GameManager", () => ({
    gameManager: { getCurrentGameScene: () => ({ walkToMoveTarget, onMapExit }) },
}));
vi.mock("../../../../src/i18n/i18n-svelte", () => {
    const locale = {
        externalModule: { calendar: { join: () => "Join", goThere: () => "Go there" } },
    };
    return { default: readable(locale), locale: readable("en-US"), setLocale: () => undefined };
});

function meeting(joinUrl: string, isWorkAdventure: boolean): CalendarEventInterface {
    return {
        id: "standup",
        title: "Standup",
        description: "",
        start: new Date(2026, 9, 12, 9, 0),
        end: new Date(2026, 9, 12, 9, 30),
        resource: { onlineMeeting: { joinUrl, isWorkAdventure } },
    };
}

function render(event: CalendarEventInterface, props: { prominent?: boolean; onjoin?: () => void } = {}) {
    const target = document.createElement("div");
    const component = mount(CalendarJoinButton, { target, props: { event, ...props } });
    flushSync();
    return { target, component };
}

describe("CalendarJoinButton", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("links a WorkAdventure room in place instead of opening a tab", async () => {
        const { target, component } = render(meeting("https://play.test/room", true), { prominent: true });

        const link = target.querySelector("a");
        expect(link?.getAttribute("href")).toBe("https://play.test/room");
        expect(link?.textContent).toContain("Go there");

        await unmount(component);
    });

    it("opens an external meeting in a new tab", async () => {
        const { target, component } = render(meeting("https://meet.google.com/abc-def", false));

        expect(target.querySelector("a")).toBeNull();
        const button = target.querySelector("button");
        expect(button?.getAttribute("aria-label")).toBe("Join · Standup");
        button?.click();

        expect(openTab).toHaveBeenCalledWith("https://meet.google.com/abc-def");

        await unmount(component);
    });

    it("labels a prominent external meeting as a join link", async () => {
        const { target, component } = render(meeting("https://meet.google.com/abc-def", false), { prominent: true });

        const link = target.querySelector("a");
        expect(link?.getAttribute("href")).toBe("https://meet.google.com/abc-def");
        expect(link?.textContent).toContain("Join");

        await unmount(component);
    });

    it("walks to a room in the current WorkAdventure map", async () => {
        const onjoin = vi.fn();
        const { target, component } = render(meeting(`${window.location.origin}/#moveTo=standup-area`, true), {
            onjoin,
        });

        target.querySelector("a")?.click();

        expect(walkToMoveTarget).toHaveBeenCalledWith("standup-area");
        expect(openTab).not.toHaveBeenCalled();
        expect(onjoin).toHaveBeenCalledTimes(1);

        await unmount(component);
    });

    it("walks to a bare-hash area name in the location (Google Calendar room links)", async () => {
        const onjoin = vi.fn();
        const { target, component } = render(meeting(`${window.location.origin}/#Lounge`, true), { onjoin });

        target.querySelector("a")?.click();

        expect(walkToMoveTarget).toHaveBeenCalledWith("Lounge");
        expect(openTab).not.toHaveBeenCalled();
        expect(onjoin).toHaveBeenCalledTimes(1);

        await unmount(component);
    });
});
