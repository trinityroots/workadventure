import { writable } from "svelte/store";

export interface InventoryItem {
    item: string;
    qty: number;
}

/** The player's drops, as returned by the admin's /api/monsters/inventory. */
export const inventoryItemsStore = writable<InventoryItem[]>([]);
