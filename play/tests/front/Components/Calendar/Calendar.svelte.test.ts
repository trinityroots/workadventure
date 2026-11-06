import { flushSync, mount, unmount } from "svelte";
import { readable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Calendar from "../../../../src/front/Components/Calendar/Calendar.svelte";
import { calendarEventsStore, isActivatedStore } from "../../../../src/front/Stores/CalendarStore";

vi.mock("../../../../src/front/Enum/EnvironmentVariable", () => ({ CORE_URL: "https://core.test" }));
vi.mock("../../../../src/front/Stores/MenuStore", () => ({ userIsConnected: readable(true) }));
vi.mock("../../../../src/front/Services/CalendarLoader", () => ({ refreshCalendar: vi.fn() }));
vi.mock("../../../../src/front/Administration/AnalyticsClient", () => ({
    analyticsClient: { trackAdminEvent: vi.fn() },
}));
vi.mock("../../../../src/front/Stores/Utils/externalSvelteComponentService", () => ({
    externalSvelteComponentService: { getComponentsByZone: () => readable(new Set()) },
}));
vi.mock("../../../../src/front/Components/Calendar/useNow", () => ({
    now: readable(new Date(2026, 10, 6, 10, 0)),
}));
vi.mock("../../../../src/front/Components/Calendar/CalendarMonthGrid.svelte", () => ({ default: () => {} }));
vi.mock("../../../../src/front/Components/Calendar/CalendarEventRow.svelte", () => ({ default: () => {} }));
vi.mock("../../../../src/front/Components/Calendar/CalendarOverlapGroup.svelte", () => ({ default: () => {} }));
vi.mock("../../../../src/i18n/i18n-svelte", () => {
    const locale = {
        externalModule: {
            calendar: {
                title: () => "Calendar",
                today: () => "Today",
                refresh: () => "Refresh",
                noMeetings: () => "No meetings",
                connect: () => "Connect Google Calendar",
            },
        },
        menu: { profile: { login: () => "Login" } },
    };
    return { default: readable(locale), locale: readable("en-US"), setLocale: () => undefined };
});

function render() {
    const target = document.createElement("div");
    const component = mount(Calendar, { target });
    flushSync();
    return { target, component };
}

describe("Calendar", () => {
    beforeEach(() => {
        calendarEventsStore.set(new Map());
        isActivatedStore.set(false);
    });

    it("offers the calendar connect flow while the player's calendar is not connected", async () => {
        const { target, component } = render();

        const connect = Array.from(target.querySelectorAll("button")).find((button) =>
            button.textContent?.includes("Connect Google Calendar"),
        );
        expect(connect).toBeDefined();

        await unmount(component);
    });

    it("hides the connect button once the calendar is connected", async () => {
        isActivatedStore.set(true);
        const { target, component } = render();

        expect(target.textContent).not.toContain("Connect Google Calendar");

        await unmount(component);
    });
});
