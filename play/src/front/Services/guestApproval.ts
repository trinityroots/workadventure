import { writable } from "svelte/store";
import { CORE_URL } from "../Enum/EnvironmentVariable";

export interface GuestHost {
    id: string;
    name: string;
}

export interface GuestInboxRequest {
    id: string;
    guestName: string;
    guestEmail: string;
    expiresAt: number;
}

export type GuestStatus = "pending" | "approved" | "declined" | "expired";

const AUTH_TOKEN_KEY = "authToken";
const INBOX_POLL_MS = 4000;

/** Requests waiting for the signed-in team member's answer. */
export const guestInboxStore = writable<GuestInboxRequest[]>([]);

/** True when the session token belongs to an external guest who has not been let in yet. */
export function isGuestPendingToken(token: string | null): boolean {
    if (!token) {
        return false;
    }
    try {
        const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(atob(base64)) as { guest?: string };
        return payload.guest === "pending";
    } catch {
        return false;
    }
}

export function storedAuthToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function storeAuthToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
}

async function coreFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${storedAuthToken() ?? ""}`);
    if (init.body) {
        headers.set("Content-Type", "application/json");
    }
    return fetch(`${CORE_URL}${path}`, { ...init, headers });
}

export async function fetchGuestHosts(): Promise<GuestHost[]> {
    const response = await coreFetch("/api/guest/hosts");
    if (!response.ok) {
        throw new Error(`Cannot load the team members (status ${response.status})`);
    }
    return ((await response.json()) as { hosts: GuestHost[] }).hosts;
}

export async function sendGuestRequest(
    hostId: string,
    guestName: string,
): Promise<"sent" | "already_pending" | "host_offline" | "invalid"> {
    const response = await coreFetch("/api/guest/requests", {
        method: "POST",
        body: JSON.stringify({ hostId, guestName }),
    });
    if (response.ok) {
        return "sent";
    }
    if (response.status === 409) {
        return "already_pending";
    }
    if (response.status === 404) {
        return "host_offline";
    }
    return "invalid";
}

export async function fetchGuestStatus(): Promise<{ status: GuestStatus; authToken?: string }> {
    const response = await coreFetch("/api/guest/requests/current");
    if (!response.ok) {
        throw new Error(`Cannot read the request status (status ${response.status})`);
    }
    return (await response.json()) as { status: GuestStatus; authToken?: string };
}

export async function fetchGuestInbox(): Promise<GuestInboxRequest[]> {
    const response = await coreFetch("/api/guest/inbox");
    if (!response.ok) {
        throw new Error(`Cannot read the guest inbox (status ${response.status})`);
    }
    return ((await response.json()) as { requests: GuestInboxRequest[] }).requests;
}

/**
 * Reloads the inbox. Returns false when the server does not offer the guest feature for this user
 * (not enabled, or not a team member), so the caller can stop polling.
 */
export async function refreshGuestInbox(): Promise<boolean> {
    if (!CORE_URL) {
        return false;
    }
    const response = await coreFetch("/api/guest/inbox");
    if (response.status === 404 || response.status === 403 || response.status === 401) {
        guestInboxStore.set([]);
        return false;
    }
    if (!response.ok) {
        throw new Error(`Cannot read the guest inbox (status ${response.status})`);
    }
    guestInboxStore.set(((await response.json()) as { requests: GuestInboxRequest[] }).requests);
    return true;
}

export async function answerGuestRequest(requestId: string, approve: boolean): Promise<boolean> {
    // Hide the request right away so it cannot be answered twice; a failed answer comes back with the next refresh.
    guestInboxStore.update((requests) => requests.filter((request) => request.id !== requestId));
    const response = await coreFetch(`/api/guest/inbox/${encodeURIComponent(requestId)}/answer`, {
        method: "POST",
        body: JSON.stringify({ approve }),
    });
    return response.ok;
}

let pollTimer: ReturnType<typeof setInterval> | undefined;

/** Checks for guests waiting at the door every few seconds. Stops by itself if the feature is unavailable. */
export function startGuestInboxPolling(): void {
    if (pollTimer) {
        return;
    }
    const poll = () => {
        refreshGuestInbox()
            .then((available) => {
                if (!available) {
                    stopGuestInboxPolling();
                }
            })
            .catch(() => undefined);
    };
    poll();
    pollTimer = setInterval(poll, INBOX_POLL_MS);
}

export function stopGuestInboxPolling(): void {
    if (pollTimer) {
        clearInterval(pollTimer);
    }
    pollTimer = undefined;
}
