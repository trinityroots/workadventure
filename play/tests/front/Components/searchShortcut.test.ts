import { describe, expect, it } from "vitest";

import { isSearchShortcut } from "../../../src/front/Components/searchShortcut";

function key(init: Partial<KeyboardEventInit> & { key: string }, target?: EventTarget): KeyboardEvent {
    const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
    if (target) Object.defineProperty(event, "target", { value: target });
    return event;
}

describe("isSearchShortcut", () => {
    it("matches Cmd+K and Ctrl+K on a non-text target", () => {
        expect(isSearchShortcut(key({ key: "k", metaKey: true }))).toBe(true);
        expect(isSearchShortcut(key({ key: "K", ctrlKey: true }))).toBe(true);
    });

    it("rejects other modifiers and other keys", () => {
        expect(isSearchShortcut(key({ key: "k", metaKey: true, shiftKey: true }))).toBe(false);
        expect(isSearchShortcut(key({ key: "k", metaKey: true, altKey: true }))).toBe(false);
        expect(isSearchShortcut(key({ key: "j", metaKey: true }))).toBe(false);
        expect(isSearchShortcut(key({ key: "k" }))).toBe(false);
    });

    it("leaves the shortcut alone while typing in a field", () => {
        const input = document.createElement("input");
        const textarea = document.createElement("textarea");
        const editable = document.createElement("div");
        // jsdom does not reflect the contentEditable property onto the attribute.
        editable.setAttribute("contenteditable", "true");

        expect(isSearchShortcut(key({ key: "k", metaKey: true }, input))).toBe(false);
        expect(isSearchShortcut(key({ key: "k", metaKey: true }, textarea))).toBe(false);
        expect(isSearchShortcut(key({ key: "k", metaKey: true }, editable))).toBe(false);
        expect(isSearchShortcut(key({ key: "k", metaKey: true }, document.createElement("div")))).toBe(true);
    });
});
