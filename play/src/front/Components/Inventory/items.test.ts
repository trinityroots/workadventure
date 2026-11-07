import { describe, expect, it } from "vitest";
import { iconUrl, itemDef, statsText } from "./items";

// Mirrors workadventure-game/src/items.ts — ids the shop and drops actually use.
const CATALOG_IDS = [
    "rusty_sword",
    "iron_sword",
    "oak_staff",
    "leather_cap",
    "iron_helm",
    "cloth_robe",
    "chainmail",
    "work_gloves",
    "boots",
    "copper_ring",
    "flame_blade",
    "guardian_plate",
    "lucky_charm",
    "swift_flask",
    "fortune_tonic",
    "gold_draught",
];

describe("itemDef", () => {
    it("resolves every catalog id with stats and art", () => {
        for (const id of CATALOG_IDS) {
            const def = itemDef(id);
            expect(def.name, id).not.toBe(id);
            expect(iconUrl(def.icon)).toBe(`/static/images/items/${def.icon}.png`);
            if (def.slot) {
                expect(def.attack, id).toBeGreaterThan(0);
                expect(def.rollMax, id).toBeGreaterThan(0);
            } else {
                expect(def.potion, id).toBe(true);
            }
        }
    });

    it("lists the attack and reroll bonus in the tooltip", () => {
        expect(statsText(itemDef("iron_sword"))).toBe("Iron Sword — ATK 5, bonus +0-3");
        expect(statsText(itemDef("gold_draught"))).toBe("Gold Draught");
    });

    it("falls back to a bag icon for unknown drop keys", () => {
        expect(itemDef("mystery_item").icon).toBe("item_bag");
    });
});
