import { flushSync, mount, unmount } from "svelte";
import { readable } from "svelte/store";
import { afterEach, describe, expect, it, vi } from "vitest";

import Inventory from "../../../../src/front/Components/Inventory/Inventory.svelte";
import { inventoryItemsStore } from "../../../../src/front/Stores/InventoryStore";

// The loader pulls the session token out of Phaser, which no test of this panel needs.
vi.mock("../../../../src/front/Services/InventoryLoader", () => ({ refreshInventory: vi.fn(() => Promise.resolve()) }));
vi.mock("../../../../src/i18n/i18n-svelte", () => {
    const locale = {
        externalModule: {
            inventory: {
                title: () => "Inventory",
                itemCount: ({ count }: { count: number }) => `${count} items`,
                empty: () => "No loot yet",
            },
        },
    };
    return { default: readable(locale), locale: readable("en-US"), setLocale: () => undefined };
});

describe("Inventory", () => {
    afterEach(() => {
        inventoryItemsStore.set([]);
    });

    it("lists each drop with its quantity, in a readable name", async () => {
        inventoryItemsStore.set([
            { item: "slime_gel", qty: 3 },
            { item: "bat-wing", qty: 1 },
        ]);
        const target = document.createElement("div");
        const component = mount(Inventory, { target });
        flushSync();

        expect(target.textContent).toContain("Slime gel");
        expect(target.textContent).toContain("Bat wing");
        expect(target.textContent).toContain("3");
        expect(target.textContent).not.toContain("No loot yet");

        await unmount(component);
    });

    it("falls back to the empty state", async () => {
        const target = document.createElement("div");
        const component = mount(Inventory, { target });
        flushSync();

        expect(target.textContent).toContain("No loot yet");

        await unmount(component);
    });
});
