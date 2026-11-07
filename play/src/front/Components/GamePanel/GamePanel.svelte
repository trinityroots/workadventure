<script lang="ts">
    import { onMount } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { npcRoleIconHtml } from "../../Phaser/Components/npcRoleIcons";
    import { playSfx } from "../../Services/gameSfx";
    import { claimQuest, loadQuests, questsStore } from "../../Services/quests";

    let expanded = $state(false);

    onMount(() => {
        loadQuests().catch(() => undefined);
    });

    function claim(action: Promise<boolean>): void {
        action.then((ok) => playSfx(ok ? "fanfare" : "click")).catch(() => undefined);
    }

    function onKeyDown(event: KeyboardEvent): void {
        if (event.key === "Escape" && expanded) expanded = false;
    }

    const ready = $derived($questsStore.quests.filter((quest) => quest.status === "completed"));
    const active = $derived($questsStore.quests.filter((quest) => quest.status !== "completed"));
    const railQuests = $derived([...ready, ...active].slice(0, 4));
</script>

<svelte:window onkeydown={onKeyDown} />

<div
    data-testid="game-panel"
    class="pointer-events-auto fixed right-3 top-24 z-[250] w-[252px] max-w-[86vw] rounded-lg border border-white/15 bg-contrast/95 text-white shadow-[0_0_0_1px_rgba(0,0,0,.45),0_10px_30px_rgba(0,0,0,.5)] backdrop-blur-md"
>
    {#if !expanded}
        <header class="flex items-center gap-2 rounded-t-lg border-b border-white/10 bg-contrast-1000 px-3 py-2">
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
                                    style="width: {Math.min(100, (quest.progress / Math.max(1, quest.count)) * 100)}%"
                                ></div>
                            </div>
                        {/if}
                    </div>
                {/each}
            {/if}
        </div>

        <button
            type="button"
            class="w-full rounded-b-lg border-t border-white/10 py-1 text-[10px] text-white/40 hover:text-white/70"
            aria-label={$LL.gamePanel.title()}
            onclick={() => (expanded = true)}
        >
            ⌄
        </button>
    {:else}
        <header class="flex items-center gap-2 rounded-t-lg border-b border-white/10 bg-contrast-1000 px-3 py-2">
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
        </header>

        <div class="max-h-[60vh] overflow-y-auto p-2 no-scroll-bar">
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
                                style="width: {Math.min(100, (quest.progress / Math.max(1, quest.count)) * 100)}%"
                            ></div>
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
    {/if}
</div>
