import { get } from "svelte/store";
import { focusStore } from "./FocusStore";
import { requestedMicrophoneState } from "./MediaStore";
import { isInActiveConversationStore } from "./StreamableCollectionStore";
import { visibilityStore } from "./VisibilityStore";

let started = false;

/** Mutes an idle microphone when the window loses focus; a running conversation keeps its mic. */
export function onWindowFocusChange(focused: boolean): void {
    if (focused) return;
    if (get(isInActiveConversationStore)) return;
    if (get(requestedMicrophoneState)) requestedMicrophoneState.disableMicrophone();
}

/** Tab switches never fire window blur; hiding the tab mutes through the same gate. */
export function onVisibility(visible: boolean): void {
    if (!visible) onWindowFocusChange(false);
}

export function startMicAutoMute(): void {
    if (started) return;
    started = true;
    // Singleton guard lives for the whole app session, never unsubscribed.
    // eslint-disable-next-line svelte/no-ignored-unsubscribe
    focusStore.subscribe(onWindowFocusChange);
    // eslint-disable-next-line svelte/no-ignored-unsubscribe
    visibilityStore.subscribe(onVisibility);
}
