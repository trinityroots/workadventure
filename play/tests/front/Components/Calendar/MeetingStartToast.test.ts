import type { CalendarEventInterface } from "@workadventure/shared-utils";
import { describe, expect, it } from "vitest";

import { LEAD_MS, LINGER_MS, meetingStartToast } from "../../../../src/front/Components/Calendar/MeetingStartToast";

function at(minutes: number, day = 12): Date {
    return new Date(2026, 9, day, 10, minutes);
}

function event(id: string, start: Date, end: Date, isWorkAdventure = true): CalendarEventInterface {
    return {
        id,
        title: id,
        description: "",
        start,
        end,
        resource: { onlineMeeting: { joinUrl: "https://play.test/room", isWorkAdventure } },
    };
}

const shown = (events: CalendarEventInterface[], now: Date, dismissed: string[] = []) =>
    meetingStartToast(events, now, new Set(dismissed))?.id;

describe("meetingStartToast", () => {
    const meeting = event("standup", at(5), at(35));

    it("announces a meeting-room event from five minutes before it starts", () => {
        expect(shown([meeting], new Date(at(5).getTime() - LEAD_MS))).toBe("standup");
        expect(shown([meeting], new Date(at(5).getTime() - LEAD_MS - 1))).toBeUndefined();
    });

    it("stays two minutes after the start, then goes", () => {
        expect(shown([meeting], new Date(at(5).getTime() + LINGER_MS - 1))).toBe("standup");
        expect(shown([meeting], new Date(at(5).getTime() + LINGER_MS))).toBeUndefined();
        expect(shown([meeting], at(35))).toBeUndefined();
    });

    it("skips events without a meeting room and dismissed or joined ones", () => {
        expect(shown([event("video", at(5), at(35), false)], at(5))).toBeUndefined();
        expect(shown([meeting], at(4), ["standup"])).toBeUndefined();
    });

    it("announces only the earliest of the events due at the same time", () => {
        expect(shown([event("second", at(6), at(36)), meeting], at(4))).toBe("standup");
    });
});
