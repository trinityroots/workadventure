<script lang="ts">
    import { get } from "svelte/store";
    import { LL } from "../../../i18n/i18n-svelte";
    import { closeNpcChat, nearestNpc, npcChatStore, openNpcChat, sendNpcMessage } from "../../Services/npcList";
    import { closeLeaderboard, nearestBoard, openLeaderboard } from "../../Services/leaderboard";
    import { closeShop, openShop } from "../../Services/shop";
    import { inputFormFocusStore } from "../../Stores/UserInputStore";
    import { closeInventory } from "../Inventory/sidebar";
    import RpgDialog from "./RpgDialog.svelte";

    let text = $state("");
    let logElement: HTMLDivElement | undefined = $state();

    // Both arguments are reactive reads: the effect re-runs when a message lands or a reply is pending.
    function scheduleScroll(_messageCount: number, _sending: boolean): void {
        queueMicrotask(() => logElement?.scrollTo({ top: logElement.scrollHeight }));
    }

    $effect(() => scheduleScroll($npcChatStore.messages.length, $npcChatStore.sending));

    // X opens the nearest NPC when the player is already standing next to it;
    // clicking an NPC walks the player over first (GameScene.onNpcClicked).
    function onKeydown(event: KeyboardEvent): void {
        if (event.key !== "x" || event.ctrlKey || event.metaKey || event.altKey) return;
        if (get(inputFormFocusStore)) return;
        const target = event.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
        const npc = nearestNpc(120);
        if (npc) {
            closeLeaderboard();
            closeInventory();
            if (npc.kind === "shop") {
                closeNpcChat();
                openShop(npc).catch(() => undefined);
            } else {
                closeShop();
                openNpcChat(npc);
            }
            return;
        }
        const board = nearestBoard(120);
        if (board) {
            closeNpcChat();
            closeShop();
            closeInventory();
            openLeaderboard(board);
        }
    }

    async function send(): Promise<void> {
        const value = text;
        text = "";
        await sendNpcMessage(value);
    }
</script>

<svelte:window onkeydown={onKeydown} />

{#if $npcChatStore.npc}
    <RpgDialog
        icon={$npcChatStore.npc.icon}
        title={$npcChatStore.npc.name}
        onClose={closeNpcChat}
        testid="npc-chat-panel"
    >
        <div bind:this={logElement} class="flex flex-1 flex-col gap-2 overflow-y-auto p-3 no-scroll-bar">
            {#each $npcChatStore.messages as message, index (index)}
                <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
                    <div
                        class="max-w-[88%] whitespace-pre-wrap rounded-md px-3 py-2 text-sm
                            {message.role === 'user'
                            ? 'border border-[#d4c090] bg-[#f3e6c8] text-[#3a2c1a]'
                            : 'border border-white/15 border-l-2 border-l-pop-yellow bg-black/45 text-white/90'}"
                    >
                        {#if message.role !== "user"}
                            <div class="mb-0.5 font-mono text-[10px] uppercase tracking-widest text-pop-yellow/80">
                                ▸ {$npcChatStore.npc.name}
                            </div>
                        {/if}
                        {message.content}
                        {#if message.sources?.length}
                            <ul class="mt-1 space-y-0.5 border-t border-white/10 pt-1 text-xs text-white/60">
                                {#each message.sources as source (source.url)}
                                    <li class="truncate">
                                        <a
                                            href={source.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            class="hover:text-pop-yellow"
                                        >
                                            {source.title}
                                        </a>
                                    </li>
                                {/each}
                            </ul>
                        {/if}
                        {#if message.images?.length}
                            <div class="mt-1 grid grid-cols-2 gap-1 border-t border-white/10 pt-1">
                                {#each message.images as image (image.url)}
                                    <a href={image.url} target="_blank" rel="noreferrer">
                                        <img
                                            src={image.url}
                                            alt={image.title}
                                            loading="lazy"
                                            class="h-20 w-full rounded object-cover"
                                        />
                                    </a>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
            {#if $npcChatStore.sending}
                <div class="font-mono text-xs italic text-pop-yellow/80">{$LL.npcChat.thinking()}</div>
            {/if}
            {#if $npcChatStore.error}
                <div class="text-xs text-red-400">{$LL.npcChat.error()}</div>
            {/if}
        </div>

        <footer class="flex gap-2 border-t border-white/10 bg-black/25 p-2">
            <input
                class="flex-1 rounded-md border border-white/15 bg-black/50 px-2.5 py-1.5 font-mono text-sm text-white outline-none placeholder:text-white/40 focus:border-pop-yellow/60"
                placeholder={$LL.npcChat.placeholder()}
                bind:value={text}
                onkeydown={(event) => {
                    if (event.key === "Enter") send().catch(() => undefined);
                }}
            />
            <button
                type="button"
                class="rounded-md bg-pop-yellow px-3 py-1.5 font-mono text-sm font-bold text-contrast-1100 hover:brightness-110 disabled:opacity-40"
                disabled={$npcChatStore.sending || !text.trim()}
                onclick={() => send().catch(() => undefined)}
            >
                →
            </button>
        </footer>
    </RpgDialog>
{/if}
