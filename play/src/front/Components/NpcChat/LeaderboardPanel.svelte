<script lang="ts">
    import { npcRoleIconSvg } from "../../Phaser/Components/npcRoleIcons";
    import { closeLeaderboard, leaderboardStore } from "../../Services/leaderboard";

    function metricLabel(): string {
        const metric = $leaderboardStore.config?.metric ?? "";
        return metric.replace(/_/g, " ");
    }
</script>

{#if $leaderboardStore.open && $leaderboardStore.config}
    <aside
        class="fixed top-0 right-0 z-[300] flex h-full w-[340px] max-w-[92vw] flex-col border-s border-white/10 bg-contrast/95 backdrop-blur-md"
        data-testid="leaderboard-panel"
    >
        <header class="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <span class="text-white/80" aria-hidden="true">
                <!-- Icon markup comes from the fixed npcRoleIcons table, never from user input. -->
                {@html npcRoleIconSvg("star")}
                <!-- eslint-disable-line svelte/no-at-html-tags -->
            </span>
            <div class="flex-1">
                <div class="truncate text-sm font-semibold text-white">{$leaderboardStore.config.title}</div>
                <div class="text-xs capitalize text-white/50">
                    {$leaderboardStore.config.period} · {metricLabel()}
                </div>
            </div>
            <button
                type="button"
                class="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Close"
                onclick={closeLeaderboard}
            >
                ✕
            </button>
        </header>

        <div class="flex flex-1 flex-col gap-1 overflow-y-auto p-3 no-scroll-bar">
            {#if $leaderboardStore.loading}
                <div class="text-xs italic text-white/50">Loading…</div>
            {:else if $leaderboardStore.error}
                <div class="text-xs text-red-400">Could not load the board.</div>
            {:else if $leaderboardStore.entries.length === 0}
                <div class="text-xs text-white/50">No entries yet.</div>
            {:else}
                {#each $leaderboardStore.entries as entry, index (entry.user)}
                    <div class="flex items-center gap-2 rounded px-2 py-1 text-sm text-white/90">
                        <span class="w-6 text-right text-white/50">{index + 1}</span>
                        <span class="flex-1 truncate">{entry.user.split("@")[0]}</span>
                        <span class="font-semibold">{entry.score}</span>
                    </div>
                {/each}
            {/if}
        </div>
    </aside>
{/if}
