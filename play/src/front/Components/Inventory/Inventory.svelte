<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import { inventoryItemsStore } from "../../Stores/InventoryStore";
    import { refreshInventory } from "../../Services/InventoryLoader";
    import { IconRefresh } from "@wa-icons";

    $effect(() => {
        refreshInventory().catch(() => undefined);
    });

    /** "slime_gel" → "Slime gel" */
    function displayName(item: string): string {
        const words = item.replace(/[_-]+/g, " ").trim();
        return words.charAt(0).toUpperCase() + words.slice(1);
    }
</script>

<div class="flex h-full min-h-0 flex-col gap-3 p-3 select-text">
    <header class="flex items-center justify-between gap-2">
        <div class="flex min-w-0 flex-col">
            <h3 class="m-0 truncate font-main text-base font-bold normal-case leading-6">
                {$LL.externalModule.inventory.title()}
            </h3>
            <span class="truncate text-xs text-contrast-200">
                {$LL.externalModule.inventory.itemCount({ count: $inventoryItemsStore.length })}
            </span>
        </div>
        <button
            type="button"
            aria-label="Refresh inventory"
            data-testid="refreshInventoryButton"
            class="hover:bg-white/10 flex aspect-square h-7 w-7 items-center justify-center rounded !text-white"
            onclick={() => refreshInventory().catch(() => undefined)}
        >
            <IconRefresh font-size="16" />
        </button>
    </header>

    <div class="h-px bg-white/10" aria-hidden="true"></div>

    {#if $inventoryItemsStore.length > 0}
        <div class="min-h-0 flex-1 overflow-y-auto flex flex-col">
            {#each $inventoryItemsStore as entry (entry.item)}
                <div class="flex items-center gap-2.5 border-b border-white/10 px-1 py-2">
                    <span class="rounded-md bg-white/10 px-1.5 py-0.5 text-xs font-bold tabular-nums">
                        {entry.qty}
                    </span>
                    <span class="min-w-0 flex-1 truncate text-sm">{displayName(entry.item)}</span>
                </div>
            {/each}
        </div>
    {:else}
        <p class="m-0 text-sm text-contrast-200">{$LL.externalModule.inventory.empty()}</p>
    {/if}
</div>
