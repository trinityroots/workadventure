<script lang="ts">
    import { closeLeaderboard, leaderboardStore } from "../../Services/leaderboard";
    import { sanitizeHTML } from "../../Chat/Components/Room/Message/WA-HTML-Sanitizer";
    import FloatingWindow from "../GameWindow/FloatingWindow.svelte";

    // The board never shows its rule or exact scores — each metric gets a cryptic line instead.
    const riddles: Record<string, string> = {
        gold_earned: "The board favors a heavy purse.",
        gold_current: "Those who hoard most, rank highest.",
        kills: "Only the monsters know your tally.",
        quests: "Diligent errand-runners rise here.",
    };

    function riddle(): string {
        const metric = $leaderboardStore.config?.metric ?? "";
        return riddles[metric] ?? "The rule stays a secret.";
    }

    const rankColors = ["text-pop-yellow", "text-white", "text-orange-300"];

    let activeTabId = $state<string | null>(null);
    const config = $derived($leaderboardStore.config);
    const tabs = $derived(config?.tabs ?? []);
    const activeTab = $derived(tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null);

    // A fresh open starts on the first tab in admin order.
    $effect(() => {
        if (config) activeTabId = null;
    });
</script>

{#if $leaderboardStore.open && config}
    <FloatingWindow title={activeTab?.title ?? config.title} onClose={closeLeaderboard} testid="leaderboard-panel">
        {#if tabs.length > 0}
            <div class="mb-2 flex flex-wrap gap-1 border-b border-white/10 pb-2">
                {#each tabs as tab (tab.id)}
                    <button
                        type="button"
                        class="rounded border px-2 py-1 font-mono text-xs uppercase tracking-wide {activeTab?.id ===
                        tab.id
                            ? 'border-pop-yellow/40 bg-pop-yellow/20 text-pop-yellow'
                            : 'border-white/10 text-white/60 hover:bg-white/5 hover:text-white'}"
                        onclick={() => (activeTabId = tab.id)}
                    >
                        {tab.title}
                    </button>
                {/each}
            </div>
        {/if}

        {#if !activeTab || activeTab.type === "leaderboard"}
            <p class="mb-2 font-mono text-xs italic text-white/55">“{riddle()}”</p>

            {#if $leaderboardStore.loading}
                <div class="font-mono text-xs italic text-pop-yellow/80">Loading…</div>
            {:else if $leaderboardStore.error}
                <div class="text-xs text-red-400">Could not load the board.</div>
            {:else if $leaderboardStore.entries.length === 0}
                <div class="text-xs text-white/50">No entries yet.</div>
            {:else}
                <div class="flex flex-col gap-1.5">
                    {#each $leaderboardStore.entries as entry, index (entry.user)}
                        <div
                            class="flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm text-white/90 {index <
                            3
                                ? 'border-pop-yellow/30 bg-black/35'
                                : 'border-white/10 bg-black/35'}"
                        >
                            <span
                                class="w-6 text-right font-mono text-sm font-bold {rankColors[index] ??
                                    'text-white/40'}"
                            >
                                {index + 1}
                            </span>
                            <span class="flex-1 truncate">{entry.user.split("@")[0]}</span>
                            <span class="font-mono font-semibold text-white/60">??</span>
                        </div>
                    {/each}
                </div>
            {/if}
        {:else}
            <div class="npc-md text-sm text-white/90">
                {@html sanitizeHTML(activeTab.html)}<!-- eslint-disable-line svelte/no-at-html-tags -->
            </div>
        {/if}
    </FloatingWindow>
{/if}
