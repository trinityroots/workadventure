export type EquipSlot = "head" | "chest" | "hands" | "weapon" | "ring" | "feet";

export interface ItemDef {
    name: string;
    /** Where the item sits on the character; materials have no slot. */
    slot?: EquipSlot;
    icon: string;
}

/** The slot chips around the character, left column first. */
export const EQUIP_SLOTS: { slot: EquipSlot; icon: string }[] = [
    { slot: "head", icon: "item_helmet" },
    { slot: "chest", icon: "item_armor" },
    { slot: "feet", icon: "item_boots" },
    { slot: "weapon", icon: "item_sword" },
    { slot: "ring", icon: "item_ring" },
    { slot: "hands", icon: "item_gloves" },
];

const ITEMS: Record<string, ItemDef> = {
    gold: { name: "Gold", icon: "item_gold" },
    coin: { name: "Gold", icon: "item_gold" },
    sword: { name: "Iron sword", slot: "weapon", icon: "item_sword" },
    iron_sword: { name: "Iron sword", slot: "weapon", icon: "item_sword" },
    helmet: { name: "Iron helm", slot: "head", icon: "item_helmet" },
    helm: { name: "Iron helm", slot: "head", icon: "item_helmet" },
    armor: { name: "Chainmail", slot: "chest", icon: "item_armor" },
    chainmail: { name: "Chainmail", slot: "chest", icon: "item_armor" },
    boots: { name: "Leather boots", slot: "feet", icon: "item_boots" },
    ring: { name: "Copper ring", slot: "ring", icon: "item_ring" },
    gloves: { name: "Leather gloves", slot: "hands", icon: "item_gloves" },
    potion: { name: "Health potion", icon: "item_potion" },
    health_potion: { name: "Health potion", icon: "item_potion" },
    gem: { name: "Blue gem", icon: "item_gem" },
    crystal: { name: "Blue gem", icon: "item_gem" },
    goo: { name: "Slime goo", icon: "item_goo" },
    slime: { name: "Slime goo", icon: "item_goo" },
    slime_gel: { name: "Slime goo", icon: "item_goo" },
};

function prettify(key: string): string {
    const words = key.replace(/[_-]+/g, " ").trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Drop keys are typed by hand in the admin, so lookup is case-insensitive. */
export function itemDef(key: string): ItemDef {
    return ITEMS[key.trim().toLowerCase()] ?? { name: prettify(key), icon: "item_bag" };
}

export function iconUrl(icon: string): string {
    return `/static/images/items/${icon}.png`;
}
