import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/front/Enum/EnvironmentVariable", () => ({ CORE_URL: "https://core.test" }));
vi.mock("../../../src/front/Services/adminFetch", () => ({ sessionToken: () => "token" }));

import { buyItem, closeShop, openShop, shopStore } from "../../../src/front/Services/shop";

const bram = {
    id: "bram",
    name: "Bram",
    icon: "anvil",
    kind: "shop" as const,
    x: 1,
    y: 2,
    sprite: "resources/npcs/bram.png",
};

const payload = {
    gold: 100,
    catalog: [{ id: "iron_sword", name: "Iron Sword", kind: "gear", price: 60, attack: 5, description: "" }],
    items: [{ id: "iron_sword", name: "Iron Sword", kind: "gear", price: 60, attack: 5, description: "" }],
    owned: [],
    rerollCost: 50,
};

beforeEach(() => {
    closeShop();
});

describe("shop store", () => {
    it("loads a shop payload into the store", async () => {
        global.fetch = vi.fn(() => Promise.resolve(new Response(JSON.stringify(payload), { status: 200 })));

        await openShop(bram);

        const state = get(shopStore);
        expect(state.npc?.id).toBe("bram");
        expect(state.gold).toBe(100);
        expect(state.catalog).toHaveLength(1);
        expect(state.loading).toBe(false);
    });

    it("posts a purchase and refreshes gold", async () => {
        await openShop(bram);
        const fetchMock = vi.fn((url: string) => {
            if (url.includes("/buy")) {
                return Promise.resolve(new Response(JSON.stringify({ gold: 40 }), { status: 200 }));
            }
            return Promise.resolve(new Response(JSON.stringify({ ...payload, gold: 40 }), { status: 200 }));
        });
        global.fetch = fetchMock as unknown as typeof fetch;

        await buyItem("iron_sword", 1);

        expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/buy"))).toBe(true);
        expect(get(shopStore).gold).toBe(40);
        expect(get(shopStore).error).toBeNull();
    });

    it("surfaces a shop error", async () => {
        await openShop(bram);
        global.fetch = vi.fn(() =>
            Promise.resolve(new Response(JSON.stringify({ error: "not_enough_gold" }), { status: 402 })),
        );

        await buyItem("iron_sword", 1);

        expect(get(shopStore).error).toBe("not_enough_gold");
    });
});
