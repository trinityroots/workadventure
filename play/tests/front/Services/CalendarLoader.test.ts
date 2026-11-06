import { describe, expect, it, vi } from "vitest";

import {
    calendarConnectUrl,
    consumeCalendarConnectedParam,
    toCalendarEvent,
    type AdminCalendarEvent,
} from "../../../src/front/Services/CalendarLoader";

// The loader only reads the session token from the game scene; Phaser has no place in this test.
vi.mock("../../../src/front/Phaser/Game/GameManager", () => ({ gameManager: {} }));
vi.mock("../../../src/front/Enum/EnvironmentVariable", () => ({ CORE_URL: "https://core.test" }));

const item = (extra: Partial<AdminCalendarEvent>): AdminCalendarEvent => ({
    id: "e1",
    summary: "Standup",
    start: { dateTime: "2026-11-12T10:00:00+07:00" },
    end: { dateTime: "2026-11-12T10:30:00+07:00" },
    ...extra,
});

describe("toCalendarEvent", () => {
    it("treats a link back to this play instance as a meeting room, and joins it in place", () => {
        const room = `${window.location.origin}/~/trinityroots/office.wam#moveTo=meeting`;
        const event = toCalendarEvent(item({ location: room }));

        expect(event.resource?.onlineMeeting).toEqual({ joinUrl: room, isWorkAdventure: true });
    });

    it("keeps a video call as the join link when there is no meeting room", () => {
        const event = toCalendarEvent(
            item({
                conferenceData: {
                    entryPoints: [{ uri: "https://meet.google.com/abc-defg-hij", entryPointType: "video" }],
                },
            }),
        );

        expect(event.resource?.onlineMeeting).toEqual({
            joinUrl: "https://meet.google.com/abc-defg-hij",
            isWorkAdventure: false,
        });
    });

    it("prefers the meeting room when the event has both", () => {
        const room = `${window.location.origin}/~/trinityroots/office.wam#moveTo=meeting`;
        const event = toCalendarEvent(
            item({
                location: room,
                conferenceData: {
                    entryPoints: [{ uri: "https://meet.google.com/abc-defg-hij", entryPointType: "video" }],
                },
            }),
        );

        expect(event.resource?.onlineMeeting?.joinUrl).toBe(room);
    });
});

describe("calendar connect", () => {
    it("points the connect flow at core and back to this origin", () => {
        expect(calendarConnectUrl()).toBe(
            `https://core.test/auth/google?return=${encodeURIComponent(window.location.origin)}`,
        );
    });

    it("strips the calendar=connected flag left by the connect flow", () => {
        history.replaceState({}, "", `/?calendar=connected&other=1`);

        consumeCalendarConnectedParam();

        const url = new URL(window.location.href);
        expect(url.searchParams.get("calendar")).toBeNull();
        expect(url.searchParams.get("other")).toBe("1");
        history.replaceState({}, "", "/");
    });
});
