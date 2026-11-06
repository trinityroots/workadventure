<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { npcRoleIconSvg } from "../../Phaser/Components/npcRoleIcons";
    import { buyItem, closeShop, rerollItem, sellItem, shopStore, usePotion } from "../../Services/shop";
    import type { ShopItem } from "../../Services/shop";

    let remaining = $state("");

    $effect(() => {
        const closesAt = $shopStore.market?.closesAt;
        if (!closesAt) {
            remaining = "";
            return;
        }
        const update = () => {
            const ms = new Date(closesAt).getTime() - Date.now();
            if (ms <= 0) {
                remaining = "00:00";
                return;
            }
            const minutes = Math.floor(ms / 60_000);
            const seconds = Math.floor((ms % 60_000) / 1000);
            remaining = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        };
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    });

    function lookup(id: string): ShopItem | undefined {
        return (
            $shopStore.items.find((entry) => entry.id === id) ??
            $shopStore.market?.stock.find((line) => line.itemId === id)?.item
        );
    }

    function itemName(id: string): string {
        return lookup(id)?.name ?? id;
    }

    function itemDetail(item: ShopItem | undefined): string {
        if (!item) return "";
        if (item.kind === "potion") return item.description;
        return `${$LL.shop.attack()}: ${item.attack ?? 0}`;
    }

    function run(action: () => Promise<void>): void {
        action().catch(() => undefined);
    }
</script>

{#if $shopStore.npc}
    <aside
        class="fixed top-0 right-0 z-[300] flex h-full w-[340px] max-w-[92vw] flex-col border-s border-white/10 bg-contrast/95 backdrop-blur-md"
        data-testid="shop-panel"
    >
        <header class="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <span class="text-white/80" aria-hidden="true">
                <!-- Icon markup comes from the fixed npcRoleIcons table, never from user input. -->
                {@html npcRoleIconSvg($shopStore.npc.icon)}
                <!-- eslint-disable-line svelte/no-at-html-tags -->
            </span>
            <span class="flex-1 truncate text-sm font-semibold text-white">{$shopStore.npc.name}</span>
            <span class="rounded bg-black/40 px-2 py-0.5 text-xs text-yellow-300">
                {$LL.shop.gold()}: {$shopStore.gold}
            </span>
            <button
                type="button"
                class="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Close"
                onclick={closeShop}
            >
                ✕
            </button>
        </header>

        <div class="flex flex-1 flex-col gap-3 overflow-y-auto p-3 no-scroll-bar">
            {#if $shopStore.loading}
                <div class="text-xs italic text-white/50">{$LL.npcChat.thinking()}</div>
            {/if}
            {#if $shopStore.error}
                <div class="text-xs text-red-400">{$LL.shop.error()}</div>
            {/if}

            {#if $shopStore.npc.id === "sable"}
                {#if !$shopStore.market?.open}
                    <div class="text-sm text-white/60">{$LL.shop.closed()}</div>
                {:else}
                    <div class="text-xs text-white/50">
                        {$LL.shop.closesIn()}: {remaining}
                    </div>
                    {#each $shopStore.market.stock as line (line.itemId)}
                        <div class="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5">
                            <div class="min-w-0 flex-1">
                                <div class="truncate text-sm text-white">{line.item?.name ?? line.itemId}</div>
                                <div class="truncate text-xs text-white/50">
                                    {line.item?.description ?? ""} · x{line.qty}
                                </div>
                            </div>
                            <button
                                type="button"
                                class="rounded bg-primary px-2 py-1 text-xs text-white disabled:opacity-40"
                                disabled={$shopStore.gold < (line.item?.price ?? Infinity)}
                                onclick={() => run(() => buyItem(line.itemId, 1))}
                            >
                                {line.item?.price ?? "?"}
                            </button>
                        </div>
                    {/each}
                {/if}
            {:else}
                {#each $shopStore.catalog as item (item.id)}
                    <div class="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5">
                        <div class="min-w-0 flex-1">
                            <div class="truncate text-sm text-white">{item.name}</div>
                            <div class="truncate text-xs text-white/50">{itemDetail(item)}</div>
                        </div>
                        <button
                            type="button"
                            class="rounded bg-primary px-2 py-1 text-xs text-white disabled:opacity-40"
                            disabled={$shopStore.gold < item.price}
                            onclick={() => run(() => buyItem(item.id, 1))}
                        >
                            {$shopStore.npc.id === "rilla" ? $LL.shop.sell() : $LL.shop.buy()}
                            {item.price}
                        </button>
                    </div>
                {/each}

                {#if $shopStore.owned.length}
                    <div class="mt-1 text-xs uppercase tracking-wide text-white/40">{$LL.shop.owned()}</div>
                {/if}
                {#each $shopStore.owned as owned (owned.item)}
                    {@const item = lookup(owned.item)}
                    <div class="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5">
                        <div class="min-w-0 flex-1">
                            <div class="truncate text-sm text-white">
                                {itemName(owned.item)}
                                {#if owned.roll !== undefined}
                                    <span class="text-xs text-white/50">+{owned.roll}</span>
                                {/if}
                                <span class="text-xs text-white/40">x{owned.qty}</span>
                            </div>
                            <div class="truncate text-xs text-white/50">{itemDetail(item)}</div>
                        </div>
                        {#if $shopStore.npc.id === "rilla"}
                            <button
                                type="button"
                                class="rounded bg-primary px-2 py-1 text-xs text-white disabled:opacity-40"
                                disabled={item === undefined}
                                onclick={() => run(() => sellItem(owned.item, 1))}
                            >
                                {$LL.shop.sell()}
                                {Math.floor((item?.price ?? 0) / 2)}
                            </button>
                        {:else if $shopStore.npc.id === "moss" && item?.rollMax}
                            <button
                                type="button"
                                class="rounded bg-primary px-2 py-1 text-xs text-white disabled:opacity-40"
                                disabled={$shopStore.gold < $shopStore.rerollCost}
                                onclick={() => run(() => rerollItem(owned.item))}
                            >
                                {$LL.shop.reroll()}
                                {$shopStore.rerollCost}
                            </button>
                        {:else if item?.kind === "potion"}
                            <button
                                type="button"
                                class="rounded bg-primary px-2 py-1 text-xs text-white"
                                onclick={() => run(() => usePotion(owned.item))}
                            >
                                {$LL.shop.use()}
                            </button>
                        {/if}
                    </div>
                {/each}

                {#if !$shopStore.catalog.length && !$shopStore.owned.length}
                    <div class="text-sm text-white/60">{$LL.shop.empty()}</div>
                {/if}
            {/if}
        </div>
    </aside>
{/if}
