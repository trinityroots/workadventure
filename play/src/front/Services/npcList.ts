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
    images?: Array<{ title: string; url: string }>;
}

export interface NpcChatState {
    npc: NpcInfo | null;
    /** One id per open panel — the server pins the LangSmith trace to it. */
    sessionId: string | null;
    messages: NpcChatMessage[];
    sending: boolean;
    error: string | null;
}

export const npcListStore = writable<NpcInfo[]>([]);
export const npcChatStore = writable<NpcChatState>({
    npc: null,
    sessionId: null,
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
    const messages: NpcChatMessage[] = npc.greeting ? [{ role: "assistant", content: npc.greeting }] : [];
    npcChatStore.set({ npc, sessionId: crypto.randomUUID(), messages, sending: false, error: null });
}

export function closeNpcChat(): void {
    npcChatStore.set({ npc: null, sessionId: null, messages: [], sending: false, error: null });
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

/** Sends one turn, streaming the reply into the open chat. */
export async function sendNpcMessage(text: string): Promise<void> {
    const state = get(npcChatStore);
    if (!state.npc || state.sending || !text.trim()) return;
    const trimmed = text.trim();
    const history: NpcChatMessage[] = [...state.messages, { role: "user", content: trimmed }];
    npcChatStore.set({
        ...state,
        messages: [...history, { role: "assistant", content: "" }],
        sending: true,
        error: null,
    });

    const token = sessionToken();
    const appendDelta = (delta: string): void => {
        npcChatStore.update((current) => {
            const messages = [...current.messages];
            const last = messages.length - 1;
            if (last >= 0) messages[last] = { ...messages[last], content: messages[last].content + delta };
            return { ...current, messages };
        });
    };

    try {
        const response = await fetch(`${CORE_URL}/api/game/npc/${encodeURIComponent(state.npc.id)}/chat`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: history.map(({ role, content }) => ({ role, content })),
                sessionId: state.sessionId,
            }),
        });
        if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let failed = false;

        for (;;) {
            // Streamed frames arrive in order: one chunk at a time is the whole point.
            // eslint-disable-next-line no-await-in-loop
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const frames = buffer.split("\n\n");
            buffer = frames.pop() ?? "";
            for (const frame of frames) {
                const event = /^event: (.+)$/m.exec(frame)?.[1];
                const dataLine = /^data: (.+)$/m.exec(frame)?.[1];
                if (!event || !dataLine) continue;
                const payload = JSON.parse(dataLine) as {
                    text?: string;
                    sources?: Array<{ title: string; url: string }>;
                    images?: Array<{ title: string; url: string }>;
                    error?: string;
                };
                if (event === "delta" && payload.text) appendDelta(payload.text);
                if ((event === "sources" || event === "images") && payload.sources) {
                    npcChatStore.update((current) => {
                        const messages = [...current.messages];
                        const last = messages.length - 1;
                        if (last >= 0) messages[last] = { ...messages[last], sources: payload.sources };
                        return { ...current, messages };
                    });
                }
                if ((event === "sources" || event === "images") && payload.images) {
                    npcChatStore.update((current) => {
                        const messages = [...current.messages];
                        const last = messages.length - 1;
                        if (last >= 0) messages[last] = { ...messages[last], images: payload.images };
                        return { ...current, messages };
                    });
                }
                if (event === "error") failed = true;
            }
        }
        if (failed) throw new Error("npc error");
        npcChatStore.update((current) => ({ ...current, sending: false }));
    } catch {
        npcChatStore.update((current) => {
            const messages = [...current.messages];
            const last = messages.at(-1);
            if (last?.role === "assistant" && !last.content) messages.pop();
            return { ...current, messages, sending: false, error: "error" };
        });
    }
}
