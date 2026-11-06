<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import {
        acceptTrade,
        cancelTrade,
        closeTradePanel,
        confirmTrade,
        declineTrade,
        inviteTrade,
        setTradeOffer,
        tradeStore,
    } from "../../Services/trade";
    import { npcRoleIconSvg } from "../../Phaser/Components/npcRoleIcons";

    let offered = $state<Record<string, number>>({});
    let offeredGold = $state(0);
    let picking = $state(false);

    const active = $derived(
        [...$tradeStore.incoming, ...$tradeStore.outgoing].find((trade) => trade.status === "open"),
    );
    const invites = $derived($tradeStore.incoming.filter((trade) => trade.status === "pending"));
    const outgoingInvites = $derived($tradeStore.outgoing.filter((trade) => trade.status === "pending"));
    const mine = $derived(active ? (active.fromUser === $tradeStore.email ? "from" : "to") : "from");
    const myOffer = $derived(active ? (mine === "from" ? active.fromItems : active.toItems) : []);
    const theirOffer = $derived(active ? (mine === "from" ? active.toItems : active.fromItems) : []);
    const myGold = $derived(active ? (mine === "from" ? active.fromGold : active.toGold) : 0);
    const theirGold = $derived(active ? (mine === "from" ? active.toGold : active.fromGold) : 0);
    const myConfirmed = $derived(active ? (mine === "from" ? active.fromConfirm : active.toConfirm) : false);
    const theirConfirmed = $derived(active ? (mine === "from" ? active.toConfirm : active.fromConfirm) : false);

    function partner(trade: { fromUser: string; toUser: string }): string {
        return trade.fromUser === $tradeStore.email ? trade.toUser : trade.fromUser;
    }

    function name(email: string): string {
        return $tradeStore.online.find((player) => player.email === email)?.name ?? email.split("@")[0];
    }

    function itemName(id: string): string {
        return $tradeStore.catalog.find((entry) => entry.id === id)?.name ?? id;
    }

    function run(action: Promise<unknown>): void {
        action.catch(() => undefined);
    }

    function resetOffer(): void {
        offered = {};
        for (const line of myOffer) offered[line.item] = line.qty;
        offeredGold = myGold;
    }

    let offerKey = $state("");

    // Re-seed the editor whenever the server-side offer changes (partner edit, new trade).
    $effect(() => {
        const next = active ? `${active.id}:${myGold}:${JSON.stringify(myOffer)}` : "";
        if (next !== offerKey) {
            offerKey = next;
            resetOffer();
        }
    });

    function submitOffer(): void {
        if (!active) return;
        const items = Object.entries(offered)
            .filter(([, qty]) => qty > 0)
            .map(([item, qty]) => ({ item, qty }));
        run(setTradeOffer(active.id, items, offeredGold));
    }

    function invite(email: string): void {
        run(inviteTrade(email));
        picking = false;
    }
</script>

{#if $tradeStore.open}
    <aside
        class="fixed top-0 right-0 z-[300] flex h-full w-[340px] max-w-[92vw] flex-col border-s border-white/10 bg-contrast/95 backdrop-blur-md"
        data-testid="trade-panel"
    >
        <header class="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <span class="text-white/80" aria-hidden="true">
                <!-- Icon markup comes from the fixed npcRoleIcons table, never from user input. -->
                {@html npcRoleIconSvg("coin")}
                <!-- eslint-disable-line svelte/no-at-html-tags -->
            </span>
            <span class="flex-1 text-sm font-semibold text-white">{$LL.trade.title()}</span>
            <button
                type="button"
                class="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Close"
                onclick={closeTradePanel}
            >
                ✕
            </button>
        </header>

        <div class="flex-1 overflow-y-auto p-3 no-scroll-bar text-white">
            {#each invites as trade (trade.id)}
                <div class="mb-2 rounded-md bg-white/10 px-2 py-1.5">
                    <div class="text-xs">{$LL.trade.inviteFrom({ name: name(trade.fromUser) })}</div>
                    <div class="mt-1 flex gap-2">
                        <button
                            type="button"
                            class="rounded bg-primary px-2 py-0.5 text-xs text-white hover:opacity-90"
                            onclick={() => run(acceptTrade(trade.id))}
                        >
                            {$LL.trade.accept()}
                        </button>
                        <button
                            type="button"
                            class="rounded bg-white/10 px-2 py-0.5 text-xs text-white hover:bg-white/20"
                            onclick={() => run(declineTrade(trade.id))}
                        >
                            {$LL.trade.decline()}
                        </button>
                    </div>
                </div>
            {/each}

            {#if active}
                <div class="mb-2 flex items-center justify-between text-xs text-white/60">
                    <span>{$LL.trade.partner({ name: name(partner(active)) })}</span>
                    <button
                        type="button"
                        class="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20"
                        onclick={() => run(cancelTrade(active.id))}
                    >
                        {$LL.trade.cancel()}
                    </button>
                </div>

                <div class="mb-2 rounded-md bg-white/5 p-2 text-xs">
                    <div class="mb-1 font-medium">{$LL.trade.theirOffer()}</div>
                    {#each theirOffer as line (line.item)}
                        <div class="flex justify-between text-white/80">
                            <span>{itemName(line.item)}</span>
                            <span>×{line.qty}</span>
                        </div>
                    {/each}
                    {#if theirGold > 0}
                        <div class="flex justify-between text-white/80">
                            <span>{$LL.trade.gold()}</span>
                            <span>{theirGold}</span>
                        </div>
                    {/if}
                    {#if theirOffer.length === 0 && theirGold === 0}
                        <div class="text-white/40">{$LL.trade.emptyOffer()}</div>
                    {/if}
                    <div class="mt-1 text-[11px] text-white/50">
                        {theirConfirmed ? $LL.trade.confirmed() : $LL.trade.waiting()}
                    </div>
                </div>

                <div class="rounded-md bg-white/5 p-2 text-xs">
                    <div class="mb-1 font-medium">{$LL.trade.myOffer()}</div>
                    {#each $tradeStore.items as item (item.item)}
                        <div class="flex items-center gap-2">
                            <span class="flex-1 truncate text-white/80">{item.name}</span>
                            <span class="text-white/40">/{item.qty}</span>
                            <input
                                type="number"
                                min="0"
                                max={item.qty}
                                class="w-14 rounded border border-white/10 bg-black/30 px-1 py-0.5 text-right text-white"
                                value={offered[item.item] ?? 0}
                                oninput={(event) =>
                                    (offered[item.item] = Math.max(
                                        0,
                                        Math.min(item.qty, Number(event.currentTarget.value)),
                                    ))}
                            />
                        </div>
                    {/each}
                    <div class="mt-1 flex items-center gap-2">
                        <span class="flex-1 text-white/80">{$LL.trade.gold()} ({$tradeStore.gold})</span>
                        <input
                            type="number"
                            min="0"
                            max={$tradeStore.gold}
                            class="w-16 rounded border border-white/10 bg-black/30 px-1 py-0.5 text-right text-white"
                            value={offeredGold}
                            oninput={(event) =>
                                (offeredGold = Math.max(
                                    0,
                                    Math.min($tradeStore.gold, Number(event.currentTarget.value)),
                                ))}
                        />
                    </div>
                    <div class="mt-2 flex gap-2">
                        <button
                            type="button"
                            class="flex-1 rounded bg-white/10 px-2 py-1 hover:bg-white/20"
                            onclick={submitOffer}
                        >
                            {$LL.trade.updateOffer()}
                        </button>
                        <button
                            type="button"
                            class="flex-1 rounded bg-primary px-2 py-1 text-white hover:opacity-90 disabled:opacity-50"
                            disabled={myConfirmed}
                            onclick={() => run(confirmTrade(active.id))}
                        >
                            {myConfirmed ? $LL.trade.confirmed() : $LL.trade.confirm()}
                        </button>
                    </div>
                    {#if myConfirmed && !theirConfirmed}
                        <div class="mt-1 text-[11px] text-white/50">{$LL.trade.waiting()}</div>
                    {/if}
                </div>
            {:else}
                {#each outgoingInvites as trade (trade.id)}
                    <div class="mb-2 rounded-md bg-white/5 px-2 py-1.5 text-xs text-white/70">
                        {$LL.trade.inviteSent({ name: name(trade.toUser) })}
                        <button
                            type="button"
                            class="ml-1 rounded bg-white/10 px-1.5 py-0.5 hover:bg-white/20"
                            onclick={() => run(cancelTrade(trade.id))}
                        >
                            {$LL.trade.cancel()}
                        </button>
                    </div>
                {/each}

                <button
                    type="button"
                    class="w-full rounded-md bg-white/10 px-2 py-1.5 text-xs hover:bg-white/20"
                    onclick={() => (picking = !picking)}
                >
                    {$LL.trade.invite()}
                </button>
                {#if picking}
                    <div class="mt-1">
                        {#each $tradeStore.online as player (player.email)}
                            <button
                                type="button"
                                class="flex w-full items-center justify-between rounded px-2 py-1 text-xs hover:bg-white/10"
                                onclick={() => invite(player.email)}
                            >
                                <span>{player.name}</span>
                                <span class="text-[11px] text-white/40">{$LL.trade.invite()}</span>
                            </button>
                        {:else}
                            <div class="px-2 py-1 text-xs text-white/40">{$LL.trade.nobodyOnline()}</div>
                        {/each}
                    </div>
                {/if}
            {/if}

            {#if $tradeStore.error}
                <div class="mt-2 text-[11px] text-red-400">{$LL.trade.error()}</div>
            {/if}
        </div>
    </aside>
{/if}
