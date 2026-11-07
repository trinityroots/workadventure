import { get, writable } from "svelte/store";
import { closeNpcChat } from "../../Services/npcList";
import { closeShop } from "../../Services/shop";
import { closeLeaderboard } from "../../Services/leaderboard";

/** The inventory is its own floating window, not a chat-sidebar tab. */
export const inventoryOpenStore = writable(false);

export function isInventoryOpen(): boolean {
    return get(inventoryOpenStore);
}

export function openInventory(): void {
    closeNpcChat();
    closeShop();
    closeLeaderboard();
    inventoryOpenStore.set(true);
}

export function closeInventory(): void {
    inventoryOpenStore.set(false);
}
