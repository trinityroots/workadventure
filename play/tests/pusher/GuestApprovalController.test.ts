// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Application, Request, Response } from "express";

vi.mock("../../src/pusher/enums/EnvironmentVariable", async () => ({
    ...(await import("./mocks/pusherEnvironmentVariableMock")),
    OPENID_ALLOWED_EMAIL_DOMAINS: ["trinityroots.co.th", "roots.tech"],
}));

const { GuestApprovalController } = await import("../../src/pusher/controllers/GuestApprovalController");
const { GuestApprovalStore } = await import("../../src/pusher/services/GuestApprovalStore");
const { jwtTokenManager } = await import("../../src/pusher/services/JWTTokenManager");

type Handler = (req: Request, res: Response) => Promise<void>;

describe("GuestApprovalController", () => {
    let routes: Map<string, Handler>;
    let online: { email: string; name: string }[];

    beforeEach(() => {
        routes = new Map();
        online = [
            { email: "mali@trinityroots.co.th", name: "Mali" },
            { email: "somchai@roots.tech", name: "Somchai" },
            { email: "intruder@gmail.com", name: "Not staff" },
        ];
        const app = {
            get: (path: string, handler: Handler) => routes.set(`GET ${path}`, handler),
            post: (path: string, handler: Handler) => routes.set(`POST ${path}`, handler),
        };
        new GuestApprovalController(app as unknown as Application, new GuestApprovalStore(), () => online);
    });

    async function call(route: string, token: string | undefined, options: { body?: unknown; params?: object } = {}) {
        const res = {
            statusCode: 200,
            body: undefined as unknown,
            status(code: number) {
                this.statusCode = code;
                return this;
            },
            json(body: unknown) {
                this.body = body;
                return this;
            },
            end() {
                return this;
            },
        };
        const req = {
            header: (name: string) => (name === "authorization" && token ? `Bearer ${token}` : undefined),
            body: options.body,
            params: options.params ?? {},
        };
        await routes.get(route)!(req as unknown as Request, res as unknown as Response);
        return res;
    }

    const guestToken = (email = "anna@gmail.com") =>
        jwtTokenManager.createAuthToken(
            email,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            "pending",
        );
    const staffToken = (email: string) => jwtTokenManager.createAuthToken(email, "access", "Staff");

    async function listHosts() {
        const res = await call("GET /guest/hosts", await guestToken());
        return (res.body as { hosts: { id: string; name: string }[] }).hosts;
    }

    it("lists only online company members to a waiting guest, without their emails", async () => {
        const res = await call("GET /guest/hosts", await guestToken());
        expect(res.statusCode).toBe(200);
        const hosts = (res.body as { hosts: { id: string; name: string }[] }).hosts;
        expect(hosts.map((h) => h.name).sort()).toEqual(["Mali", "Somchai"]);
        expect(JSON.stringify(res.body)).not.toContain("@");
    });

    it("refuses the host list without a token, or to someone who is not a waiting guest", async () => {
        expect((await call("GET /guest/hosts", undefined)).statusCode).toBe(401);
        expect((await call("GET /guest/hosts", await staffToken("mali@trinityroots.co.th"))).statusCode).toBe(403);
    });

    it("sends a request to the chosen host, who sees it in the inbox", async () => {
        const mali = (await listHosts()).find((h) => h.name === "Mali")!;
        const sent = await call("POST /guest/requests", await guestToken(), {
            body: { hostId: mali.id, guestName: "Anna Smith" },
        });
        expect(sent.statusCode).toBe(200);

        const inbox = await call("GET /guest/inbox", await staffToken("mali@trinityroots.co.th"));
        expect(inbox.body).toMatchObject({ requests: [{ guestName: "Anna Smith", guestEmail: "anna@gmail.com" }] });

        const other = await call("GET /guest/inbox", await staffToken("somchai@roots.tech"));
        expect(other.body).toEqual({ requests: [] });
    });

    it("rejects a request for an unknown host, an empty name, or a second pending request", async () => {
        const mali = (await listHosts())[0];
        const token = await guestToken();
        expect(
            (await call("POST /guest/requests", token, { body: { hostId: "nope", guestName: "Anna" } })).statusCode,
        ).toBe(404);
        expect(
            (await call("POST /guest/requests", token, { body: { hostId: mali.id, guestName: "  " } })).statusCode,
        ).toBe(400);
        expect(
            (await call("POST /guest/requests", token, { body: { hostId: mali.id, guestName: "Anna" } })).statusCode,
        ).toBe(200);
        expect(
            (await call("POST /guest/requests", token, { body: { hostId: mali.id, guestName: "Anna" } })).statusCode,
        ).toBe(409);
    });

    it("gives the guest an approved pass once the host says yes", async () => {
        const mali = (await listHosts()).find((h) => h.name === "Mali")!;
        const token = await guestToken();
        await call("POST /guest/requests", token, { body: { hostId: mali.id, guestName: "Anna Smith" } });

        const waiting = await call("GET /guest/requests/current", token);
        expect(waiting.body).toEqual({ status: "pending" });

        const staff = await staffToken("mali@trinityroots.co.th");
        const inbox = await call("GET /guest/inbox", staff);
        const requestId = (inbox.body as { requests: { id: string }[] }).requests[0].id;
        const answered = await call("POST /guest/inbox/:id/answer", staff, {
            params: { id: requestId },
            body: { approve: true },
        });
        expect(answered.statusCode).toBe(200);

        const done = await call("GET /guest/requests/current", token);
        const { status, authToken } = done.body as { status: string; authToken: string };
        expect(status).toBe("approved");
        const data = await jwtTokenManager.verifyJWTToken(authToken);
        expect(data).toMatchObject({ identifier: "anna@gmail.com", username: "Anna Smith", guest: "approved" });
    });

    it("tells the guest when the host declines, without giving a pass", async () => {
        const mali = (await listHosts()).find((h) => h.name === "Mali")!;
        const token = await guestToken();
        await call("POST /guest/requests", token, { body: { hostId: mali.id, guestName: "Anna" } });
        const staff = await staffToken("mali@trinityroots.co.th");
        const requestId = ((await call("GET /guest/inbox", staff)).body as { requests: { id: string }[] }).requests[0]
            .id;
        await call("POST /guest/inbox/:id/answer", staff, { params: { id: requestId }, body: { approve: false } });

        expect((await call("GET /guest/requests/current", token)).body).toEqual({ status: "declined" });
    });

    it("lets only the chosen host answer", async () => {
        const mali = (await listHosts()).find((h) => h.name === "Mali")!;
        const token = await guestToken();
        await call("POST /guest/requests", token, { body: { hostId: mali.id, guestName: "Anna" } });
        const maliToken = await staffToken("mali@trinityroots.co.th");
        const requestId = ((await call("GET /guest/inbox", maliToken)).body as { requests: { id: string }[] })
            .requests[0].id;

        const wrong = await call("POST /guest/inbox/:id/answer", await staffToken("somchai@roots.tech"), {
            params: { id: requestId },
            body: { approve: true },
        });
        expect(wrong.statusCode).toBe(404);
        const byGuest = await call("POST /guest/inbox/:id/answer", token, {
            params: { id: requestId },
            body: { approve: true },
        });
        expect(byGuest.statusCode).toBe(403);
        expect((await call("GET /guest/requests/current", token)).body).toEqual({ status: "pending" });
    });
});
