import { writable } from "svelte/store";
import { CORE_URL } from "../Enum/EnvironmentVariable";
import { sessionToken } from "./adminFetch";

export interface OfferLine {
    item: string;
    qty: number;
}

export interface TradeView {
    id: string;
    fromUser: string;
    toUser: string;
    status: "pending" | "open" | "executing" | "completed" | "cancelled";
    fromGold: number;
    toGold: number;
    fromItems: OfferLine[];
    toItems: OfferLine[];
    fromConfirm: boolean;
    toConfirm: boolean;
}

export interface OnlinePlayer {
    email: string;
    name: string;
}

export interface CatalogEntry {
    id: string;
    name: string;
}

export interface OwnedItem {
    item: string;
    name: string;
    qty: number;
    roll?: number;
}

export interface TradeState {
    open: boolean;
    email: string;
    incoming: TradeView[];
    outgoing: TradeView[];
    online: OnlinePlayer[];
    gold: number;
    items: OwnedItem[];
    catalog: CatalogEntry[];
    loading: boolean;
    error: boolean;
}

export const tradeStore = writable<TradeState>({
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

let pollTimer: ReturnType<typeof setInterval> | undefined;

async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const token = sessionToken();
    const response = await fetch(`${CORE_URL}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
}

async function refresh(): Promise<void> {
    try {
        const [trades, player] = await Promise.all([
            api<{ incoming: TradeView[]; outgoing: TradeView[] }>("/api/game/trade"),
            api<{ email: string; gold: number; items: OwnedItem[]; catalog: CatalogEntry[] }>("/api/game/player"),
        ]);
        const incoming = trades.incoming;
        tradeStore.update((state) => ({
            ...state,
            email: player.email,
            catalog: player.catalog,
            incoming,
            outgoing: trades.outgoing,
            gold: player.gold,
            items: player.items,
            loading: false,
            error: false,
            open: state.open || incoming.length > 0,
        }));
    } catch {
        tradeStore.update((state) => ({ ...state, loading: false, error: true }));
    }
}

export function openTradePanel(handle?: string): void {
    tradeStore.update((state) => ({ ...state, open: true, loading: true }));
    api<OnlinePlayer[]>("/api/players/online")
        .then((online) => tradeStore.update((state) => ({ ...state, online })))
        .catch(() => undefined);
    refresh().catch(() => undefined);
    if (handle) {
        api("/api/game/trade/invite", "POST", { handle })
            .catch(() => undefined)
            .then(() => refresh())
            .catch(() => undefined);
    }
}

export function closeTradePanel(): void {
    tradeStore.update((state) => ({ ...state, open: false }));
}

export async function inviteTrade(email: string): Promise<boolean> {
    try {
        await api("/api/game/trade/invite", "POST", { email });
    } catch {
        return false;
    }
    await refresh();
    return true;
}

async function act(path: string, method = "POST", body?: unknown): Promise<boolean> {
    try {
        await api(path, method, body);
    } catch {
        return false;
    }
    await refresh();
    return true;
}

export const acceptTrade = (id: string) => act(`/api/game/trade/${encodeURIComponent(id)}/accept`);
export const declineTrade = (id: string) => act(`/api/game/trade/${encodeURIComponent(id)}/decline`);
export const cancelTrade = (id: string) => act(`/api/game/trade/${encodeURIComponent(id)}/cancel`);
export const confirmTrade = (id: string) => act(`/api/game/trade/${encodeURIComponent(id)}/confirm`);
export const setTradeOffer = (id: string, items: OfferLine[], gold: number) =>
    act(`/api/game/trade/${encodeURIComponent(id)}/offer`, "PUT", { items, gold });

/** Polls the server so an invitation or the other side's confirmation shows up. */
export function startTradePolling(): void {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
        refresh().catch(() => undefined);
    }, 5000);
}

export function stopTradePolling(): void {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = undefined;
}
