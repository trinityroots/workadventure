import { get, writable } from "svelte/store";
import { CORE_URL } from "../Enum/EnvironmentVariable";
import type { NpcInfo } from "../Enum/Npc";
import { sessionToken } from "./adminFetch";

export interface ShopItem {
    id: string;
    name: string;
    kind: "gear" | "potion";
    price: number;
    slot?: string;
    attack?: number;
    rollMax?: number;
    rare?: boolean;
    effect?: string;
    durationMin?: number;
    description: string;
}

export interface OwnedItem {
    item: string;
    qty: number;
    roll?: number;
}

export interface MarketStatus {
    open: boolean;
    closesAt: string | null;
    stock: Array<{ itemId: string; qty: number; item?: ShopItem }>;
}

export interface ShopState {
    npc: NpcInfo | null;
    loading: boolean;
    error: string | null;
    gold: number;
    catalog: ShopItem[];
    items: ShopItem[];
    owned: OwnedItem[];
    rerollCost: number;
    market?: MarketStatus;
}

const EMPTY: ShopState = {
    npc: null,
    loading: false,
    error: null,
    gold: 0,
    catalog: [],
    items: [],
    owned: [],
    rerollCost: 0,
};

export const shopStore = writable<ShopState>(EMPTY);

async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const token = sessionToken();
    const response = await fetch(`${CORE_URL}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(init?.body ? { "Content-Type": "application/json" } : {}),
            ...init?.headers,
        },
    });
    if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? `HTTP ${response.status}`);
    }
    return (await response.json()) as T;
}

interface ShopPayload {
    gold: number;
    catalog: ShopItem[];
    items: ShopItem[];
    owned: OwnedItem[];
    rerollCost: number;
    market?: MarketStatus;
}

export async function openShop(npc: NpcInfo): Promise<void> {
    shopStore.set({ ...EMPTY, npc, loading: true });
    try {
        const payload = await api<ShopPayload>(`/api/game/shop/${encodeURIComponent(npc.id)}`);
        shopStore.set({ ...EMPTY, npc, ...payload });
    } catch {
        shopStore.set({ ...EMPTY, npc, error: "error" });
    }
}

export function closeShop(): void {
    shopStore.set(EMPTY);
}

async function mutate(path: string, body: Record<string, unknown>): Promise<void> {
    const state = get(shopStore);
    try {
        const result = await api<{ gold: number }>(path, { method: "POST", body: JSON.stringify(body) });
        if (state.npc) await openShop({ ...state.npc });
        shopStore.update((current) => ({ ...current, gold: result.gold, error: null }));
    } catch (error) {
        shopStore.update((current) => ({ ...current, error: (error as Error).message || "error" }));
    }
}

export function buyItem(itemId: string, qty = 1): Promise<void> {
    const npc = get(shopStore).npc;
    if (!npc) return Promise.resolve();
    return mutate(`/api/game/shop/${encodeURIComponent(npc.id)}/buy`, { itemId, qty });
}

export function sellItem(itemId: string, qty = 1): Promise<void> {
    return mutate("/api/game/shop/rilla/sell", { itemId, qty });
}

export function rerollItem(itemId: string): Promise<void> {
    return mutate("/api/game/shop/moss/reroll", { itemId });
}

export function usePotion(itemId: string): Promise<void> {
    return mutate("/api/game/potion/use", { itemId });
}

export async function fetchMarketStatus(): Promise<MarketStatus> {
    return api<MarketStatus>("/api/game/market/status");
}
