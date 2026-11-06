import type { CalendarEventInterface } from "@workadventure/shared-utils";
import { calendarEventsStore, isActivatedStore } from "../Stores/CalendarStore";
import { CORE_URL } from "../Enum/EnvironmentVariable";
import { AdminHttpError, AdminUnavailableError, adminFetch, sessionToken } from "./adminFetch";

const REFRESH_MS = 5 * 60 * 1000;
const RETRY_MS = 5_000;
const MAX_RETRIES = 12;

/** Google Calendar event as returned by the admin's /api/calendar/events. */
export interface AdminCalendarEvent {
    id: string;
    status?: string;
    summary?: string;
    description?: string;
    location?: string;
    htmlLink?: string;
    start: { date?: string; dateTime?: string };
    end: { date?: string; dateTime?: string };
    conferenceData?: { entryPoints?: { uri?: string; entryPointType?: string }[] };
}

/** A link back to this play instance: the event takes place in a meeting room of this world. */
function isWorkAdventureUrl(url: string): boolean {
    try {
        return new URL(url).origin === window.location.origin;
    } catch {
        return false;
    }
}

export function toCalendarEvent(item: AdminCalendarEvent): CalendarEventInterface {
    const startValue = item.start.dateTime || item.start.date;
    const endValue = item.end.dateTime || item.end.date;
    const videoUrl = item.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri;
    // A meeting-room event points at the map area itself; it wins over any video call also attached.
    const roomUrl = item.location && isWorkAdventureUrl(item.location) ? item.location : undefined;
    const joinUrl = roomUrl || videoUrl || item.htmlLink;

    return {
        id: item.id,
        title: item.summary || "(untitled)",
        description: item.description || "",
        start: new Date(startValue || Date.now()),
        end: new Date(endValue || Date.now()),
        allDay: Boolean(item.start.date),
        resource: joinUrl ? { onlineMeeting: { joinUrl, isWorkAdventure: Boolean(roomUrl) } } : undefined,
    };
}

/** Pulls the signed-in player's calendar from the admin and feeds the shared store. */
export async function refreshCalendar(): Promise<void> {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    from.setDate(from.getDate() - 7);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 8);

    try {
        const data = await adminFetch<{ items?: AdminCalendarEvent[] }>(
            `/api/calendar/events?${new URLSearchParams({
                timeMin: from.toISOString(),
                timeMax: to.toISOString(),
                maxResults: "250",
            })}`,
        );
        const events = (data.items || []).filter((item) => item.status !== "cancelled").map(toCalendarEvent);
        calendarEventsStore.set(new Map(events.map((event) => [event.id, event])));
        isActivatedStore.set(true);
    } catch (error) {
        // 409 means the player has not connected Google yet: keep the panel out of the way.
        if (error instanceof AdminHttpError && error.status === 409) {
            calendarEventsStore.set(new Map());
            isActivatedStore.set(false);
            return;
        }
        if (error instanceof AdminUnavailableError) return;
        console.warn("Could not load the calendar", error);
    }
}

/** Starts the Google connect flow on core and returns to this origin flagged as connected. */
export function calendarConnectUrl(): string {
    return `${CORE_URL}/auth/google?return=${encodeURIComponent(window.location.origin)}`;
}

/** Drops the calendar=connected flag the connect flow appends when it redirects back. */
export function consumeCalendarConnectedParam(): void {
    const url = new URL(window.location.href);
    if (url.searchParams.get("calendar") !== "connected") return;
    url.searchParams.delete("calendar");
    history.replaceState(history.state, "", url);
}

let started = false;

/** Keeps the calendar fresh for the whole session; retries while the player is still joining. */
export function startCalendarLoader(): void {
    if (started) return;
    started = true;

    consumeCalendarConnectedParam();

    let retries = 0;

    const tick = async () => {
        await refreshCalendar();
        if (retries < MAX_RETRIES && !sessionToken()) {
            retries += 1;
            setTimeout(() => {
                tick().catch(() => undefined);
            }, RETRY_MS);
        }
    };

    tick().catch(() => undefined);
    setInterval(() => {
        refreshCalendar().catch(() => undefined);
    }, REFRESH_MS);
}
