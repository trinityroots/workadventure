import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    isActivatedStore as isTodoListActivatedStore,
    isTodoListVisibleStore,
} from "../../../src/front/Stores/TodoListStore";
import { chatVisibilityStore } from "../../../src/front/Stores/ChatStore";
import { sidePanelWidthStore } from "../../../src/front/Stores/SidePanelStore";
import {
    chatSidebarWidthStore,
    hideActionBarStoreBecauseOfChatBar,
} from "../../../src/front/Chat/ChatSidebarWidthStore";

function resizeWindow(width: number): void {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    window.dispatchEvent(new Event("resize"));
}

describe("sidePanelWidthStore", () => {
    // windowSize only follows resize events while someone listens.
    let unsubscribe: () => void;
    beforeEach(() => {
        unsubscribe = hideActionBarStoreBecauseOfChatBar.subscribe(() => {});
        isTodoListActivatedStore.set(true);
        chatSidebarWidthStore.set(335);
    });
    afterEach(() => {
        unsubscribe();
        isTodoListVisibleStore.set(false);
        isTodoListActivatedStore.set(false);
        chatVisibilityStore.set(false);
    });

    it("takes the tasks panel's width on the right from md up, while it is open", () => {
        resizeWindow(1440);
        expect(get(sidePanelWidthStore)).toBe(0);
        isTodoListVisibleStore.set(true);
        expect(get(sidePanelWidthStore)).toBe(384);
        resizeWindow(767);
        expect(get(sidePanelWidthStore)).toBe(0);
    });

    it("takes nothing for a tasks panel whose module is not activated", () => {
        resizeWindow(1440);
        isTodoListActivatedStore.set(false);
        isTodoListVisibleStore.set(true);
        expect(get(sidePanelWidthStore)).toBe(0);
    });

    it("hides the action bar when the chat leaves too little room for it", () => {
        resizeWindow(600);
        expect(get(hideActionBarStoreBecauseOfChatBar)).toBe(false);
        chatVisibilityStore.set(true);
        expect(get(hideActionBarStoreBecauseOfChatBar)).toBe(true);
    });
});
