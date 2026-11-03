import type { CalendarEventInterface } from "@workadventure/shared-utils";
import { flushSync, mount, unmount } from "svelte";
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

function row(props: Partial<{ event: CalendarEventInterface; next: boolean; now: Date }> = {}) {
    const event: CalendarEventInterface = {
        id: "standup",
        title: "Standup",
        description: "Daily sync with the team",
        start: new Date(2026, 9, 12, 9, 0),
        end: new Date(2026, 9, 12, 9, 30),
    };
    const target = document.createElement("div");
    const component = mount(CalendarEventRow, { target, props: { event, now: NOW, ...props } });
    flushSync();
    return { target, component };
}

describe("CalendarEventRow", () => {
    it("renders the time chip, title and caption without an expand control", async () => {
        const { target, component } = row();

        expect(target.textContent).toContain("Standup");
        expect(target.textContent).toContain("30 min");
        expect(target.querySelector("button[aria-expanded]")).toBeNull();

        const title = target.querySelector("span.truncate") as HTMLElement;
        expect(title.className).toContain("font-bold");

        await unmount(component);
    });

    it("strikes through and dims a finished meeting", async () => {
        const { target, component } = row({
            event: {
                id: "past",
                title: "Retro",
                start: new Date(2026, 9, 12, 8, 0),
                end: new Date(2026, 9, 12, 8, 30),
            },
        });

        expect(target.querySelector("span.truncate")?.className).toContain("line-through");
        expect(target.querySelector(".opacity-60")).not.toBeNull();

        await unmount(component);
    });

    it("accents the next meeting's time", async () => {
        const { target, component } = row({ next: true });

        expect(target.querySelector(".text-light-blue")).not.toBeNull();

        await unmount(component);
    });
});
