/** True when the event is Cmd/Ctrl+K meant for the global search, not typing in a field. */
export function isSearchShortcut(event: KeyboardEvent): boolean {
    if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
        return false;
    }
    const target = event.target as HTMLElement | null;
    // jsdom never sets isContentEditable, so the attribute is checked too.
    return !(
        target &&
        (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable ||
            target.hasAttribute("contenteditable"))
    );
}
