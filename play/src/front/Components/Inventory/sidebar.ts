import { get } from "svelte/store";
import { navChat } from "../../Chat/Stores/ChatStore";
import { chatVisibilityStore } from "../../Stores/ChatStore";
import Inventory from "./Inventory.svelte";

export function isInventorySidebarOpen(): boolean {
    if (!get(chatVisibilityStore)) return false;
    const tab = get(navChat);
    return tab.key === "externalModule" && tab.component === Inventory;
}

export function openInventorySidebar(): void {
    navChat.switchToCustomComponent(Inventory);
    chatVisibilityStore.set(true);
}

export function closeInventorySidebar(): void {
    if (isInventorySidebarOpen()) chatVisibilityStore.set(false);
}
