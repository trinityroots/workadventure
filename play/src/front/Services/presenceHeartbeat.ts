import { CORE_URL } from "../Enum/EnvironmentVariable";
import { sessionToken } from "./adminFetch";

const HEARTBEAT_MS = 60_000;

let timer: ReturnType<typeof setInterval> | undefined;

function post(path: string): void {
    const token = sessionToken();
    if (!token) return;
    fetch(`${CORE_URL}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        keepalive: true,
    }).catch(() => undefined);
}

/** Keeps core's player_sessions current: join on first beat, duration from beats, leave on unload. */
export function startPresenceHeartbeat(): void {
    if (timer) return;
    post("/api/session/heartbeat");
    timer = setInterval(() => post("/api/session/heartbeat"), HEARTBEAT_MS);
    window.addEventListener("pagehide", onPageHide);
}

export function stopPresenceHeartbeat(): void {
    if (timer) {
        clearInterval(timer);
        timer = undefined;
    }
    window.removeEventListener("pagehide", onPageHide);
}

function onPageHide(): void {
    post("/api/session/leave");
}
