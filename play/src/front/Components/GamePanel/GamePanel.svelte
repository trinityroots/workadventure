<script lang="ts">
    import { onMount } from "svelte";
    import { get } from "svelte/store";
    import { LL } from "../../../i18n/i18n-svelte";
    import { npcRoleIconHtml } from "../../Phaser/Components/npcRoleIcons";
    import { playSfx } from "../../Services/gameSfx";
    import { claimQuest, loadQuests, questsStore } from "../../Services/quests";

    let expanded = $state(false);
    let seenIds: Set<string> | null = null;

    async function refresh(): Promise<void> {
        await loadQuests();
        const ids = new Set(get(questsStore).quests.map((quest) => quest.assignmentId));
        if (seenIds === null) {
            seenIds = ids;
            return;
        }
        // A poll that surfaces an assignment we have never shown opens the tracker.
        for (const id of ids) {
            if (!seenIds.has(id)) {
                expanded = true;
                break;
            }
        }
        seenIds = ids;
    }

    onMount(() => {
        refresh().catch(() => undefined);
        const timer = window.setInterval(() => {
            refresh().catch(() => undefined);
        }, 45_000);
        return () => window.clearInterval(timer);
    });

    function claim(action: Promise<boolean>): void {
        action.then((ok) => playSfx(ok ? "fanfare" : "click")).catch(() => undefined);
    }

    function onKeyDown(event: KeyboardEvent): void {
        if (event.key === "Escape" && expanded) {
            expanded = false;
            return;
        }
        if (event.key !== "q" && event.key !== "Q") return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const target = event.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
            return;
        }
        expanded = !expanded;
    }

    const ready = $derived($questsStore.quests.filter((quest) => quest.status === "completed"));
    const active = $derived($questsStore.quests.filter((quest) => quest.status !== "completed"));
    const orderedQuests = $derived([...ready, ...active]);
</script>

<svelte:window onkeydown={onKeyDown} />

<div
    data-testid="game-panel"
    class="pointer-events-auto fixed right-3 top-24 z-[250] w-[200px] max-w-[86vw] rounded-md border border-white/15 bg-contrast/95 text-white shadow-[0_0_0_1px_rgba(0,0,0,.45),0_10px_30px_rgba(0,0,0,.5)] backdrop-blur-md"
>
    <header
        class="flex items-center gap-1 bg-black/25 px-1.5 py-0.5 {expanded
            ? 'rounded-t-md border-b border-white/10'
            : 'rounded-md'}"
    >
        <span class="text-pop-yellow" aria-hidden="true">
            <!-- Icon markup comes from the fixed npcRoleIcons table, never from user input. -->
            {@html npcRoleIconHtml("quill")}<!-- eslint-disable-line svelte/no-at-html-tags -->
        </span>
        <span class="flex-1 truncate font-mono text-[9px] font-bold uppercase tracking-widest text-pop-yellow"
            >{$LL.gamePanel.title()}</span
        >
        <button
            type="button"
            class="rounded p-0.5 text-[9px] text-white/50 hover:bg-white/10 hover:text-white"
            aria-label={$LL.gamePanel.title()}
            title="Q"
            onclick={() => (expanded = !expanded)}
        >
            {expanded ? "⤡" : "⤢"}
        </button>
    </header>

    {#if expanded}
        <div class="max-h-[40vh] overflow-y-auto p-1 no-scroll-bar">
            {#if $questsStore.loading}
                <p class="px-0.5 py-1 text-[10px] italic text-white/50">{$LL.gamePanel.loading()}</p>
            {:else if $questsStore.error}
                <p class="px-0.5 py-1 text-[10px] text-red-400">{$LL.gamePanel.error()}</p>
            {:else if orderedQuests.length === 0}
                <p class="px-0.5 py-1 text-[10px] text-white/50">{$LL.gamePanel.noQuests()}</p>
            {:else}
                {#each orderedQuests as quest (quest.assignmentId)}
                    <div
                        class="mb-0.5 rounded border px-1 py-0.5 leading-tight last:mb-0 {quest.status === 'completed'
                            ? 'border-emerald-400/40 bg-emerald-400/10'
                            : 'border-white/10 bg-white/5'}"
                    >
                        <div class="flex items-center gap-1">
                            <span class="flex-1 truncate text-[9px] font-medium">{quest.title}</span>
                            {#if quest.status === "completed"}
                                <button
                                    type="button"
                                    class="rounded border border-pop-yellow/60 bg-pop-yellow/20 px-1 py-px font-mono text-[8px] font-bold text-pop-yellow hover:bg-pop-yellow/35"
                                    onclick={() => claim(claimQuest(quest.assignmentId))}
                                >
                                    {$LL.gamePanel.claim()}
                                </button>
                            {:else}
                                <span class="text-[8px] text-white/60"
                                    >{Math.min(quest.progress, quest.count)}/{quest.count}</span
                                >
                            {/if}
                        </div>
                        {#if quest.status !== "completed"}
                            <div class="mt-0.5 h-px overflow-hidden rounded bg-white/10">
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
    {/if}
</div>
