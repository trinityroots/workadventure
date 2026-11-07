<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { buyItem, closeShop, rerollItem, sellItem, shopStore, usePotion } from "../../Services/shop";
    import type { ShopItem } from "../../Services/shop";
    import { playSfx } from "../../Services/gameSfx";
    import { iconUrl, itemDef } from "../Inventory/items";
    import FloatingWindow from "../GameWindow/FloatingWindow.svelte";

    let remaining = $state("");
    let selected = $state<string | null>(null);
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
        const catalog: Slot[] = $shopStore.catalog.map((item) => ({
            id: item.id,
            owned: false,
            qty: 0,
            name: item.name,
            detail: itemDetail(item),
            price: item.price,
        }));
        const owned: Slot[] = $shopStore.owned.map((entry) => ({
            id: entry.item,
            owned: true,
            qty: entry.qty,
            roll: entry.roll,
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
            const price = slot.price ?? Number.POSITIVE_INFINITY;
            return {
                label: $LL.shop.buy(),
                price,
                disabled: $shopStore.gold < price,
                run: () => run(() => buyItem(slot.id, 1), "coin"),
            };
        }
        if (!slot.owned) {
            const price = slot.price ?? Number.POSITIVE_INFINITY;
            return {
                label: npcId === "rilla" ? $LL.shop.sell() : $LL.shop.buy(),
                price,
                disabled: $shopStore.gold < price,
                run: () => run(() => buyItem(slot.id, 1), "coin"),
            };
        }
        if (npcId === "rilla") {
            const item = lookup(slot.id);
            return {
                label: $LL.shop.sell(),
                price: Math.floor((item?.price ?? 0) / 2),
                disabled: item === undefined,
                run: () => run(() => sellItem(slot.id, 1), "coin"),
            };
        }
        if (npcId === "moss" && lookup(slot.id)?.rollMax) {
            return {
                label: $LL.shop.reroll(),
                price: $shopStore.rerollCost,
                disabled: $shopStore.gold < $shopStore.rerollCost,
                run: () => run(() => rerollItem(slot.id), "ding"),
            };
        }
        if (lookup(slot.id)?.kind === "potion") {
            return { label: $LL.shop.use(), disabled: false, run: () => run(() => usePotion(slot.id), "ding") };
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
            <div class="mb-2 text-xs text-red-400">{$LL.shop.error()}</div>
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
                        {#each slots as slot (slot.id)}
                            <button
                                type="button"
                                class="relative aspect-square rounded border-2 {selected === slot.id
                                    ? 'border-pop-yellow bg-[#f3e6c8]'
                                    : 'border-[#b89a5a] bg-[#e8d3ab] hover:border-[#8a6d1f]'}"
                                class:slot-burst={flashId === slot.id}
                                title={slot.name}
                                aria-label={slot.name}
                                onclick={() => (selected = slot.id)}
                            >
                                <img
                                    src={iconUrl(itemDef(slot.id).icon)}
                                    alt=""
                                    class="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 [image-rendering:pixelated]"
                                />
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
