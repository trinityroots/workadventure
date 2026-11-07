const ICONS = new Set(["scroll", "leaf", "quill", "map", "anvil", "flask", "coin", "rune", "star"]);

/** Inline HTML for the badge role icon: a themed-color PNG at resources/icons. */
export function npcRoleIconHtml(icon: string, size = 12): string {
    const name = ICONS.has(icon) ? icon : "star";
    return (
        `<img src="resources/icons/npc-${name}.png" alt="" ` +
        `style="display:inline-block;max-width:none;flex:none;width:calc(${size}px * var(--username-dom-scale, 1));height:calc(${size}px * var(--username-dom-scale, 1))" draggable="false" />`
    );
}
