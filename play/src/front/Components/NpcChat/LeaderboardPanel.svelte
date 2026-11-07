<script lang="ts">
    import { closeLeaderboard, leaderboardStore } from "../../Services/leaderboard";
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
</script>

{#if $leaderboardStore.open && $leaderboardStore.config}
    <FloatingWindow title={$leaderboardStore.config.title} onClose={closeLeaderboard} testid="leaderboard-panel">
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
                        class="flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm text-white/90 {index < 3
                            ? 'border-pop-yellow/30 bg-black/35'
                            : 'border-white/10 bg-black/35'}"
                    >
                        <span class="w-6 text-right font-mono text-sm font-bold {rankColors[index] ?? 'text-white/40'}">
                            {index + 1}
                        </span>
                        <span class="flex-1 truncate">{entry.user.split("@")[0]}</span>
                        <span class="font-mono font-semibold text-white/60">??</span>
                    </div>
                {/each}
            </div>
        {/if}
    </FloatingWindow>
{/if}
