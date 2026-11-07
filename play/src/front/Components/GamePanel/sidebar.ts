import { get, writable } from "svelte/store";

const OPEN_KEY = "wa-game-panel-open";

function readOpenPreference(): boolean {
    try {
        return localStorage.getItem(OPEN_KEY) !== "closed";
    } catch {
        return true;
    }
}

function persist(open: boolean): void {
    try {
        localStorage.setItem(OPEN_KEY, open ? "open" : "closed");
    } catch {
        // Private mode: the panel simply opens every session.
    }
}

/** The quest tracker is a standalone right-edge panel, not a chat-sidebar tab. */
export const gamePanelOpenStore = writable(readOpenPreference());

export function isGamePanelOpen(): boolean {
    return get(gamePanelOpenStore);
}

export function openGamePanel(): void {
    gamePanelOpenStore.set(true);
    persist(true);
}

export function closeGamePanel(): void {
    gamePanelOpenStore.set(false);
    persist(false);
}

/** Shows the tracker on join unless the player closed it last time. */
export function restoreGamePanel(): void {
    gamePanelOpenStore.set(readOpenPreference());
}
