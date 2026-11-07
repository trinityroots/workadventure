const ICONS = new Set(["scroll", "leaf", "quill", "map", "anvil", "flask", "coin", "rune", "star"]);

/**
 * Inline HTML for the badge role icon PNG (replaces the availability dot on NPCs).
 * The PNG alpha is painted with currentColor so each context keeps its theme color.
 */
export function npcRoleIconHtml(icon: string, size = 12): string {
    const name = ICONS.has(icon) ? icon : "star";
    const url = `url('resources/icons/npc-${name}.png')`;
    return (
        `<span aria-hidden="true" style="display:inline-block;width:${size}px;height:${size}px;` +
        `background:currentColor;-webkit-mask:${url} center / contain no-repeat;` +
        `mask:${url} center / contain no-repeat"></span>`
    );
}
