import { get } from "svelte/store";
import { ADMIN_URL } from "../Enum/EnvironmentVariable";
import { equippedStore, inventoryItemsStore, type InventoryItem } from "../Stores/InventoryStore";
import { gameManager } from "../Phaser/Game/GameManager";

function sessionToken(): string | undefined {
    return gameManager.getCurrentGameScene().connection?.userRoomToken;
}

function sessionHeaders(): Record<string, string> | undefined {
    const token = sessionToken();
    if (!token) return undefined;
    return { Authorization: `Bearer ${token}` };
}

let warnedAboutConfig = false;

function warnAboutConfig(): void {
    if (warnedAboutConfig) return;
    warnedAboutConfig = true;
    console.warn("Inventory: ADMIN_URL is not configured, the bag stays empty");
}

/** Pulls the signed-in player's drops from the admin and feeds the inventory store. */
export async function refreshInventory(): Promise<void> {
    if (!ADMIN_URL) {
        warnAboutConfig();
        return;
    }
    const headers = sessionHeaders();
    if (!headers) return;

    try {
        const response = await fetch(`${ADMIN_URL}/api/monsters/inventory`, { headers });
        if (!response.ok) {
            console.warn(`Inventory: request failed with status ${response.status}`);
            return;
        }
        const items = (await response.json()) as InventoryItem[];
        inventoryItemsStore.set(items.filter((entry) => entry.qty > 0));
    } catch (e) {
        console.error("Inventory: could not reach the admin", e);
    }
}

/** Pulls the saved equip map so worn items survive a reload. */
export async function loadEquipment(): Promise<void> {
    if (!ADMIN_URL) {
        warnAboutConfig();
        return;
    }
    const headers = sessionHeaders();
    if (!headers) return;

    try {
        const response = await fetch(`${ADMIN_URL}/api/monsters/equipment`, { headers });
        if (!response.ok) {
            console.warn(`Equipment: request failed with status ${response.status}`);
            return;
        }
        equippedStore.set((await response.json()) as Record<string, string>);
    } catch (e) {
        console.error("Equipment: could not reach the admin", e);
    }
}

/** Sends the whole equip map; a failed write keeps the local state and logs. */
export async function saveEquipment(): Promise<void> {
    if (!ADMIN_URL) {
        warnAboutConfig();
        return;
    }
    const headers = sessionHeaders();
    if (!headers) return;

    try {
        const response = await fetch(`${ADMIN_URL}/api/monsters/equipment`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ equipped: get(equippedStore) }),
        });
        if (!response.ok) console.warn(`Equipment: save failed with status ${response.status}`);
    } catch (e) {
        console.error("Equipment: could not reach the admin", e);
    }
}
