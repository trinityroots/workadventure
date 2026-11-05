import { CORE_URL } from "../Enum/EnvironmentVariable";
import { gameManager } from "../Phaser/Game/GameManager";

/** No request was sent: the admin is not configured, or the player has not joined yet. */
export class AdminUnavailableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = new.target.name;
    }
}

/** The admin answered with an error status. */
export class AdminHttpError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = new.target.name;
    }
}

let warnedAboutConfig = false;

/** The signed-in player's token, or undefined while the game scene is still starting. */
export function sessionToken(): string | undefined {
    try {
        return gameManager.getCurrentGameScene().connection?.userRoomToken;
    } catch {
        return undefined;
    }
}

/** Calls the admin API as the signed-in player and parses its JSON answer. */
export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!CORE_URL) {
        if (!warnedAboutConfig) {
            warnedAboutConfig = true;
            console.warn("CORE_URL is not configured, admin data stays empty");
        }
        throw new AdminUnavailableError("CORE_URL is not configured");
    }
    const token = sessionToken();
    if (!token) {
        throw new AdminUnavailableError("no session yet");
    }

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${CORE_URL}${path}`, { ...init, headers });
    if (!response.ok) {
        throw new AdminHttpError(`${path} failed with status ${response.status}`, response.status);
    }
    return (await response.json()) as T;
}
