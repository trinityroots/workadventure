<script lang="ts">
    import type { MatrixChatConnectionLike } from "../Connection/ChatConnection";
    import { chatVisibilityStore } from "../../Stores/ChatStore";
    import { navChat } from "../Stores/ChatStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { IconX, IconSettings } from "@wa-icons";

    interface Props {
        hasSearch: boolean;
        hasCloseChat: boolean;
        /** When set, shows the chat settings button. */
        matrixChatConnection?: MatrixChatConnectionLike;
    }

    let { hasSearch, hasCloseChat, matrixChatConnection = undefined }: Props = $props();

    let menuOpen = $state(false);

    function closeChat() {
        chatVisibilityStore.set(false);
        menuOpen = false;
    }

    function toggleMenu() {
        menuOpen = !menuOpen;
    }

    function openMatrixSettings() {
        navChat.switchToSettings();
        menuOpen = false;
    }
</script>

{#if hasSearch && hasCloseChat}
    <div class="chat-action-menu end-2 top-2 z-50 flex flex-row items-start justify-end gap-1">
        {#if matrixChatConnection}
            <button
                type="button"
                class="p-3 mt-2 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center text-white aspect-square w-12 h-12 shrink-0"
                onclick={openMatrixSettings}
                aria-label={$LL.chat.matrixSettings.title()}
                title={$LL.chat.matrixSettings.title()}
            >
                <IconSettings font-size="20" />
            </button>
        {/if}
        <button
            type="button"
            class="p-2 mt-2 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center text-white"
            onclick={toggleMenu}
            aria-label={$LL.chat.a11y.menuActions()}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="stroke-white icon icon-tabler icon-tabler-square-chevron-down transition-transform {menuOpen
                    ? 'rotate-180'
                    : ''}"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M15 11l-3 3l-3 -3" />
                <path d="M3 3m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
            </svg>
        </button>

        {#if menuOpen}
            <div
                class="absolute top-full right-0 mt-2 bg-contrast/20 backdrop-blur-md rounded-l shadow-lg p-1 min-w-[140px] z-50"
            >
                <button
                    class="menu-item w-full flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg text-white text-left transition-colors"
                    data-testid="closeChatButton"
                    onclick={closeChat}
                >
                    <IconX font-size="18" />
                    <span class="text-sm">{$LL.chat.closeChat()}</span>
                </button>
            </div>
        {/if}
    </div>
{:else if hasSearch && !hasCloseChat}
    <div class="flex flex-row items-center gap-1">
        {#if matrixChatConnection}
            <button
                type="button"
                class="p-3 hover:bg-white/10 rounded aspect-square w-12 h-12 relative z-50 shrink-0"
                onclick={openMatrixSettings}
                aria-label={$LL.chat.matrixSettings.title()}
                title={$LL.chat.matrixSettings.title()}
            >
                <IconSettings font-size="20" />
            </button>
        {/if}
    </div>
{:else if !hasSearch && hasCloseChat}
    <!-- No search to offer, so there is no menu to hang the close on: show it on its own. Without
         this, an OFFLINE chat (any anonymous user gets VoidChatConnection) has no way out at all,
         since the action bar that owns the close is hidden whenever hasCloseChat is true. -->
    <button
        class="p-3 hover:bg-white/10 rounded aspect-square w-12 h-12 relative z-50"
        data-testid="closeChatButton"
        onclick={closeChat}
        aria-label={$LL.chat.closeChat()}
    >
        <IconX font-size="20" />
    </button>
{/if}

{#if menuOpen}
    <div
        class="fixed inset-0 z-40"
        onclick={() => (menuOpen = false)}
        onkeydown={(e) => e.key === "Escape" && (menuOpen = false)}
        role="button"
        tabindex="-1"
    ></div>
{/if}
