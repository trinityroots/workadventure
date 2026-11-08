<script lang="ts">
    import { onMount } from "svelte";
    import { get } from "svelte/store";
    import { LL } from "../../../i18n/i18n-svelte";
    import { npcRoleIconHtml } from "../../Phaser/Components/npcRoleIcons";
    import { playSfx } from "../../Services/gameSfx";
    import { claimQuest, loadQuests, questsStore, type QuestView } from "../../Services/quests";

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

    // Pixel art matching the panel theme, not emoji.
    const TYPE_ICON: Record<string, string> = {
        kill: "/static/images/items/item_sword.png",
        visit: "resources/icons/npc-map.png",
        talk: "resources/icons/npc-quill.png",
        collect: "/static/images/items/item_bag.png",
        timesheet: "resources/icons/npc-scroll.png",
    };

    function rewardLine(quest: QuestView): string | null {
        const parts: string[] = [];
        if (quest.rewardGold > 0) parts.push(`✦ ${quest.rewardGold} gold`);
        if (quest.rewardItem) parts.push(`${quest.rewardQty}× ${quest.rewardItem}`);
        return parts.length ? parts.join("  ·  ") : null;
    }

    const ready = $derived($questsStore.quests.filter((quest) => quest.status === "completed"));
    const active = $derived($questsStore.quests.filter((quest) => quest.status !== "completed"));
    const orderedQuests = $derived([...ready, ...active]);
</script>

<svelte:window onkeydown={onKeyDown} />

<div
    data-testid="game-panel"
    class="pointer-events-auto fixed right-3 top-24 z-[250] w-[248px] max-w-[86vw] rounded-md border border-white/15 bg-contrast/80 text-white shadow-[0_0_0_1px_rgba(0,0,0,.45),0_10px_30px_rgba(0,0,0,.5)] backdrop-blur"
>
    <header
        class="flex items-center gap-1.5 bg-black/25 px-2 py-1 {expanded
            ? 'rounded-t-md border-b border-white/10'
            : 'rounded-md'}"
    >
        <span class="flex items-center" aria-hidden="true">
            <!-- Icon markup comes from the fixed npcRoleIcons table, never from user input. -->
            {@html npcRoleIconHtml("scroll", 16)}<!-- eslint-disable-line svelte/no-at-html-tags -->
        </span>
        <span class="min-w-0 flex-1 truncate font-mono text-sm font-bold uppercase tracking-wider text-pop-yellow"
            >{$LL.gamePanel.title()}</span
        >
        <button
            type="button"
            class="rounded p-0.5 text-sm text-white/60 hover:bg-white/10 hover:text-white"
            aria-label={$LL.gamePanel.title()}
            title="Q"
            onclick={() => (expanded = !expanded)}
        >
            {expanded ? "⤡" : "⤢"}
        </button>
    </header>

    {#if expanded}
        <div class="max-h-[45vh] space-y-0.5 overflow-y-auto p-1 no-scroll-bar">
            {#if $questsStore.loading}
                <p class="px-1 py-1.5 text-sm italic text-white/50">{$LL.gamePanel.loading()}</p>
            {:else if $questsStore.error}
                <p class="px-1 py-1.5 text-sm text-red-400">{$LL.gamePanel.error()}</p>
            {:else if orderedQuests.length === 0}
                <p class="px-1 py-1.5 text-sm text-white/50">{$LL.gamePanel.noQuests()}</p>
            {:else}
                {#each orderedQuests as quest (quest.assignmentId)}
                    {@const pct = Math.min(100, (quest.progress / Math.max(1, quest.count)) * 100)}
                    {@const done = quest.status === "completed"}
                    <div
                        class="rounded border px-1.5 py-1 {done
                            ? 'border-emerald-400/50 bg-emerald-400/10 shadow-[0_0_10px_rgba(52,211,153,.15)]'
                            : 'border-white/10 bg-white/5'}"
                    >
                        <div class="flex items-start gap-1.5">
                            {#if TYPE_ICON[quest.type]}
                                <img
                                    src={TYPE_ICON[quest.type]}
                                    alt=""
                                    class="mt-px h-3.5 w-3.5 shrink-0 [image-rendering:pixelated]"
                                    aria-hidden="true"
                                />
                            {/if}
                            <span class="flex-1 text-[13px] font-medium leading-snug">{quest.title}</span>
                            {#if done}
                                <button
                                    type="button"
                                    class="shrink-0 rounded border border-pop-yellow/60 bg-pop-yellow/20 px-2 py-0.5 text-xs font-bold text-pop-yellow hover:bg-pop-yellow/35"
                                    onclick={() => claim(claimQuest(quest.assignmentId))}
                                >
                                    {$LL.gamePanel.claim()}
                                </button>
                            {:else}
                                <span class="shrink-0 rounded bg-white/10 px-1.5 py-px font-mono text-xs text-white/70"
                                    >{Math.min(quest.progress, quest.count)}/{quest.count}</span
                                >
                            {/if}
                        </div>
                        {#if rewardLine(quest)}
                            <p class="mt-0.5 pl-4 text-[11px] text-pop-yellow/80">{rewardLine(quest)}</p>
                        {/if}
                        {#if !done}
                            <div class="mt-0.5 flex items-center gap-1.5 pl-4">
                                <div class="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                                    <div
                                        class="h-full rounded-full bg-gradient-to-r from-primary to-pop-yellow transition-all"
                                        style="width: {pct}%"
                                    ></div>
                                </div>
                                <span class="font-mono text-[10px] text-white/50">{Math.round(pct)}%</span>
                            </div>
                        {/if}
                        <div class="mt-0.5 flex gap-1 pl-4">
                            <span
                                class="rounded px-1 py-px text-[10px] uppercase tracking-wide {quest.repeat === 'daily'
                                    ? 'bg-sky-500/20 text-sky-300'
                                    : 'bg-white/10 text-white/50'}"
                            >
                                {quest.repeat}
                            </span>
                            {#if done}
                                <span
                                    class="rounded bg-emerald-500/20 px-1 py-px text-[10px] uppercase tracking-wide text-emerald-300"
                                >
                                    ready
                                </span>
                            {/if}
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
    {/if}
</div>
