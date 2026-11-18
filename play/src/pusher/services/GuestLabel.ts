const GUEST_LABEL = "[Guest]";

/** Adds "[Guest]" after the name of an external guest, once, so the team can tell who is a guest. */
export function withGuestLabel(name: string, isGuest: boolean): string {
    if (!isGuest) {
        return name;
    }
    const trimmed = name.trim();
    if (trimmed.toLowerCase().endsWith(GUEST_LABEL.toLowerCase())) {
        return `${trimmed.slice(0, -GUEST_LABEL.length).trimEnd()} ${GUEST_LABEL}`.trim();
    }
    return `${trimmed} ${GUEST_LABEL}`;
}
