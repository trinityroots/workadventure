import { ADMIN_URL } from "../Enum/EnvironmentVariable";
import { inventoryItemsStore, type InventoryItem } from "../Stores/InventoryStore";
import { gameManager } from "../Phaser/Game/GameManager";

function sessionToken(): string | undefined {
    return gameManager.getCurrentGameScene().connection?.userRoomToken;
}

let warnedAboutConfig = false;

/** Pulls the signed-in player's drops from the admin and feeds the inventory store. */
export async function refreshInventory(): Promise<void> {
    if (!ADMIN_URL) {
        if (!warnedAboutConfig) {
            warnedAboutConfig = true;
            console.warn("Inventory: ADMIN_URL is not configured, the bag stays empty");
        }
        return;
    }
    const token = sessionToken();
    if (!token) return;

    try {
        const response = await fetch(`${ADMIN_URL}/api/monsters/inventory`, {
            headers: { Authorization: `Bearer ${token}` },
        });
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
