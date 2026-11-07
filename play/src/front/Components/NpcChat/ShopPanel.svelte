<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { buyItem, closeShop, rerollItem, sellItem, shopStore, usePotion } from "../../Services/shop";
    import type { ShopItem } from "../../Services/shop";
    import { playSfx } from "../../Services/gameSfx";
    import { iconUrl, itemDef } from "../Inventory/items";
    import FloatingWindow from "../GameWindow/FloatingWindow.svelte";

    let remaining = $state("");
    let selected = $state<string | null>(null);
    let qty = $state(1);
    let flashId = $state<string | null>(null);
    let goldPop = $state(false);

    // Station art per shop, the way craft stations anchor the middle pane.
    const stations: Record<string, string> = {
        bram: "⚒",
        moss: "🔨",
        nell: "⚗",
        rilla: "🛍",
        sable: "🏮",
    };

    interface Slot {
        id: string;
        owned: boolean;
        qty: number;
        roll?: number;
        equipped?: boolean;
        name: string;
        detail: string;
        price?: number;
    }

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

    // Switching NPCs resets the selection; refreshes of the same shop keep it.
    let lastNpcId = "";
    $effect(() => {
        const npcId = $shopStore.npc?.id ?? "";
        if (npcId !== lastNpcId) {
            lastNpcId = npcId;
            selected = null;
            qty = 1;
        }
    });

    function lookup(id: string): ShopItem | undefined {
        return (
            $shopStore.items.find((entry) => entry.id === id) ??
            $shopStore.market?.stock.find((line) => line.itemId === id)?.item
        );
    }

    function itemDetail(item: ShopItem | undefined): string {
        if (!item) return "";
        if (item.kind === "potion") return item.description;
        return `${$LL.shop.attack()}: ${item.attack ?? 0}`;
    }

    // A successful action bursts the slot, pops the gold chip and plays its effect.
    function run(action: () => Promise<void>, sfx: "coin" | "ding"): void {
        action()
            .then(() => {
                if (selected) {
                    flashId = selected;
                    setTimeout(() => (flashId = null), 600);
                }
                goldPop = true;
                setTimeout(() => (goldPop = false), 400);
                playSfx(sfx);
            })
            .catch(() => undefined);
    }

    const slots = $derived.by((): Slot[] => {
        if ($shopStore.npc?.id === "sable") {
            return ($shopStore.market?.stock ?? []).map((line) => ({
                id: line.itemId,
                owned: false,
                qty: line.qty,
                name: line.item?.name ?? line.itemId,
                detail: line.item?.description ?? "",
                price: line.item?.price ?? undefined,
            }));
        }
        const npcId = $shopStore.npc?.id ?? "";
        const catalog: Slot[] = $shopStore.catalog.map((item) => ({
            id: item.id,
            owned: false,
            qty: 0,
            name: item.name,
            detail: itemDetail(item),
            price: item.price,
        }));
        // Owned gear only matters where it can be acted on: Rilla sells, Moss rerolls.
        // Bram, Nell and Sable are pure shops — potions are used from the Inventory.
        const showOwned = npcId === "rilla" || npcId === "moss";
        const owned: Slot[] = (showOwned ? $shopStore.owned : []).map((entry) => ({
            id: entry.item,
            owned: true,
            qty: entry.qty,
            roll: entry.roll,
            equipped: entry.equipped,
            name: lookup(entry.item)?.name ?? entry.item,
            detail: itemDetail(lookup(entry.item)),
        }));
        return [...catalog, ...owned];
    });

    const selectedSlot = $derived(slots.find((slot) => slot.id === selected) ?? null);
    const isSable = $derived($shopStore.npc?.id === "sable");

    interface ShopAction {
        label: string;
        price?: number;
        disabled: boolean;
        run: () => void;
    }

    const action = $derived.by((): ShopAction | null => {
        const slot = selectedSlot;
        const npcId = $shopStore.npc?.id;
        if (!slot || !npcId) return null;
        if (isSable) {
            const price = (slot.price ?? Number.POSITIVE_INFINITY) * qty;
            return {
                label: $LL.shop.buy(),
                price,
                disabled: $shopStore.gold < price,
                run: () => run(() => buyItem(slot.id, qty), "coin"),
            };
        }
        if (!slot.owned) {
            const unit = slot.price ?? Number.POSITIVE_INFINITY;
            const price = unit * qty;
            return {
                label: npcId === "rilla" ? $LL.shop.sell() : $LL.shop.buy(),
                price,
                disabled: $shopStore.gold < price,
                run: () => run(() => buyItem(slot.id, qty), "coin"),
            };
        }
        if (npcId === "rilla") {
            const item = lookup(slot.id);
            const credit = Math.floor((item?.price ?? 0) / 2) * qty;
            return {
                label: $LL.shop.sell(),
                price: credit,
                disabled: slot.equipped === true || item === undefined || qty > slot.qty,
                run: () => run(() => sellItem(slot.id, qty), "coin"),
            };
        }
        if (npcId === "moss" && lookup(slot.id)?.rollMax) {
            return {
                label: $LL.shop.reroll(),
                price: $shopStore.rerollCost,
                disabled: slot.equipped === true || $shopStore.gold < $shopStore.rerollCost,
                run: () => run(() => rerollItem(slot.id), "ding"),
            };
        }
        if (lookup(slot.id)?.kind === "potion") {
            return { label: $LL.shop.use(), disabled: false, run: () => run(() => usePotion(slot.id), "ding") };
        }
        return null;
    });

    // One-click quantities: sell the whole stack at Rilla, spend as much gold as possible elsewhere.
    const shortcut = $derived.by((): ShopAction | null => {
        const slot = selectedSlot;
        const npcId = $shopStore.npc?.id;
        if (!slot || !npcId || !action) return null;
        if (npcId === "rilla" && slot.owned && slot.qty > 1) {
            const item = lookup(slot.id);
            return {
                label: $LL.shop.sellAll(),
                price: Math.floor((item?.price ?? 0) / 2) * slot.qty,
                disabled: slot.equipped === true,
                run: () => run(() => sellItem(slot.id, slot.qty), "coin"),
            };
        }
        if (!slot.owned && slot.price !== undefined && slot.price > 0 && npcId !== "rilla") {
            const max = Math.min(99, Math.floor($shopStore.gold / slot.price));
            if (max < 1) return null;
            return {
                label: $LL.shop.buyMax(),
                price: slot.price * max,
                disabled: false,
                run: () => run(() => buyItem(slot.id, max), "coin"),
            };
        }
        return null;
    });
</script>

{#if $shopStore.npc}
    <FloatingWindow title={$shopStore.npc.name} onClose={closeShop} testid="shop-panel" widthClass="w-[460px]">
        {#snippet headerExtra()}
            <span
                class="rounded border border-pop-yellow/40 bg-black/40 px-2 py-0.5 font-mono text-xs text-pop-yellow"
                class:gold-pop={goldPop}
            >
                {$LL.shop.gold()}: {$shopStore.gold}
            </span>
        {/snippet}

        {#if $shopStore.error}
            <div class="mb-2 text-xs text-red-400">{$shopStore.error}</div>
        {/if}
        {#if $shopStore.npc.id === "sable" && !$shopStore.market?.open}
            <div class="text-sm text-white/60">{$LL.shop.closed()}</div>
        {:else if !slots.length && !$shopStore.loading}
            <div class="text-sm text-white/60">{$LL.shop.empty()}</div>
        {:else}
            {#if $shopStore.npc.id === "sable"}
                <div class="mb-2 font-mono text-xs text-pop-yellow">⏳ {$LL.shop.closesIn()}: {remaining}</div>
            {/if}

            <div class="flex items-start gap-2">
                <!-- Left: item slots -->
                <div class="w-[40%] rounded-md border-2 border-[#5a4020] bg-[#6b4a2b] p-1.5">
                    <div class="grid grid-cols-3 gap-1.5">
                        {#each slots as slot (slot.id + (slot.owned ? "-own" : "-cat"))}
                            <button
                                type="button"
                                class="relative aspect-square rounded border-2 {selected === slot.id
                                    ? 'border-pop-yellow bg-[#f3e6c8]'
                                    : 'border-[#b89a5a] bg-[#e8d3ab] hover:border-[#8a6d1f]'}"
                                class:slot-burst={flashId === slot.id}
                                title={slot.equipped ? `${slot.name} — equipped` : slot.name}
                                aria-label={slot.name}
                                onclick={() => {
                                    selected = slot.id;
                                    qty = 1;
                                }}
                            >
                                <img
                                    src={iconUrl(itemDef(slot.id).icon)}
                                    alt=""
                                    class="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 [image-rendering:pixelated]"
                                />
                                {#if slot.equipped}
                                    <span class="absolute right-0.5 top-0.5 text-[10px] leading-none" aria-hidden="true"
                                        >🚫</span
                                    >
                                {/if}
                                {#if slot.roll !== undefined}
                                    <span
                                        class="absolute left-0.5 top-0.5 font-mono text-[9px] font-bold leading-none text-[#8a6d1f] [text-shadow:0_1px_0_#f3e6c8]"
                                    >
                                        +{slot.roll}
                                    </span>
                                {/if}
                                {#if slot.owned && slot.qty > 1}
                                    <span
                                        class="absolute bottom-0.5 right-1 font-mono text-[9px] font-bold leading-none text-[#3a2c1a]"
                                    >
                                        {slot.qty}
                                    </span>
                                {:else if !slot.owned && slot.qty > 0}
                                    <span
                                        class="absolute bottom-0.5 right-1 font-mono text-[9px] font-bold leading-none text-[#3a2c1a]"
                                    >
                                        {slot.qty}
                                    </span>
                                {/if}
                            </button>
                        {/each}
                    </div>
                    <div class="mt-1.5 flex justify-between border-t-2 border-dashed border-[#a87b52] pt-1.5 px-0.5">
                        <span class="font-mono text-[10px] font-bold text-[#f7ecd4]">✦ {$shopStore.gold}</span>
                        <span class="font-mono text-[10px] text-[#e8d3ab]">
                            {$LL.shop.owned()}: {$shopStore.owned.length}
                        </span>
                    </div>
                </div>

                <!-- Middle: selection + station + action -->
                <div class="flex w-[28%] flex-col items-center gap-2">
                    <div class="flex h-14 w-14 items-center justify-center">
                        {#if selectedSlot}
                            <img
                                src={iconUrl(itemDef(selectedSlot.id).icon)}
                                alt=""
                                class="h-12 w-12 [image-rendering:pixelated]"
                            />
                        {/if}
                    </div>
                    {#if action}
                        {#if selectedSlot && ($shopStore.npc?.id === "rilla" || !selectedSlot.owned)}
                            <input
                                type="number"
                                min="1"
                                max={selectedSlot.owned ? selectedSlot.qty : 99}
                                bind:value={qty}
                                aria-label="Quantity"
                                class="w-16 rounded border border-[#b89a5a] bg-[#f3e6c8] px-1 py-0.5 text-center font-mono text-xs text-[#3a2c1a]"
                            />
                        {/if}
                        <button
                            type="button"
                            class="w-full rounded border-2 border-[#2c5a28] bg-[#3f7d3a] px-2 py-1.5 font-mono text-xs font-bold text-white shadow hover:brightness-110 disabled:opacity-40"
                            disabled={action.disabled}
                            onclick={action.run}
                        >
                            {action.label}
                            {#if action.price !== undefined && Number.isFinite(action.price)}
                                ✦ {action.price}
                            {/if}
                        </button>
                        {#if shortcut}
                            <button
                                type="button"
                                class="w-full rounded border-2 border-[#8a6d1f] bg-[#c9a24b] px-2 py-1 font-mono text-xs font-bold text-[#3a2c1a] shadow hover:brightness-110 disabled:opacity-40"
                                disabled={shortcut.disabled}
                                onclick={shortcut.run}
                            >
                                {shortcut.label}
                                {#if shortcut.price !== undefined && Number.isFinite(shortcut.price)}
                                    ✦ {shortcut.price}
                                {/if}
                            </button>
                        {/if}
                    {/if}
                    <div class="select-none text-center text-4xl leading-none" aria-hidden="true">
                        {stations[$shopStore.npc.id] ?? "⚒"}
                    </div>
                </div>

                <!-- Right: description parchment -->
                <div class="w-[32%] rounded-md border-2 border-[#5a4020] bg-[#f7ecd4] text-[#3a2c1a]">
                    <div
                        class="border-b-2 border-[#a87b52] bg-[#e0cba0] px-2 py-1 text-center font-mono text-[10px] font-bold tracking-widest"
                    >
                        DESCRIPTION
                    </div>
                    {#if selectedSlot}
                        <div class="p-2">
                            <div class="mb-1 text-center">
                                <img
                                    src={iconUrl(itemDef(selectedSlot.id).icon)}
                                    alt=""
                                    class="mx-auto h-10 w-10 [image-rendering:pixelated]"
                                />
                            </div>
                            <div class="text-center text-xs font-bold">{selectedSlot.name}</div>
                            <div class="mt-1 text-[10px] leading-snug text-[#6b5a3f]">{selectedSlot.detail}</div>
                            <div class="mt-1.5 space-y-0.5 border-t border-dashed border-[#b89a5a] pt-1.5">
                                {#if selectedSlot.roll !== undefined}
                                    <div class="font-mono text-[11px]">◆ +{selectedSlot.roll}</div>
                                {/if}
                                {#if lookup(selectedSlot.id)?.rollMax}
                                    <div class="font-mono text-[11px] text-[#8a6d1f]">
                                        ◆ max +{lookup(selectedSlot.id)?.rollMax}
                                    </div>
                                {/if}
                                {#if selectedSlot.price !== undefined}
                                    <div class="font-mono text-[11px] text-[#8a6d1f]">◆ {selectedSlot.price}</div>
                                {/if}
                                {#if selectedSlot.owned}
                                    <div class="font-mono text-[11px] text-[#6b5a3f]">◆ x{selectedSlot.qty}</div>
                                {/if}
                            </div>
                        </div>
                    {:else}
                        <div class="p-2 text-center text-[10px] text-[#8a7a5f]">Pick an item →</div>
                    {/if}
                </div>
            </div>
        {/if}
    </FloatingWindow>
{/if}

<style>
    @keyframes slot-burst {
        0% {
            box-shadow: 0 0 0 0 rgba(249, 232, 30, 0.9);
            transform: scale(1);
        }
        40% {
            transform: scale(1.12);
        }
        100% {
            box-shadow: 0 0 0 12px rgba(249, 232, 30, 0);
            transform: scale(1);
        }
    }
    .slot-burst {
        animation: slot-burst 0.55s ease-out;
    }

    @keyframes gold-pop {
        50% {
            transform: scale(1.2);
        }
    }
    .gold-pop {
        display: inline-block;
        animation: gold-pop 0.35s ease;
    }
</style>
