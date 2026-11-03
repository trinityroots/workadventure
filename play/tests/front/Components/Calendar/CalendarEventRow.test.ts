import type { CalendarEventInterface } from "@workadventure/shared-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import CalendarEventRow from "../../../../src/front/Components/Calendar/CalendarEventRow.svelte";

vi.mock("../../../../src/i18n/i18n-svelte", async () => {
    const { readable } = await import("svelte/store");
    return {
        LL: readable({
            externalModule: {
                calendar: {
                    inProgress: () => "In progress",
                    join: () => "Join",
                    goThere: () => "Go there",
                },
            },
        }),
    };
});
vi.mock("../../../../src/front/Phaser/Game/GameManager", () => ({ gameManager: {} }));
vi.mock("../../../../src/front/Api/ScriptUtils", () => ({ scriptUtils: { openTab: vi.fn() } }));

describe("CalendarEventRow", () => {
    const target = document.createElement("div");
    let component: ReturnType<typeof mount> | undefined;

    afterEach(async () => {
        const mounted = component;
        component = undefined;
        if (mounted) await unmount(mounted, { outro: false });
        target.replaceChildren();
    });

    const event = {
        id: "standup",
        title: "Daily standup",
        description: "Bring blockers.",
        start: new Date(2026, 9, 12, 9, 0),
        end: new Date(2026, 9, 12, 9, 15),
    } satisfies CalendarEventInterface;

    it("expands in place on click and collapses again", () => {
        component = mount(CalendarEventRow, {
            target,
            intro: false,
            props: { event, now: new Date(2026, 9, 12, 8, 55) },
        });
        flushSync();

        const title = target.querySelector<HTMLButtonElement>('button[aria-label="Daily standup"]');
        expect(title?.getAttribute("aria-expanded")).toBe("false");
        expect(target.textContent).not.toContain("Bring blockers.");

        title?.click();
        flushSync();
        expect(title?.getAttribute("aria-expanded")).toBe("true");
        expect(target.textContent).toContain("Bring blockers.");

        title?.click();
        flushSync();
        expect(title?.getAttribute("aria-expanded")).toBe("false");
        expect(target.textContent).not.toContain("Bring blockers.");
    });
});
