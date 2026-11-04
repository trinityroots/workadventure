<script lang="ts">
    import { onDestroy } from "svelte";
    import { chatInputFocusStore } from "../../Stores/ChatStore";
    import { chatSearchBarValue, chatSearchFocusRequest, navChat, joignableRoom } from "../Stores/ChatStore";
    import LoadingSmall from "../images/loading-small.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import type { UserProviderMerger } from "../UserProviderMerger/UserProviderMerger";
    import { hideActionBarStoreBecauseOfChatBar } from "../ChatSidebarWidthStore";
    import { selectedRoomStore } from "../Stores/SelectRoomStore";
    import { hasMatrixChatCapabilities } from "../Connection/ChatConnection";
    import OnlineUsersCount from "./OnlineUsersCount.svelte";
    import ChatActionMenu from "./ChatActionMenu.svelte";
    import { IconMessageCircle2, IconUsers } from "@wa-icons";

    const gameScene = gameManager.getCurrentGameScene();
    const chat = gameManager.chatConnection;
    const showChatButton = gameScene.room.isChatEnabled;
    const showUserListButton = gameScene.room.isChatOnlineListEnabled;
    const showNavBar = gameScene.room.isChatOnlineListEnabled || gameScene.room.isChatDisconnectedListEnabled;
    const userProviderMergerPromise = gameScene.userProviderMerger;
    const chatStatusStore = chat.connectionStatus;
    let typingTimer: ReturnType<typeof setTimeout>;
    let searchLoader = $state(false);
    let searchInput: HTMLInputElement | undefined = $state();
    const DONE_TYPING_INTERVAL = 2000;

    // ChatSidebar floats its own close button over this header as soon as a room is selected, so the
    // menu must drop its close there or the two stack up.
    let isInSpecificDiscussion = $derived($selectedRoomStore !== undefined);
    let showSearch = $derived($chatStatusStore !== "OFFLINE" && !isInSpecificDiscussion);

    // Cmd/Ctrl+K asks for the search field: focus it as soon as it is in the DOM.
    $effect(() => {
        if ($chatSearchFocusRequest && searchInput) {
            searchInput.focus();
            chatSearchFocusRequest.set(false);
        }
    });

    function clearSearch() {
        clearTimeout(typingTimer);
        chatSearchBarValue.set("");
        joignableRoom.set([]);
        // The user providers are shared and keep the text of the last search: reset their filter too,
        // or the user list stays filtered while the search bar shows nothing.
        userProviderMergerPromise
            .then((userProviderMerger) => userProviderMerger.setFilter(""))
            .catch((e) => console.error(e));
    }

    const handleKeyDown = () => {
        if ($chatSearchBarValue === "") joignableRoom.set([]);
        clearTimeout(typingTimer);
    };

    const handleKeyUp = (userProviderMerger: UserProviderMerger) => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            searchLoader = true;
            if ($navChat.key === "chat" && $chatSearchBarValue.trim() !== "") {
                searchAccessibleRooms();
            }

            userProviderMerger
                .setFilter($chatSearchBarValue)
                .catch((e) => console.error(e))
                .finally(() => {
                    searchLoader = false;
                });
        }, DONE_TYPING_INTERVAL);
    };

    const searchAccessibleRooms = () => {
        chat.searchAccessibleRooms($chatSearchBarValue)
            .then((chatRooms) => {
                joignableRoom.set(chatRooms);
            })
            .catch((e) => console.error(e))
            .finally(() => {
                searchLoader = false;
            });
        return;
    };

    function focusChatInput() {
        // Disable input manager to prevent the game from receiving the input
        chatInputFocusStore.set(true);
    }
    function unfocusChatInput() {
        // Enable input manager to allow the game to receive the input
        chatInputFocusStore.set(false);
    }

    onDestroy(() => {
        clearSearch();
    });
</script>

<div class="flex w-full flex-col">
    <div class="relative z-40 flex w-full items-center p-2">
        <div>
            {#if showNavBar}
                {#if $navChat.key === "chat" && showUserListButton}
                    <button
                        class="userList p-3 hover:bg-white/10 rounded aspect-square w-12 h-12 !text-white"
                        onclick={() => navChat.switchToUserList()}
                    >
                        <IconUsers font-size="20" />
                    </button>
                {:else if showChatButton}
                    <button
                        class="p-3 hover:bg-white/10 rounded aspect-square w-12 h-12 !text-white"
                        onclick={() => navChat.switchToChat()}
                    >
                        <IconMessageCircle2 font-size="20" />
                    </button>
                {/if}
            {/if}
        </div>
        <div class="flex flex-col items-center justify-center grow">
            <div class="text-md font-bold h-5">
                {#if $navChat.key === "chat"}
                    {$LL.chat.chat()}
                {:else}
                    {$LL.chat.users()}
                {/if}
            </div>
            {#if gameScene.room.isChatOnlineListEnabled}
                <OnlineUsersCount />
            {/if}
        </div>
        <div class="relative">
            <ChatActionMenu
                hasCloseChat={$hideActionBarStoreBecauseOfChatBar && !isInSpecificDiscussion}
                hasSearch={$chatStatusStore !== "OFFLINE" && !isInSpecificDiscussion}
                matrixChatConnection={hasMatrixChatCapabilities(chat) ? chat : undefined}
            />
        </div>
    </div>
    <!-- The search field sits in the header permanently; Cmd/Ctrl+K focuses it. -->
    {#if showSearch}
        {#await userProviderMergerPromise}
            <div></div>
        {:then userProviderMerger}
            <div class="px-2 pb-2">
                <div class="relative">
                    <input
                        bind:this={searchInput}
                        autocomplete="new-password"
                        class="block text-white placeholder:text-white/50 w-full placeholder:text-sm border-none pl-3 pr-8 bg-contrast/30 rounded py-2 text-sm"
                        placeholder={$navChat.key === "users" ? $LL.chat.searchUser() : $LL.chat.searchChat()}
                        onkeydown={handleKeyDown}
                        onkeyup={() => handleKeyUp(userProviderMerger)}
                        bind:value={$chatSearchBarValue}
                        onfocusin={focusChatInput}
                        onfocusout={unfocusChatInput}
                    />
                    {#if searchLoader}
                        <div class="absolute right-2 top-1/2 -translate-y-1/2">
                            <LoadingSmall />
                        </div>
                    {/if}
                </div>
            </div>
        {/await}
    {/if}
</div>
