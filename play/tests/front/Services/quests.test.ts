import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/front/Enum/EnvironmentVariable", () => ({ CORE_URL: "https://core.test" }));
vi.mock("../../../src/front/Services/adminFetch", () => ({ sessionToken: () => "token" }));

import { claimQuest, loadQuests, questsStore } from "../../../src/front/Services/quests";

const quest = {
    id: "q1",
    assignmentId: "a1",
    key: "daily-kill",
    title: "Clear the cellar",
    description: "Kill 3 things",
    giverNpcId: "hazel",
    type: "kill" as const,
    target: "*",
    count: 3,
    repeat: "daily" as const,
    rewardItem: null,
    rewardQty: 0,
    rewardGold: 50,
    status: "completed",
    progress: 3,
};

const achievement = {
    id: "ach1",
    key: "first_kill",
    title: "First blood",
    description: "",
    rewardGold: 10,
    unlocked: true,
    claimed: false,
};

beforeEach(() => {
    questsStore.set({ quests: [], achievements: [], loading: false, error: false });
    vi.restoreAllMocks();
});

describe("quests service", () => {
    it("loads quests and achievements", async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve(
                new Response(JSON.stringify({ quests: [quest], achievements: [achievement] }), { status: 200 }),
            ),
        );

        await loadQuests();

        const state = get(questsStore);
        expect(state.quests).toHaveLength(1);
        expect(state.achievements[0].key).toBe("first_kill");
        expect(state.loading).toBe(false);
    });

    it("flags an error when the service is unreachable", async () => {
        global.fetch = vi.fn(() => Promise.resolve(new Response("", { status: 503 })));

        await loadQuests();

        expect(get(questsStore).error).toBe(true);
    });

    it("claims a quest and reloads the list", async () => {
        const fetchMock = vi.fn((url: string) =>
            Promise.resolve(
                url.endsWith("/claim")
                    ? new Response(JSON.stringify({ ok: true }), { status: 200 })
                    : new Response(JSON.stringify({ quests: [], achievements: [] }), { status: 200 }),
            ),
        );
        global.fetch = fetchMock as unknown as typeof fetch;

        expect(await claimQuest("a1")).toBe(true);
        expect(fetchMock).toHaveBeenCalledWith(
            "https://core.test/api/game/quests/a1/claim",
            expect.objectContaining({ method: "POST" }),
        );
        expect(fetchMock).toHaveBeenCalledWith(
            "https://core.test/api/game/quests",
            expect.objectContaining({ method: "GET" }),
        );
    });
});
