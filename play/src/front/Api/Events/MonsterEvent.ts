import { z } from "zod";

const npcPayload = z.object({
    id: z.string().min(1),
    name: z.string(),
    icon: z.string(),
    kind: z.enum(["knowledge", "guide", "shop", "board"]),
    x: z.number(),
    y: z.number(),
    sprite: z.string(),
});

const spawnCommand = z.object({
    op: z.literal("spawn"),
    id: z.string().min(1),
    x: z.number(),
    y: z.number(),
    textureUrl: z.string().min(1),
    frameStart: z.number().optional(),
    name: z.string().optional(),
    hp: z.number().optional(),
    maxHp: z.number().optional(),
    npc: npcPayload.optional(),
});

const moveCommand = z.object({
    op: z.literal("move"),
    id: z.string().min(1),
    x: z.number(),
    y: z.number(),
});

const removeCommand = z.object({
    op: z.literal("remove"),
    id: z.string().min(1),
});

const hpCommand = z.object({
    op: z.literal("hp"),
    id: z.string().min(1),
    hp: z.number(),
    maxHp: z.number().optional(),
});

const damageCommand = z.object({
    op: z.literal("damage"),
    id: z.string().min(1),
    amount: z.number(),
});

/**
 * Commands sent from a map script to the game to render and move a monster (or NPC)
 * entity on the map, sharing one event so the front only needs a single subscription.
 */
export const monsterCommandSchema = z.discriminatedUnion("op", [
    spawnCommand,
    moveCommand,
    removeCommand,
    hpCommand,
    damageCommand,
]);

export type MonsterCommand = z.infer<typeof monsterCommandSchema>;
