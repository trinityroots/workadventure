/** One NPC as the game service publishes it; shared by the stream and the chat UI. */
export interface NpcInfo {
    id: string;
    name: string;
    icon: string;
    kind: "knowledge" | "guide" | "shop" | "board";
    x: number;
    y: number;
    sprite: string;
    /** Spritesheet direction row; defaults to down. */
    facing?: "down" | "left" | "right" | "up";
    /** Opening line seeded as the first NPC message when the chat opens; chat NPCs only. */
    greeting?: string;
}
