import { get } from "svelte/store";
import { equippedStore, inventoryItemsStore, type InventoryItem } from "../Stores/InventoryStore";
import { AdminUnavailableError, adminFetch } from "./adminFetch";

function report(context: string, error: unknown): void {
    if (error instanceof AdminUnavailableError) return;
    console.error(`${context}: could not reach the admin`, error);
}

/** Pulls the signed-in player's drops from the admin and feeds the inventory store. */
export async function refreshInventory(): Promise<void> {
    try {
        const items = await adminFetch<InventoryItem[]>("/api/monsters/inventory");
        inventoryItemsStore.set(items.filter((entry) => entry.qty > 0));
    } catch (error) {
        report("Inventory", error);
    }
}

/** Pulls the saved equip map so worn items survive a reload. */
export async function loadEquipment(): Promise<void> {
    try {
        equippedStore.set(await adminFetch<Record<string, string>>("/api/monsters/equipment"));
    } catch (error) {
        report("Equipment", error);
    }
}

/** Sends the whole equip map; a failed write keeps the local state and logs. */
export async function saveEquipment(): Promise<void> {
    try {
        await adminFetch("/api/monsters/equipment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ equipped: get(equippedStore) }),
        });
    } catch (error) {
        report("Equipment", error);
    }
}
