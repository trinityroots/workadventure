import { get, writable } from "svelte/store";
import { CORE_URL } from "../Enum/EnvironmentVariable";
import { sessionToken } from "./adminFetch";

export interface QuestView {
    id: string;
    assignmentId: string;
    key: string;
    title: string;
    description: string;
    giverNpcId: string;
    type: "kill" | "visit" | "talk" | "collect" | "timesheet";
    target: string;
    count: number;
    repeat: "once" | "daily";
    rewardItem: string | null;
    rewardQty: number;
    rewardGold: number;
    status: string;
    progress: number;
}

export interface AchievementView {
    id: string;
    key: string;
    title: string;
    description: string;
    rewardGold: number;
    unlocked: boolean;
    claimed: boolean;
}

export interface QuestsState {
    quests: QuestView[];
    achievements: AchievementView[];
    loading: boolean;
    error: boolean;
}

export const questsStore = writable<QuestsState>({ quests: [], achievements: [], loading: false, error: false });

async function api<T>(path: string, method = "GET"): Promise<T> {
    const token = sessionToken();
    const response = await fetch(`${CORE_URL}${path}`, { method, headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
}

export async function loadQuests(): Promise<void> {
    questsStore.update((state) => ({ ...state, loading: true, error: false }));
    try {
        const payload = await api<{ quests: QuestView[]; achievements: AchievementView[] }>("/api/game/quests");
        questsStore.set({ quests: payload.quests, achievements: payload.achievements, loading: false, error: false });
    } catch {
        questsStore.update((state) => ({ ...state, loading: false, error: true }));
    }
}

export async function claimQuest(assignmentId: string): Promise<boolean> {
    try {
        await api(`/api/game/quests/${encodeURIComponent(assignmentId)}/claim`, "POST");
    } catch {
        return false;
    }
    await loadQuests();
    return true;
}

export async function claimAchievement(achievementId: string): Promise<boolean> {
    try {
        await api(`/api/game/achievements/${encodeURIComponent(achievementId)}/claim`, "POST");
    } catch {
        return false;
    }
    await loadQuests();
    return true;
}

/** Quests a player can still act on, ready ones first. */
export function actionableQuests(): QuestView[] {
    return [...get(questsStore).quests].sort((a, b) => {
        const aReady = a.status === "completed" ? 0 : 1;
        const bReady = b.status === "completed" ? 0 : 1;
        return aReady - bReady;
    });
}
