<script lang="ts">
    import { onMount } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { npcRoleIconHtml } from "../../Phaser/Components/npcRoleIcons";
    import { playSfx } from "../../Services/gameSfx";
    import { claimAchievement, claimQuest, loadQuests, questsStore } from "../../Services/quests";
    import { closeGamePanel, gamePanelOpenStore } from "./sidebar";

    type Tab = "quests" | "achievements";
    const TAB_KEY = "wa-game-panel-tab";

    let expanded = $state(false);
    let tab = $state<Tab>("quests");

    onMount(() => {
        try {
            if (localStorage.getItem(TAB_KEY) === "achievements") tab = "achievements";
        } catch {
            // Private mode: keep the default tab.
        }
        loadQuests().catch(() => undefined);
    });

    function select(next: Tab): void {
        tab = next;
        try {
            localStorage.setItem(TAB_KEY, next);
        } catch {
            // Private mode: the tab just is not remembered.
        }
    }

    function claim(action: Promise<boolean>): void {
        action.then((ok) => playSfx(ok ? "fanfare" : "click")).catch(() => undefined);
    }

    let wasOpen: boolean | null = null;
    $effect(() => {
        const open = $gamePanelOpenStore;
        if (wasOpen !== null && open !== wasOpen) playSfx(open ? "open" : "close");
        wasOpen = open;
    });

    const ready = $derived($questsStore.quests.filter((quest) => quest.status === "completed"));
    const active = $derived($questsStore.quests.filter((quest) => quest.status !== "completed"));
    const railQuests = $derived([...ready, ...active].slice(0, 4));

    const tabs: { key: Tab; label: () => string }[] = [
        { key: "quests", label: $LL.gamePanel.tabs.quests },
        { key: "achievements", label: $LL.gamePanel.tabs.achievements },
    ];
</script>

{#if $gamePanelOpenStore}
    <div
        data-testid="game-panel"
        class="pointer-events-auto fixed right-0 top-24 z-[250] w-[252px] max-w-[86vw] rounded-l-lg border border-pop-yellow/55 bg-contrast/95 text-white shadow-[0_0_0_1px_rgba(0,0,0,.45),0_10px_30px_rgba(0,0,0,.5)] backdrop-blur-md"
    >
        <span
            class="pointer-events-none absolute left-1 top-1 h-2.5 w-2.5 border-l-2 border-t-2 border-pop-yellow"
            aria-hidden="true"
        ></span>
        <span
            class="pointer-events-none absolute bottom-1 left-1 h-2.5 w-2.5 border-b-2 border-l-2 border-pop-yellow"
            aria-hidden="true"
        ></span>
        {#if !expanded}
            <header class="flex items-center gap-2 border-b border-white/10 px-2.5 py-1.5">
                <span class="text-pop-yellow" aria-hidden="true">
                    <!-- Icon markup comes from the fixed npcRoleIcons table, never from user input. -->
                    {@html npcRoleIconHtml("quill")}<!-- eslint-disable-line svelte/no-at-html-tags -->
                </span>
                <span class="flex-1 truncate font-mono text-xs font-bold uppercase tracking-widest text-pop-yellow"
                    >{$LL.gamePanel.title()}</span
                >
                <button
                    type="button"
                    class="rounded p-0.5 text-white/60 hover:bg-white/10 hover:text-white"
                    aria-label={$LL.gamePanel.title()}
                    onclick={() => (expanded = true)}
                >
                    ⤢
                </button>
            </header>

            <div class="p-2">
                {#if $questsStore.loading}
                    <p class="px-1 py-1 text-[11px] italic text-white/50">{$LL.gamePanel.loading()}</p>
                {:else if $questsStore.error}
                    <p class="px-1 py-1 text-[11px] text-red-400">{$LL.gamePanel.error()}</p>
                {:else if railQuests.length === 0}
                    <p class="px-1 py-1 text-[11px] text-white/50">{$LL.gamePanel.noQuests()}</p>
                {:else}
                    {#each railQuests as quest (quest.assignmentId)}
                        <div
                            class="mb-1.5 rounded-md border {quest.status === 'completed'
                                ? 'border-emerald-400/40 bg-emerald-400/10'
                                : 'border-white/10 bg-white/5'} px-2 py-1.5 last:mb-0"
                        >
                            <div class="flex items-center gap-2">
                                <span class="flex-1 truncate text-[11px] font-medium">{quest.title}</span>
                                {#if quest.status === "completed"}
                                    <button
                                        type="button"
                                        class="rounded border border-pop-yellow/60 bg-pop-yellow/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-pop-yellow hover:bg-pop-yellow/35"
                                        onclick={() => claim(claimQuest(quest.assignmentId))}
                                    >
                                        {$LL.gamePanel.claim()}
                                    </button>
                                {:else}
                                    <span class="text-[10px] text-white/60"
                                        >{Math.min(quest.progress, quest.count)}/{quest.count}</span
                                    >
                                {/if}
                            </div>
                            {#if quest.status !== "completed"}
                                <div class="mt-1 h-1 overflow-hidden rounded bg-white/10">
                                    <div
                                        class="h-full bg-gradient-to-r from-primary to-pop-yellow"
                                        style="width: {Math.min(
                                            100,
                                            (quest.progress / Math.max(1, quest.count)) * 100,
                                        )}%"
                                    ></div>
                                </div>
                            {/if}
                        </div>
                    {/each}
                {/if}
            </div>

            <button
                type="button"
                class="w-full border-t border-white/10 py-1 text-[10px] text-white/40 hover:text-white/70"
                aria-label={$LL.gamePanel.title()}
                onclick={() => (expanded = true)}
            >
                ⌄
            </button>
        {:else}
            <header class="flex items-center gap-2 border-b border-white/10 px-2.5 py-1.5">
                <span class="text-pop-yellow" aria-hidden="true">
                    <!-- Icon markup comes from the fixed npcRoleIcons table, never from user input. -->
                    {@html npcRoleIconHtml("quill")}<!-- eslint-disable-line svelte/no-at-html-tags -->
                </span>
                <span class="flex-1 truncate font-mono text-xs font-bold uppercase tracking-widest text-pop-yellow"
                    >{$LL.gamePanel.title()}</span
                >
                <button
                    type="button"
                    class="rounded p-0.5 text-white/60 hover:bg-white/10 hover:text-white"
                    aria-label={$LL.gamePanel.title()}
                    onclick={() => (expanded = false)}
                >
                    ⤡
                </button>
                <button
                    type="button"
                    class="rounded p-0.5 text-white/70 hover:bg-white/10 hover:text-white"
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

            <div class="max-h-[60vh] overflow-y-auto p-2 no-scroll-bar">
                {#if tab === "quests"}
                    {#if $questsStore.loading}
                        <p class="px-1 py-2 text-xs italic text-white/50">{$LL.gamePanel.loading()}</p>
                    {:else if $questsStore.error}
                        <p class="px-1 py-2 text-xs text-red-400">{$LL.gamePanel.error()}</p>
                    {:else if $questsStore.quests.length === 0}
                        <p class="px-1 py-2 text-xs text-white/50">{$LL.gamePanel.noQuests()}</p>
                    {:else}
                        {#each [...ready, ...active] as quest (quest.assignmentId)}
                            <div
                                class="mb-1 rounded-md border px-2 py-1.5 {quest.status === 'completed'
                                    ? 'border-emerald-400/40 bg-emerald-400/10'
                                    : 'border-white/10 bg-white/5'}"
                            >
                                <div class="flex items-center gap-2">
                                    <span class="flex-1 truncate text-xs font-medium">{quest.title}</span>
                                    <span class="text-[11px] text-white/60"
                                        >{Math.min(quest.progress, quest.count)}/{quest.count}</span
                                    >
                                    {#if quest.status === "completed"}
                                        <button
                                            type="button"
                                            class="rounded border border-pop-yellow/60 bg-pop-yellow/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-pop-yellow hover:bg-pop-yellow/35"
                                            onclick={() => claim(claimQuest(quest.assignmentId))}
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
                                        class="h-full bg-gradient-to-r from-primary to-pop-yellow"
                                        style="width: {Math.min(
                                            100,
                                            (quest.progress / Math.max(1, quest.count)) * 100,
                                        )}%"
                                    ></div>
                                </div>
                            </div>
                        {/each}
                    {/if}
                {:else}
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
                                    class="rounded border border-pop-yellow/60 bg-pop-yellow/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-pop-yellow hover:bg-pop-yellow/35"
                                    onclick={() => claim(claimAchievement(achievement.id))}
                                >
                                    {$LL.gamePanel.claim()}
                                </button>
                            {:else}
                                <span class="text-[11px] text-white/40">{$LL.gamePanel.achievementLocked()}</span>
                            {/if}
                        </div>
                    {/each}
                {/if}
            </div>
        {/if}
    </div>
{/if}
