import { describe, expect, it } from "vitest";
import { GuestApprovalStore } from "../../src/pusher/services/GuestApprovalStore";

const TTL_MS = 120_000;

function createStore() {
    let now = 1_000_000;
    const store = new GuestApprovalStore(TTL_MS, () => now);
    return {
        store,
        advance: (ms: number) => {
            now += ms;
        },
    };
}

describe("GuestApprovalStore", () => {
    it("creates a pending request that expires after the time limit", () => {
        const { store } = createStore();
        const request = store.create("anna@gmail.com", "Anna Smith", "mali@trinityroots.co.th");
        expect(request.status).toBe("pending");
        expect(request.expiresAt).toBe(1_000_000 + TTL_MS);
        expect(store.getForGuest("anna@gmail.com")?.id).toBe(request.id);
    });

    it("shows a host only the pending requests addressed to them", () => {
        const { store } = createStore();
        store.create("anna@gmail.com", "Anna", "mali@trinityroots.co.th");
        store.create("bob@gmail.com", "Bob", "somchai@roots.tech");
        const inbox = store.listPendingForHost("Mali@trinityroots.co.th");
        expect(inbox.map((r) => r.guestName)).toEqual(["Anna"]);
    });

    it("lets the chosen host approve, and the guest sees it", () => {
        const { store } = createStore();
        const request = store.create("anna@gmail.com", "Anna", "mali@trinityroots.co.th");
        expect(store.answer(request.id, "mali@trinityroots.co.th", true)).toBe(true);
        expect(store.getForGuest("anna@gmail.com")?.status).toBe("approved");
        expect(store.listPendingForHost("mali@trinityroots.co.th")).toEqual([]);
    });

    it("lets the chosen host decline", () => {
        const { store } = createStore();
        const request = store.create("anna@gmail.com", "Anna", "mali@trinityroots.co.th");
        expect(store.answer(request.id, "mali@trinityroots.co.th", false)).toBe(true);
        expect(store.getForGuest("anna@gmail.com")?.status).toBe("declined");
    });

    it("refuses an answer from anyone other than the chosen host", () => {
        const { store } = createStore();
        const request = store.create("anna@gmail.com", "Anna", "mali@trinityroots.co.th");
        expect(store.answer(request.id, "somchai@roots.tech", true)).toBe(false);
        expect(store.answer(request.id, "anna@gmail.com", true)).toBe(false);
        expect(store.getForGuest("anna@gmail.com")?.status).toBe("pending");
    });

    it("does not accept an answer for an unknown request or a second answer", () => {
        const { store } = createStore();
        expect(store.answer("nope", "mali@trinityroots.co.th", true)).toBe(false);
        const request = store.create("anna@gmail.com", "Anna", "mali@trinityroots.co.th");
        store.answer(request.id, "mali@trinityroots.co.th", false);
        expect(store.answer(request.id, "mali@trinityroots.co.th", true)).toBe(false);
        expect(store.getForGuest("anna@gmail.com")?.status).toBe("declined");
    });

    it("expires a request that is not answered in time", () => {
        const { store, advance } = createStore();
        const request = store.create("anna@gmail.com", "Anna", "mali@trinityroots.co.th");
        advance(TTL_MS);
        expect(store.getForGuest("anna@gmail.com")?.status).toBe("expired");
        expect(store.listPendingForHost("mali@trinityroots.co.th")).toEqual([]);
        expect(store.answer(request.id, "mali@trinityroots.co.th", true)).toBe(false);
    });

    it("allows only one pending request per guest at a time", () => {
        const { store, advance } = createStore();
        const first = store.create("anna@gmail.com", "Anna", "mali@trinityroots.co.th");
        expect(() => store.create("Anna@gmail.com", "Anna", "somchai@roots.tech")).toThrow("already_pending");

        store.answer(first.id, "mali@trinityroots.co.th", false);
        const second = store.create("anna@gmail.com", "Anna", "somchai@roots.tech");
        expect(second.status).toBe("pending");

        advance(TTL_MS);
        expect(store.create("anna@gmail.com", "Anna", "mali@trinityroots.co.th").status).toBe("pending");
    });

    it("returns nothing for a guest who never asked", () => {
        const { store } = createStore();
        expect(store.getForGuest("nobody@gmail.com")).toBeUndefined();
    });
});
