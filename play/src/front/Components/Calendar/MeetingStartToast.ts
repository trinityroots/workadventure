import type { CalendarEventInterface } from "@workadventure/shared-utils";

/** How long before a WorkAdventure meeting-room event the toast shows up. */
export const LEAD_MS = 5 * 60 * 1000;
/** How long it lingers after the event has started when nobody touches it. */
export const LINGER_MS = 2 * 60 * 1000;

/**
 * The meeting-room event to announce right now, if any: the first one whose window
 * [start - LEAD, start + LINGER) contains `now`, that has not been dismissed or joined.
 */
export function meetingStartToast(
    events: Iterable<CalendarEventInterface>,
    now: Date,
    dismissed: ReadonlySet<string>,
): CalendarEventInterface | undefined {
    const at = now.getTime();
    return [...events]
        .filter((event) => event.resource?.onlineMeeting?.isWorkAdventure && !dismissed.has(event.id))
        .filter(
            (event) =>
                at >= event.start.getTime() - LEAD_MS &&
                at < Math.min(event.start.getTime() + LINGER_MS, event.end.getTime()),
        )
        .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
}
