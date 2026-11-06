<script lang="ts">
    import { onMount } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { npcRoleIconSvg } from "../../Phaser/Components/npcRoleIcons";
    import { loadBoards, boardListStore, openLeaderboard } from "../../Services/leaderboard";
    import { claimAchievement, claimQuest, loadQuests, questsStore } from "../../Services/quests";
    import { closeGamePanel } from "./sidebar";

    type Tab = "quests" | "achievements" | "leaderboards";
    const TAB_KEY = "wa-game-panel-tab";

    let tab = $state<Tab>("quests");

    onMount(() => {
        try {
            const saved = localStorage.getItem(TAB_KEY);
            if (saved === "quests" || saved === "achievements" || saved === "leaderboards") tab = saved;
        } catch {
            // Private mode: keep the default tab.
        }
        loadQuests().catch(() => undefined);
        loadBoards().catch(() => undefined);
    });

    function select(next: Tab): void {
        tab = next;
        try {
            localStorage.setItem(TAB_KEY, next);
        } catch {
            // Private mode: the tab just is not remembered.
        }
    }

    function run(action: Promise<unknown>): void {
        action.catch(() => undefined);
    }

    const needsWork = $derived($questsStore.quests.filter((quest) => quest.status !== "completed"));
    const ready = $derived($questsStore.quests.filter((quest) => quest.status === "completed"));

    const tabs: { key: Tab; label: () => string }[] = [
        { key: "quests", label: $LL.gamePanel.tabs.quests },
        { key: "achievements", label: $LL.gamePanel.tabs.achievements },
        { key: "leaderboards", label: $LL.gamePanel.tabs.leaderboards },
    ];
</script>

<div class="flex h-full flex-col text-white" data-testid="game-panel">
    <header class="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span class="text-white/80" aria-hidden="true">
            <!-- Icon markup comes from the fixed npcRoleIcons table, never from user input. -->
            {@html npcRoleIconSvg("quill")}
            <!-- eslint-disable-line svelte/no-at-html-tags -->
        </span>
        <span class="flex-1 text-sm font-semibold">{$LL.gamePanel.title()}</span>
        <button
            type="button"
            class="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Close"
            onclick={closeGamePanel}
        >
            ✕
        </button>
    </header>

    <nav class="flex gap-1 border-b border-white/10 px-2 py-1 text-xs">
        {#each tabs as entry (entry.key)}
            <button
                type="button"
                class="rounded px-2 py-1 {tab === entry.key
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white'}"
                onclick={() => select(entry.key)}
            >
                {entry.label()}
            </button>
        {/each}
    </nav>

    <div class="flex-1 overflow-y-auto p-2 no-scroll-bar">
        {#if tab === "quests"}
            {#if $questsStore.loading}
                <p class="px-1 py-2 text-xs italic text-white/50">{$LL.gamePanel.loading()}</p>
            {:else if $questsStore.error}
                <p class="px-1 py-2 text-xs text-red-400">{$LL.gamePanel.error()}</p>
            {:else if $questsStore.quests.length === 0}
                <p class="px-1 py-2 text-xs text-white/50">{$LL.gamePanel.noQuests()}</p>
            {:else}
                {#each [...ready, ...needsWork] as quest (quest.assignmentId)}
                    <div class="mb-1 rounded-md bg-white/5 px-2 py-1.5">
                        <div class="flex items-center gap-2">
                            <span class="flex-1 truncate text-xs font-medium">{quest.title}</span>
                            <span class="text-[11px] text-white/60"
                                >{Math.min(quest.progress, quest.count)}/{quest.count}</span
                            >
                            {#if quest.status === "completed"}
                                <button
                                    type="button"
                                    class="rounded bg-primary px-1.5 py-0.5 text-[11px] text-white hover:opacity-90"
                                    onclick={() => run(claimQuest(quest.assignmentId))}
                                >
                                    {$LL.gamePanel.claim()}
                                </button>
                            {/if}
                        </div>
                        <div class="truncate text-[11px] text-white/50">
                            {quest.description}
                            {#if quest.rewardGold}
                                · {quest.rewardGold} {$LL.gamePanel.gold()}
                            {/if}
                        </div>
                        <div class="mt-1 h-1 overflow-hidden rounded bg-white/10">
                            <div
                                class="h-full bg-primary"
                                style="width: {Math.min(100, (quest.progress / Math.max(1, quest.count)) * 100)}%"
                            ></div>
                        </div>
                    </div>
                {/each}
            {/if}
        {:else if tab === "achievements"}
            {#each $questsStore.achievements as achievement (achievement.id)}
                <div class="mb-1 flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5">
                    <div class="flex-1">
                        <div class="truncate text-xs font-medium">{achievement.title}</div>
                        <div class="truncate text-[11px] text-white/50">{achievement.description}</div>
                    </div>
                    {#if achievement.claimed}
                        <span class="text-[11px] text-white/40">{$LL.gamePanel.achievementClaimed()}</span>
                    {:else if achievement.unlocked}
                        <button
                            type="button"
                            class="rounded bg-primary px-1.5 py-0.5 text-[11px] text-white hover:opacity-90"
                            onclick={() => run(claimAchievement(achievement.id))}
                        >
                            {$LL.gamePanel.claim()}
                        </button>
                    {:else}
                        <span class="text-[11px] text-white/40">{$LL.gamePanel.achievementLocked()}</span>
                    {/if}
                </div>
            {/each}
        {:else}
            {#each $boardListStore as board (board.key)}
                <button
                    type="button"
                    class="mb-1 flex w-full items-center gap-2 rounded-md bg-white/5 px-2 py-1.5 text-left hover:bg-white/10"
                    onclick={() => openLeaderboard(board)}
                >
                    <span class="text-white/70" aria-hidden="true">
                        {@html npcRoleIconSvg("star")}
                        <!-- eslint-disable-line svelte/no-at-html-tags -->
                    </span>
                    <span class="flex-1 truncate text-xs font-medium">{board.title}</span>
                    <span class="text-[11px] capitalize text-white/50">{board.period}</span>
                </button>
            {/each}
        {/if}
    </div>
</div>
