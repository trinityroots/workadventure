import { get, writable } from "svelte/store";
import { gameManager } from "../Phaser/Game/GameManager";
import { CORE_URL } from "../Enum/EnvironmentVariable";
import { sessionToken } from "./adminFetch";

export interface BoardInfo {
    id: string;
    key: string;
    title: string;
    period: "daily" | "weekly" | "monthly";
    metric: string;
    x: number;
    y: number;
    active: boolean;
}

export interface LeaderboardRow {
    user: string;
    score: number;
}

export interface LeaderboardState {
    open: boolean;
    config: BoardInfo | null;
    entries: LeaderboardRow[];
    windowStart: string | null;
    loading: boolean;
    error: boolean;
}

export const boardListStore = writable<BoardInfo[]>([]);
export const leaderboardStore = writable<LeaderboardState>({
    open: false,
    config: null,
    entries: [],
    windowStart: null,
    loading: false,
    error: false,
});

async function api<T>(path: string): Promise<T> {
    const token = sessionToken();
    const response = await fetch(`${CORE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
}

export async function loadBoards(): Promise<BoardInfo[]> {
    try {
        const boards = await api<BoardInfo[]>("/api/game/boards");
        boardListStore.set(boards);
        return boards;
    } catch {
        return get(boardListStore);
    }
}

export function openLeaderboard(config: BoardInfo): void {
    leaderboardStore.set({ open: true, config, entries: [], windowStart: null, loading: true, error: false });
    api<{ config: BoardInfo; windowStart: string; entries: LeaderboardRow[] }>(
        `/api/game/leaderboard/${encodeURIComponent(config.key)}`,
    )
        .then((payload) => {
            leaderboardStore.set({
                open: true,
                config,
                entries: payload.entries,
                windowStart: payload.windowStart,
                loading: false,
                error: false,
            });
        })
        .catch(() => {
            leaderboardStore.update((state) => ({ ...state, loading: false, error: true }));
        });
}

export function closeLeaderboard(): void {
    leaderboardStore.update((state) => ({ ...state, open: false }));
}

/** Nearest board within `range` pixels of the player, or null. */
export function nearestBoard(range: number): BoardInfo | null {
    const scene = gameManager.getCurrentGameScene();
    const player = scene?.CurrentPlayer;
    if (!player) return null;
    let best: BoardInfo | null = null;
    let bestDistance = range;
    for (const board of get(boardListStore)) {
        const distance = Math.hypot(board.x - player.x, board.y - player.y);
        if (distance <= bestDistance) {
            best = board;
            bestDistance = distance;
        }
    }
    return best;
}
