<script lang="ts">
    import { get } from "svelte/store";
    import { LL } from "../../../i18n/i18n-svelte";
    import { npcRoleIconSvg } from "../../Phaser/Components/npcRoleIcons";
    import { closeNpcChat, nearestNpc, npcChatStore, openNpcChat, sendNpcMessage } from "../../Services/npcList";
    import { closeLeaderboard, nearestBoard, openLeaderboard } from "../../Services/leaderboard";
    import { closeShop, openShop } from "../../Services/shop";
    import { inputFormFocusStore } from "../../Stores/UserInputStore";

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
    <aside
        class="fixed top-0 right-0 z-[300] flex h-full w-[340px] max-w-[92vw] flex-col border-s border-white/10 bg-contrast/95 backdrop-blur-md"
        data-testid="npc-chat-panel"
    >
        <header class="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <span class="text-white/80" aria-hidden="true">
                <!-- Icon markup comes from the fixed npcRoleIcons table, never from user input. -->
                {@html npcRoleIconSvg($npcChatStore.npc.icon)}
                <!-- eslint-disable-line svelte/no-at-html-tags -->
            </span>
            <span class="flex-1 truncate text-sm font-semibold text-white">{$npcChatStore.npc.name}</span>
            <button
                type="button"
                class="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Close"
                onclick={closeNpcChat}
            >
                ✕
            </button>
        </header>

        <div bind:this={logElement} class="flex flex-1 flex-col gap-2 overflow-y-auto p-3 no-scroll-bar">
            {#each $npcChatStore.messages as message, index (index)}
                <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
                    <div
                        class="max-w-[85%] whitespace-pre-wrap rounded-lg px-2.5 py-1.5 text-sm
                            {message.role === 'user' ? 'bg-primary text-white' : 'bg-white/10 text-white/90'}"
                    >
                        {message.content}
                        {#if message.sources?.length}
                            <ul class="mt-1 space-y-0.5 border-t border-white/10 pt-1 text-xs text-white/60">
                                {#each message.sources as source (source.url)}
                                    <li class="truncate">
                                        <a href={source.url} target="_blank" rel="noreferrer" class="hover:text-white">
                                            {source.title}
                                        </a>
                                    </li>
                                {/each}
                            </ul>
                        {/if}
                    </div>
                </div>
            {/each}
            {#if $npcChatStore.sending}
                <div class="text-xs italic text-white/50">{$LL.npcChat.thinking()}</div>
            {/if}
            {#if $npcChatStore.error}
                <div class="text-xs text-red-400">{$LL.npcChat.error()}</div>
            {/if}
        </div>

        <footer class="flex gap-2 border-t border-white/10 p-2">
            <input
                class="flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/30"
                placeholder={$LL.npcChat.placeholder()}
                bind:value={text}
                onkeydown={(event) => {
                    if (event.key === "Enter") send().catch(() => undefined);
                }}
            />
            <button
                type="button"
                class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                disabled={$npcChatStore.sending || !text.trim()}
                onclick={() => send().catch(() => undefined)}
            >
                →
            </button>
        </footer>
    </aside>
{/if}
