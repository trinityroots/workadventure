import { derived } from "svelte/store";
import { breakpoints } from "../Utils/BreakpointsUtils";
import { windowSize } from "./CoWebsiteStore";
import { isActivatedStore as todoListIsActivatedStore, isTodoListVisibleStore } from "./TodoListStore";

/** The tasks panel is w-96. */
const SIDE_PANEL_WIDTH = 384;

/**
 * The room the tasks panel takes on the right: the layout and the action bar shrink to make way for it,
 * like for the map editor. Below md the panel covers the whole screen instead, like the chat, and takes nothing.
 * The agenda needs none of this — it is a tab of the chat sidebar, which reserves its own room.
 */
export const sidePanelWidthStore = derived(
    [todoListIsActivatedStore, isTodoListVisibleStore, windowSize],
    ([$todoListIsActivated, $isTodoListVisible, $windowSize]) =>
        $todoListIsActivated && $isTodoListVisible && $windowSize.width >= breakpoints.md ? SIDE_PANEL_WIDTH : 0,
);
