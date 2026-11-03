import { describe, expect, it, vi } from "vitest";

import { toCalendarEvent, type AdminCalendarEvent } from "../../../src/front/Services/CalendarLoader";

// The loader only reads the session token from the game scene; Phaser has no place in this test.
vi.mock("../../../src/front/Phaser/Game/GameManager", () => ({ gameManager: {} }));

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
