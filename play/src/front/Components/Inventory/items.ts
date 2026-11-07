export type EquipSlot = "head" | "chest" | "hands" | "weapon" | "ring" | "feet";

export interface ItemDef {
    name: string;
    /** Where the item sits on the character; materials have no slot. */
    slot?: EquipSlot;
    icon: string;
    /** Gear only: attack contribution and reroll ceiling for Moss. */
    attack?: number;
    rollMax?: number;
    /** Consumed from the bag with a click instead of worn. */
    potion?: boolean;
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
    // Catalog mirrors workadventure-game/src/items.ts — ids, names and stats must match.
    rusty_sword: { name: "Rusty Sword", slot: "weapon", attack: 2, rollMax: 1, icon: "rusty_sword" },
    iron_sword: { name: "Iron Sword", slot: "weapon", attack: 5, rollMax: 3, icon: "iron_sword" },
    oak_staff: { name: "Oak Staff", slot: "weapon", attack: 4, rollMax: 2, icon: "oak_staff" },
    leather_cap: { name: "Leather Cap", slot: "head", attack: 1, rollMax: 1, icon: "leather_cap" },
    iron_helm: { name: "Iron Helm", slot: "head", attack: 3, rollMax: 2, icon: "iron_helm" },
    cloth_robe: { name: "Cloth Robe", slot: "chest", attack: 2, rollMax: 1, icon: "cloth_robe" },
    chainmail: { name: "Chainmail", slot: "chest", attack: 5, rollMax: 3, icon: "chainmail" },
    work_gloves: { name: "Work Gloves", slot: "hands", attack: 1, rollMax: 1, icon: "work_gloves" },
    boots: { name: "Trail Boots", slot: "feet", attack: 1, rollMax: 1, icon: "boots" },
    copper_ring: { name: "Copper Ring", slot: "ring", attack: 1, rollMax: 1, icon: "copper_ring" },
    flame_blade: { name: "Flame Blade", slot: "weapon", attack: 9, rollMax: 5, icon: "flame_blade" },
    guardian_plate: { name: "Guardian Plate", slot: "chest", attack: 8, rollMax: 4, icon: "guardian_plate" },
    lucky_charm: { name: "Lucky Charm", slot: "ring", attack: 4, rollMax: 3, icon: "lucky_charm" },
    swift_flask: { name: "Swift Flask", icon: "swift_flask", potion: true },
    fortune_tonic: { name: "Fortune Tonic", icon: "fortune_tonic", potion: true },
    gold_draught: { name: "Gold Draught", icon: "gold_draught", potion: true },
    // Legacy drop keys still in circulation from earlier batches.
    sword: { name: "Iron sword", slot: "weapon", attack: 5, rollMax: 3, icon: "iron_sword" },
    helmet: { name: "Iron helm", slot: "head", attack: 3, rollMax: 2, icon: "iron_helm" },
    helm: { name: "Iron helm", slot: "head", attack: 3, rollMax: 2, icon: "iron_helm" },
    armor: { name: "Chainmail", slot: "chest", attack: 5, rollMax: 3, icon: "chainmail" },
    ring: { name: "Copper ring", slot: "ring", attack: 1, rollMax: 1, icon: "copper_ring" },
    gloves: { name: "Leather gloves", slot: "hands", attack: 1, rollMax: 1, icon: "work_gloves" },
    potion: { name: "Health potion", icon: "item_potion", potion: true },
    health_potion: { name: "Health potion", icon: "item_potion", potion: true },
    gem: { name: "Blue gem", icon: "item_gem" },
    crystal: { name: "Blue gem", icon: "item_gem" },
    goo: { name: "Slime goo", icon: "item_goo" },
    slime: { name: "Slime goo", icon: "item_goo" },
    slime_gel: { name: "Slime goo", icon: "item_goo" },
};

/** Tooltip line: "Iron Sword — ATK 5, bonus +0-3". */
export function statsText(def: ItemDef): string {
    if (def.attack === undefined) return def.name;
    const bonus = def.rollMax !== undefined ? `, bonus +0-${def.rollMax}` : "";
    return `${def.name} — ATK ${def.attack}${bonus}`;
}

function prettify(key: string): string {
    const words = key.replace(/[_-]+/g, " ").trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Drop keys are typed by hand in the admin, so lookup is case-insensitive. */
export function itemDef(key: string): ItemDef {
    return ITEMS[key.trim().toLowerCase()] ?? { name: prettify(key), icon: "item_bag" };
}

export function iconUrl(icon: string): string {
    // v8: pack swap to Pixel-RPG-icons — bumps past the game-icons.net art.
    return `/static/images/items/${icon}.png?v=8`;
}
