import { get, writable } from "svelte/store";
import { gameManager } from "../Phaser/Game/GameManager";
import { CORE_URL } from "../Enum/EnvironmentVariable";
import type { NpcInfo } from "../Enum/Npc";
import { sessionToken } from "./adminFetch";

export type { NpcInfo };

export interface NpcChatMessage {
    role: "user" | "assistant";
    content: string;
    sources?: Array<{ title: string; url: string }>;
}

export interface NpcChatState {
    npc: NpcInfo | null;
    messages: NpcChatMessage[];
    sending: boolean;
    error: string | null;
}

export const npcListStore = writable<NpcInfo[]>([]);
export const npcChatStore = writable<NpcChatState>({
    npc: null,
    messages: [],
    sending: false,
    error: null,
});

/** The cast, fetched once per scene so the client and server share one list. */
export async function loadNpcList(): Promise<NpcInfo[]> {
    const token = sessionToken();
    if (!token) return [];
    try {
        const response = await fetch(`${CORE_URL}/api/game/npc/list`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return get(npcListStore);
        const list = (await response.json()) as NpcInfo[];
        npcListStore.set(list);
        return list;
    } catch {
        return get(npcListStore);
    }
}

export function openNpcChat(npc: NpcInfo): void {
    npcChatStore.set({ npc, messages: [], sending: false, error: null });
}

export function closeNpcChat(): void {
    npcChatStore.set({ npc: null, messages: [], sending: false, error: null });
}

/** Nearest spawned NPC within `range` pixels of the player, or null. */
export function nearestNpc(range: number): NpcInfo | null {
    const scene = gameManager.getCurrentGameScene();
    const player = scene?.CurrentPlayer;
    if (!player) return null;
    let best: NpcInfo | null = null;
    let bestDistance = range;
    for (const npc of get(npcListStore)) {
        const distance = Math.hypot(npc.x - player.x, npc.y - player.y);
        if (distance <= bestDistance) {
            best = npc;
            bestDistance = distance;
        }
    }
    return best;
}

/** Sends one turn and appends both sides of the exchange to the open chat. */
export async function sendNpcMessage(text: string): Promise<void> {
    const state = get(npcChatStore);
    if (!state.npc || state.sending || !text.trim()) return;
    const trimmed = text.trim();
    const history: NpcChatMessage[] = [...state.messages, { role: "user", content: trimmed }];
    npcChatStore.set({
        ...state,
        messages: history,
        sending: true,
        error: null,
    });

    const token = sessionToken();
    try {
        const response = await fetch(`${CORE_URL}/api/game/npc/${encodeURIComponent(state.npc.id)}/chat`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: history.map(({ role, content }) => ({ role, content })),
            }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as { reply: string; sources?: Array<{ title: string; url: string }> };
        npcChatStore.update((current) => ({
            ...current,
            sending: false,
            messages: [...current.messages, { role: "assistant", content: payload.reply, sources: payload.sources }],
        }));
    } catch {
        npcChatStore.update((current) => ({
            ...current,
            sending: false,
            error: "error",
        }));
    }
}
