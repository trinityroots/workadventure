import { flushSync, mount, unmount } from "svelte";
import { readable } from "svelte/store";
import { describe, expect, it, vi } from "vitest";

import CalendarMonthGrid from "../../../../src/front/Components/Calendar/CalendarMonthGrid.svelte";

vi.mock("../../../../src/i18n/i18n-svelte", () => {
    const locale = {
        externalModule: {
            calendar: {
                previousMonth: () => "Previous month",
                nextMonth: () => "Next month",
                weekdays: {
                    sun: () => "Sun",
                    mon: () => "Mon",
                    tue: () => "Tue",
                    wed: () => "Wed",
                    thu: () => "Thu",
                    fri: () => "Fri",
                    sat: () => "Sat",
                },
            },
        },
    };
    return { default: readable(locale), locale: readable("en-US"), setLocale: () => undefined };
});

const today = new Date();
const month = new Date(today.getFullYear(), today.getMonth(), 1);
// Any day but today, so the today marker (ring) is not overridden by the selected style.
const selected = new Date(today.getFullYear(), today.getMonth(), today.getDate() === 1 ? 2 : 1);
const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

function grid() {
    const target = document.createElement("div");
    const component = mount(CalendarMonthGrid, {
        target,
        props: { events: [], selected, month, onmonth: vi.fn(), onselect: vi.fn() },
    });
    flushSync();
    return { target, component };
}

const dayButtons = (target: HTMLElement) => [...target.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")];
const inMonth = (button: HTMLButtonElement) => !button.className.includes("opacity-35");

describe("CalendarMonthGrid", () => {
    it("renders the weekday header Sunday first", async () => {
        const { target, component } = grid();

        const header = target.querySelectorAll("div.grid-cols-7")[0];
        expect([...header.querySelectorAll("span")].map((span) => span.textContent)).toEqual([
            "Sun",
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat",
        ]);

        await unmount(component);
    });

    it("lays out six weeks of seven cells", async () => {
        const { target, component } = grid();

        expect(dayButtons(target)).toHaveLength(42);

        await unmount(component);
    });

    it("marks today with the ring and no other cell", async () => {
        const { target, component } = grid();

        const current = dayButtons(target).filter((button) => button.getAttribute("aria-current") === "date");
        expect(current).toHaveLength(1);
        expect(current[0].className).toContain("ring-2");

        await unmount(component);
    });

    it("dims and disables the days outside the month", async () => {
        const { target, component } = grid();

        const buttons = dayButtons(target);
        const outside = buttons.filter((button) => !inMonth(button));
        expect(outside).toHaveLength(42 - daysInMonth);
        for (const button of outside) expect(button.disabled).toBe(true);
        for (const button of buttons.filter(inMonth)) expect(button.disabled).toBe(false);

        await unmount(component);
    });

    it("marks only the selected day as pressed", async () => {
        const { target, component } = grid();

        const pressed = dayButtons(target).filter((button) => button.getAttribute("aria-pressed") === "true");
        expect(pressed).toHaveLength(1);
        expect(pressed[0].className).toContain("bg-secondary");

        await unmount(component);
    });

    it("reports the clicked in-month day", async () => {
        const target = document.createElement("div");
        const onselect = vi.fn();
        const component = mount(CalendarMonthGrid, {
            target,
            props: { events: [], selected, month, onmonth: vi.fn(), onselect },
        });
        flushSync();

        const fifteenth = dayButtons(target).find((button) => inMonth(button) && button.textContent?.trim() === "15");
        expect(fifteenth).toBeDefined();
        fifteenth?.click();

        expect(onselect).toHaveBeenCalledTimes(1);
        const picked = onselect.mock.calls[0][0] as Date;
        expect(picked.getFullYear()).toBe(month.getFullYear());
        expect(picked.getMonth()).toBe(month.getMonth());
        expect(picked.getDate()).toBe(15);

        await unmount(component);
    });
});
