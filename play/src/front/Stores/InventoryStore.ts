import { writable } from "svelte/store";
import type { EquipSlot } from "../Components/Inventory/items";

export interface InventoryItem {
    item: string;
    qty: number;
}

/** The player's drops, as returned by /api/game/monster/inventory. */
export const inventoryItemsStore = writable<InventoryItem[]>([]);

/** Slot → the drop key worn there. Kept local until the admin carries it (see InventoryLoader). */
export const equippedStore = writable<Partial<Record<EquipSlot, string>>>({});

export function equipItem(key: string, slot: EquipSlot): void {
    equippedStore.update((equipped) => ({ ...equipped, [slot]: key }));
}

export function unequipSlot(slot: EquipSlot): void {
    equippedStore.update((equipped) => {
        const next = { ...equipped };
        delete next[slot];
        return next;
    });
}
