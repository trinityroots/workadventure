import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/front/Enum/EnvironmentVariable", () => ({ CORE_URL: "https://core.test" }));

import {
    answerGuestRequest,
    fetchGuestHosts,
    fetchGuestInbox,
    fetchGuestStatus,
    guestInboxStore,
    isGuestPendingToken,
    refreshGuestInbox,
    sendGuestRequest,
} from "../../../src/front/Services/guestApproval";

function fakeJwt(payload: object): string {
    const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, "");
    return `${encode({ alg: "HS256" })}.${encode(payload)}.signature`;
}

function respond(status: number, body: unknown = {}) {
    return vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
}

describe("isGuestPendingToken", () => {
    it("is true only for a token marked as a pending guest", () => {
        expect(isGuestPendingToken(fakeJwt({ identifier: "a@gmail.com", guest: "pending" }))).toBe(true);
        expect(isGuestPendingToken(fakeJwt({ identifier: "a@gmail.com", guest: "approved" }))).toBe(false);
        expect(isGuestPendingToken(fakeJwt({ identifier: "mali@trinityroots.co.th" }))).toBe(false);
    });

    it("is false for missing or broken tokens", () => {
        expect(isGuestPendingToken(null)).toBe(false);
        expect(isGuestPendingToken("not-a-token")).toBe(false);
    });
});

describe("guest approval requests", () => {
    beforeEach(() => {
        const storage = new Map<string, string>([["authToken", "my-token"]]);
        vi.stubGlobal("localStorage", {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
        });
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        guestInboxStore.set([]);
    });

    it("loads the online hosts with the session token", async () => {
        const fetchMock = respond(200, { hosts: [{ id: "h1", name: "Mali" }] });
        vi.stubGlobal("fetch", fetchMock);
        expect(await fetchGuestHosts()).toEqual([{ id: "h1", name: "Mali" }]);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("https://core.test/api/guest/hosts");
        expect(new Headers(init.headers).get("Authorization")).toBe("Bearer my-token");
    });

    it("sends a request and maps the server answer", async () => {
        vi.stubGlobal("fetch", respond(200));
        expect(await sendGuestRequest("h1", "Anna")).toBe("sent");
        vi.stubGlobal("fetch", respond(409));
        expect(await sendGuestRequest("h1", "Anna")).toBe("already_pending");
        vi.stubGlobal("fetch", respond(404));
        expect(await sendGuestRequest("h1", "Anna")).toBe("host_offline");
    });

    it("reads the request status and the approved pass", async () => {
        vi.stubGlobal("fetch", respond(200, { status: "approved", authToken: "new-token" }));
        expect(await fetchGuestStatus()).toEqual({ status: "approved", authToken: "new-token" });
    });

    it("loads the inbox into the store, and treats 404/403 as 'no guest feature'", async () => {
        vi.stubGlobal(
            "fetch",
            respond(200, { requests: [{ id: "r1", guestName: "Anna", guestEmail: "a@gmail.com", expiresAt: 1 }] }),
        );
        expect(await refreshGuestInbox()).toBe(true);
        expect(get(guestInboxStore).map((r) => r.id)).toEqual(["r1"]);

        vi.stubGlobal("fetch", respond(404));
        expect(await refreshGuestInbox()).toBe(false);
        expect(get(guestInboxStore)).toEqual([]);
    });

    it("throws on server errors when reading the inbox directly", async () => {
        vi.stubGlobal("fetch", respond(500));
        await expect(fetchGuestInbox()).rejects.toThrow();
    });

    it("answers a request and removes it from the inbox", async () => {
        guestInboxStore.set([{ id: "r1", guestName: "Anna", guestEmail: "a@gmail.com", expiresAt: 1 }]);
        const fetchMock = respond(200);
        vi.stubGlobal("fetch", fetchMock);
        expect(await answerGuestRequest("r1", true)).toBe(true);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("https://core.test/api/guest/inbox/r1/answer");
        expect(JSON.parse(init.body)).toEqual({ approve: true });
        expect(get(guestInboxStore)).toEqual([]);
    });
});
