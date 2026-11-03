import type { CalendarEventInterface } from "@workadventure/shared-utils";
import { flushSync, mount, tick, unmount } from "svelte";
import { readable } from "svelte/store";
import { describe, expect, it, vi } from "vitest";

import CalendarEventRow from "../../../../src/front/Components/Calendar/CalendarEventRow.svelte";

// Both pull in the Phaser game manager, which no test of this row needs.
vi.mock("../../../../src/front/Components/Calendar/CalendarJoinButton.svelte", () => ({ default: () => {} }));
vi.mock("../../../../src/i18n/i18n-svelte", () => {
    const locale = {
        externalModule: { calendar: { inProgress: () => "In progress", join: () => "Join", goThere: () => "Go" } },
    };
    return { default: readable(locale), locale: readable("en-US"), setLocale: () => undefined };
});

const NOW = new Date(2026, 9, 12, 10, 0);

const event: CalendarEventInterface = {
    id: "standup",
    title: "Standup",
    description: "Daily sync with the team",
    start: new Date(2026, 9, 12, 9, 0),
    end: new Date(2026, 9, 12, 9, 30),
};

describe("CalendarEventRow", () => {
    it("expands on the title and collapses on the chevron", async () => {
        const target = document.createElement("div");
        const component = mount(CalendarEventRow, { target, props: { event, now: NOW } });
        flushSync();

        const [title] = target.querySelectorAll<HTMLButtonElement>("button[aria-expanded]");
        expect(title.getAttribute("aria-expanded")).toBe("false");
        expect(target.textContent).not.toContain("Daily sync with the team");

        title.click();
        flushSync();
        expect(title.getAttribute("aria-expanded")).toBe("true");
        expect(target.textContent).toContain("Daily sync with the team");

        const chevron = target.querySelectorAll<HTMLButtonElement>("button[aria-expanded]")[1];
        chevron.click();
        await tick();
        expect(title.getAttribute("aria-expanded")).toBe("false");

        await unmount(component);
    });
});
