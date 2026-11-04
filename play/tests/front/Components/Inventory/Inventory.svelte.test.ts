import { flushSync, mount, unmount } from "svelte";
import { readable } from "svelte/store";
import { afterEach, describe, expect, it, vi } from "vitest";

import Inventory from "../../../../src/front/Components/Inventory/Inventory.svelte";
import { equippedStore, inventoryItemsStore } from "../../../../src/front/Stores/InventoryStore";

// The loader pulls the session token out of Phaser, which no test of this panel needs.
vi.mock("../../../../src/front/Services/InventoryLoader", () => ({
    refreshInventory: vi.fn(() => Promise.resolve()),
    loadEquipment: vi.fn(() => Promise.resolve()),
    saveEquipment: vi.fn(() => Promise.resolve()),
}));
vi.mock("../../../../src/i18n/i18n-svelte", () => {
    const locale = {
        externalModule: {
            inventory: {
                title: () => "Inventory",
                itemCount: ({ count }: { count: number }) => `${count} items`,
                empty: () => "No loot yet",
                bag: () => "Bag",
            },
        },
    };
    return { default: readable(locale), locale: readable("en-US"), setLocale: () => undefined };
});

describe("Inventory", () => {
    afterEach(() => {
        inventoryItemsStore.set([]);
        equippedStore.set({});
    });

    it("shows a drop as an image cell with the quantity in the top-left corner", async () => {
        inventoryItemsStore.set([{ item: "slime_gel", qty: 5 }]);
        const target = document.createElement("div");
        const component = mount(Inventory, { target });
        flushSync();

        const cell = target.querySelector("[data-testid='bag-slime_gel']") as HTMLButtonElement;
        expect(cell).not.toBeNull();
        expect(cell.querySelector("img")?.getAttribute("src")).toBe("/static/images/items/item_goo.png");
        expect(cell.querySelector("img")?.getAttribute("alt")).toBe("Slime goo");
        expect(cell.querySelector("span")?.textContent?.trim()).toBe("5");

        await unmount(component);
    });

    it("falls back to the empty state", async () => {
        const target = document.createElement("div");
        const component = mount(Inventory, { target });
        flushSync();

        expect(target.textContent).toContain("No loot yet");

        await unmount(component);
    });

    it("moves gear from the bag into its slot when clicked, and back on unequip", async () => {
        inventoryItemsStore.set([{ item: "sword", qty: 1 }]);
        const target = document.createElement("div");
        const component = mount(Inventory, { target });
        flushSync();

        (target.querySelector("[data-testid='bag-sword']") as HTMLButtonElement).click();
        flushSync();
        expect(target.querySelector("[data-testid='slot-weapon']")).not.toBeNull();
        expect(target.querySelector("[data-testid='bag-sword']")).toBeNull();

        (target.querySelector("[data-testid='slot-weapon']") as HTMLButtonElement).click();
        flushSync();
        expect(target.querySelector("[data-testid='slot-weapon']")).toBeNull();
        expect(target.querySelector("[data-testid='bag-sword']")).not.toBeNull();

        await unmount(component);
    });
});
