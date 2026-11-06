import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/front/Enum/EnvironmentVariable", () => ({ CORE_URL: "https://core.test" }));
vi.mock("../../../src/front/Services/adminFetch", () => ({ sessionToken: () => "token" }));

import {
    acceptTrade,
    openTradePanel,
    setTradeOffer,
    startTradePolling,
    stopTradePolling,
    tradeStore,
} from "../../../src/front/Services/trade";

const trade = {
    id: "t1",
    fromUser: "me@t.dev",
    toUser: "you@t.dev",
    status: "open" as const,
    fromGold: 10,
    toGold: 0,
    fromItems: [{ item: "iron_sword", qty: 1 }],
    toItems: [],
    fromConfirm: false,
    toConfirm: false,
};

/** Backend stub; `trades` decides what /api/game/trade answers. */
function routes(trades: unknown = { incoming: [], outgoing: [trade] }): typeof fetch {
    return vi.fn((url: string) => {
        if (url.endsWith("/api/game/trade")) {
            return Promise.resolve(new Response(JSON.stringify(trades), { status: 200 }));
        }
        if (url.endsWith("/api/players/online")) {
            return Promise.resolve(
                new Response(JSON.stringify([{ email: "you@t.dev", name: "You" }]), { status: 200 }),
            );
        }
        if (url.endsWith("/api/game/player")) {
            return Promise.resolve(
                new Response(
                    JSON.stringify({
                        email: "me@t.dev",
                        gold: 100,
                        items: [{ item: "iron_sword", name: "Iron Sword", qty: 1 }],
                        catalog: [{ id: "iron_sword", name: "Iron Sword" }],
                    }),
                    { status: 200 },
                ),
            );
        }
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    }) as unknown as typeof fetch;
}

beforeEach(() => {
    tradeStore.set({
        open: false,
        email: "",
        incoming: [],
        outgoing: [],
        online: [],
        gold: 0,
        items: [],
        catalog: [],
        loading: false,
        error: false,
    });
    global.fetch = routes();
});

afterEach(() => {
    stopTradePolling();
    vi.useRealTimers();
});

describe("trade service", () => {
    it("opens the panel, loads the trade and the online players", async () => {
        openTradePanel();
        await vi.waitFor(() => expect(get(tradeStore).outgoing).toHaveLength(1));

        const state = get(tradeStore);
        expect(state.open).toBe(true);
        expect(state.email).toBe("me@t.dev");
        expect(state.gold).toBe(100);
        expect(state.online[0].name).toBe("You");
    });

    it("opens automatically when an invitation arrives", async () => {
        global.fetch = routes({ incoming: [{ ...trade, status: "pending", toUser: "me@t.dev" }], outgoing: [] });

        vi.useFakeTimers();
        startTradePolling();
        await vi.advanceTimersByTimeAsync(5000);

        expect(get(tradeStore).incoming).toHaveLength(1);
        expect(get(tradeStore).open).toBe(true);
    });

    it("accepts a trade and refreshes the state", async () => {
        expect(await acceptTrade("t1")).toBe(true);

        expect(global.fetch).toHaveBeenCalledWith(
            "https://core.test/api/game/trade/t1/accept",
            expect.objectContaining({ method: "POST" }),
        );
        expect(get(tradeStore).outgoing).toHaveLength(1);
    });

    it("sends an offer and reports failure", async () => {
        expect(await setTradeOffer("t1", [{ item: "iron_sword", qty: 1 }], 10)).toBe(true);

        global.fetch = vi.fn(() => Promise.resolve(new Response("", { status: 409 })));
        expect(await setTradeOffer("t1", [], 0)).toBe(false);
    });
});
