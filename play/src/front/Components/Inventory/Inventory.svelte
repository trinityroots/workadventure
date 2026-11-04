<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import { equippedStore, equipItem, inventoryItemsStore, unequipSlot } from "../../Stores/InventoryStore";
    import { loadEquipment, refreshInventory, saveEquipment } from "../../Services/InventoryLoader";
    import { EQUIP_SLOTS, iconUrl, itemDef, type EquipSlot } from "./items";
    import { IconRefresh, IconUser } from "@wa-icons";

    $effect(() => {
        // An effect must not reject; the loaders log their own failures.
        refreshInventory().catch(() => undefined);
        loadEquipment().catch(() => undefined);
    });

    let equipped = $derived($equippedStore);
    let wornKeys = $derived(
        new Set(
            Object.values(equipped)
                .filter((key): key is string => Boolean(key))
                .map((key) => key.trim().toLowerCase()),
        ),
    );
    let bag = $derived($inventoryItemsStore.filter((entry) => !wornKeys.has(entry.item.trim().toLowerCase())));
    // A bag reads as a grid even when nearly empty: three rows of four at least.
    let cells = $derived(Math.max(12, Math.ceil(bag.length / 4) * 4));

    function onBagClick(key: string): void {
        const def = itemDef(key);
        if (!def.slot) return;
        equipItem(key, def.slot);
        saveEquipment().catch(() => undefined);
    }

    function onSlotClick(slot: EquipSlot): void {
        unequipSlot(slot);
        saveEquipment().catch(() => undefined);
    }
</script>

<div class="flex h-full min-h-0 flex-col gap-2 p-3 select-text">
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
            aria-label={$LL.externalModule.inventory.refresh()}
            data-testid="refreshInventoryButton"
            class="hover:bg-white/10 flex aspect-square h-7 w-7 items-center justify-center rounded !text-white"
            onclick={() => refreshInventory()}
        >
            <IconRefresh font-size="16" />
        </button>
    </header>

    <div class="h-px bg-white/10" aria-hidden="true"></div>

    {#snippet slotChip({ slot, icon }: { slot: EquipSlot; icon: string })}
        {@const wornKey = equipped[slot]}
        {#if wornKey}
            <button
                type="button"
                title={itemDef(wornKey).name}
                aria-label={itemDef(wornKey).name}
                data-testid="slot-{slot}"
                class="flex h-11 w-11 items-center justify-center rounded-md border border-light-blue/60 bg-white/5 hover:border-danger-600/70"
                onclick={() => onSlotClick(slot)}
            >
                <img src={iconUrl(itemDef(wornKey).icon)} alt="" class="h-7 w-7 [image-rendering:pixelated]" />
            </button>
        {:else}
            <div class="flex h-11 w-11 items-center justify-center rounded-md border border-dashed border-white/25">
                <img src={iconUrl(icon)} alt="" class="h-7 w-7 opacity-25 [image-rendering:pixelated]" />
            </div>
        {/if}
    {/snippet}

    <div class="flex items-center justify-center gap-3 py-1">
        <div class="flex flex-col gap-1.5">
            {#each EQUIP_SLOTS.slice(0, 3) as entry (entry.slot)}
                {@render slotChip(entry)}
            {/each}
        </div>

        <div class="flex h-24 w-16 items-center justify-center rounded-lg border border-white/10 bg-white/5">
            <IconUser class="h-10 w-10 text-contrast-200 opacity-60" />
        </div>

        <div class="flex flex-col gap-1.5">
            {#each EQUIP_SLOTS.slice(3) as entry (entry.slot)}
                {@render slotChip(entry)}
            {/each}
        </div>
    </div>

    {#if $inventoryItemsStore.length > 0}
        <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase text-contrast-200">{$LL.externalModule.inventory.bag()}</span>
            <span class="text-xs text-contrast-200">{bag.length}</span>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto">
            <div class="grid grid-cols-4 gap-1">
                {#each Array.from({ length: cells }, (_, index) => index) as index (index)}
                    {@const entry = bag[index]}
                    {#if entry}
                        <button
                            type="button"
                            title={itemDef(entry.item).name}
                            aria-label="{itemDef(entry.item).name} × {entry.qty}"
                            data-testid="bag-{entry.item}"
                            class="relative aspect-square rounded-sm border border-white/15 bg-contrast/70 transition-colors hover:border-light-blue/70"
                            onclick={() => onBagClick(entry.item)}
                        >
                            <img
                                src={iconUrl(itemDef(entry.item).icon)}
                                alt={itemDef(entry.item).name}
                                class="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 [image-rendering:pixelated]"
                            />
                            <span
                                class="absolute left-1 top-0.5 text-[10px] font-bold leading-none text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.9)]"
                            >
                                {entry.qty}
                            </span>
                        </button>
                    {:else}
                        <div class="aspect-square rounded-sm border border-white/10 bg-contrast/40"></div>
                    {/if}
                {/each}
            </div>
        </div>
    {:else}
        <p class="m-0 text-sm text-contrast-200">{$LL.externalModule.inventory.empty()}</p>
    {/if}
</div>
