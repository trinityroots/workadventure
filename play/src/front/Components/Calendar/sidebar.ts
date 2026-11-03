import { get } from "svelte/store";
import { navChat } from "../../Chat/Stores/ChatStore";
import { chatVisibilityStore } from "../../Stores/ChatStore";
import Calendar from "./Calendar.svelte";

/** The agenda is a tab of the sidebar the chat and the users list also open, so only one of them shows at a time. */
export function isCalendarSidebarOpen(): boolean {
    if (!get(chatVisibilityStore)) return false;
    const tab = get(navChat);
    return tab.key === "externalModule" && tab.component === Calendar;
}

export function openCalendarSidebar(): void {
    navChat.switchToCustomComponent(Calendar);
    chatVisibilityStore.set(true);
}

export function closeCalendarSidebar(): void {
    if (isCalendarSidebarOpen()) chatVisibilityStore.set(false);
}
