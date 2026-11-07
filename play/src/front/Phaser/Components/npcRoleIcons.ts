const ICONS = new Set(["scroll", "leaf", "quill", "map", "anvil", "flask", "coin", "rune", "star"]);

/** Inline HTML for the badge role icon: a themed-color PNG at resources/icons. */
export function npcRoleIconHtml(icon: string, size = 12): string {
    const name = ICONS.has(icon) ? icon : "star";
    return (
        `<img src="resources/icons/npc-${name}.png" width="${size}" height="${size}" alt="" ` +
        `style="display:inline-block;max-width:none;flex:none" draggable="false" />`
    );
}
