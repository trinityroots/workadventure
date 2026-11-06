import { get } from "svelte/store";
import { navChat } from "../../Chat/Stores/ChatStore";
import { chatVisibilityStore } from "../../Stores/ChatStore";
import GamePanel from "./GamePanel.svelte";

const OPEN_KEY = "wa-game-panel-open";

function readOpenPreference(): boolean {
    try {
        return localStorage.getItem(OPEN_KEY) !== "closed";
    } catch {
        return true;
    }
}

/** The game panel is a tab of the sidebar the chat and the users list also open. */
export function isGamePanelOpen(): boolean {
    if (!get(chatVisibilityStore)) return false;
    const tab = get(navChat);
    return tab.key === "externalModule" && tab.component === GamePanel;
}

export function openGamePanel(): void {
    navChat.switchToCustomComponent(GamePanel);
    chatVisibilityStore.set(true);
    try {
        localStorage.setItem(OPEN_KEY, "open");
    } catch {
        // Private mode: the panel simply opens every session.
    }
}

export function closeGamePanel(): void {
    if (isGamePanelOpen()) chatVisibilityStore.set(false);
    try {
        localStorage.setItem(OPEN_KEY, "closed");
    } catch {
        // Private mode: nothing to remember.
    }
}

/** Opens the panel on join unless the player closed it last time. */
export function restoreGamePanel(): void {
    if (readOpenPreference()) openGamePanel();
}
