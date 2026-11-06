import { get } from "svelte/store";
import { focusStore } from "./FocusStore";
import { requestedMicrophoneState } from "./MediaStore";
import { isInActiveConversationStore } from "./StreamableCollectionStore";

let started = false;

/** Mutes an idle microphone when the window loses focus; a running conversation keeps its mic. */
export function onWindowFocusChange(focused: boolean): void {
    if (focused) return;
    if (get(isInActiveConversationStore)) return;
    if (get(requestedMicrophoneState)) requestedMicrophoneState.disableMicrophone();
}

export function startMicAutoMute(): void {
    if (started) return;
    started = true;
    // Singleton guard lives for the whole app session, never unsubscribed.
    // eslint-disable-next-line svelte/no-ignored-unsubscribe
    focusStore.subscribe(onWindowFocusChange);
}
