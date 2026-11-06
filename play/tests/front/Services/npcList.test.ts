import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

const player = { x: 0, y: 0 };

vi.mock("../../../src/front/Enum/EnvironmentVariable", () => ({ CORE_URL: "https://core.test" }));
vi.mock("../../../src/front/Services/adminFetch", () => ({ sessionToken: () => "token" }));
vi.mock("../../../src/front/Phaser/Game/GameManager", () => ({
    gameManager: { getCurrentGameScene: () => ({ CurrentPlayer: player }) },
}));

import {
    closeNpcChat,
    loadNpcList,
    nearestNpc,
    npcChatStore,
    npcListStore,
    openNpcChat,
    sendNpcMessage,
} from "../../../src/front/Services/npcList";

const rowan = {
    id: "rowan",
    name: "Elder Rowan",
    icon: "scroll",
    kind: "knowledge" as const,
    x: 10,
    y: 0,
    sprite: "resources/npcs/rowan.png",
};

beforeEach(() => {
    npcListStore.set([]);
    closeNpcChat();
    vi.restoreAllMocks();
});

describe("npc list and chat", () => {
    it("loads the cast into the store", async () => {
        global.fetch = vi.fn(() => Promise.resolve(new Response(JSON.stringify([rowan]), { status: 200 })));

        const list = await loadNpcList();

        expect(list).toHaveLength(1);
        expect(get(npcListStore)[0].id).toBe("rowan");
    });

    it("opens and closes a chat", () => {
        openNpcChat(rowan);

        expect(get(npcChatStore).npc?.id).toBe("rowan");

        closeNpcChat();

        expect(get(npcChatStore).npc).toBeNull();
    });

    it("appends both sides of a sent message", async () => {
        openNpcChat(rowan);
        global.fetch = vi.fn(() =>
            Promise.resolve(new Response(JSON.stringify({ reply: "hello", sources: [] }), { status: 200 })),
        );

        await sendNpcMessage("hi there");

        const state = get(npcChatStore);
        expect(state.sending).toBe(false);
        expect(state.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
        expect(state.messages[1].content).toBe("hello");
    });

    it("records an error when the NPC cannot be reached", async () => {
        openNpcChat(rowan);
        global.fetch = vi.fn(() => Promise.resolve(new Response("nope", { status: 503 })));

        await sendNpcMessage("hi");

        const state = get(npcChatStore);
        expect(state.error).toBe("error");
        expect(state.sending).toBe(false);
    });

    it("picks the nearest NPC inside the range only", () => {
        npcListStore.set([rowan, { ...rowan, id: "far", x: 9999 }]);

        expect(nearestNpc(120)?.id).toBe("rowan");
        expect(nearestNpc(5)).toBeNull();
    });
});
