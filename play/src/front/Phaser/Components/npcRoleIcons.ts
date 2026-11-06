const PATHS: Record<string, string> = {
    scroll: "M4 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm1 3h6v1H5zm0 3h6v1H5z",
    leaf: "M13 3c0 5-3 9-8 10 1-5 4-8 8-10z",
    quill: "M13 3c-6 1-9 5-10 10l2-1c1-3 4-6 8-9zm-9 9h4v1H4z",
    map: "M2 4l4-2 4 2 4-2v10l-4 2-4-2-4 2V4z",
    anvil: "M3 6h10l-2 3h3v2H2V9h3L3 6z",
    flask: "M6 2h4v4l3 6a2 2 0 0 1-2 3H5a2 2 0 0 1-2-3l3-6V2z",
    coin: "M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z",
    rune: "M8 2l6 6-6 6-6-6 6-6z",
    star: "M8 1l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z",
};

/** Inline SVG for the badge role icon (replaces the availability dot on NPCs). */
export function npcRoleIconSvg(icon: string): string {
    const path = PATHS[icon] ?? PATHS.star;
    return `<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><path d="${path}"/></svg>`;
}
