// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Application, Request, Response } from "express";

const env = vi.hoisted(() => ({ guestApproval: true }));

vi.mock("../../src/pusher/enums/EnvironmentVariable", async () => {
    const base = await import("./mocks/pusherEnvironmentVariableMock");
    return {
        ...base,
        OPENID_ALLOWED_EMAIL_DOMAINS: ["trinityroots.co.th", "roots.tech"],
        get GUEST_APPROVAL_ENABLED() {
            return env.guestApproval;
        },
    };
});

const { getUserInfo } = vi.hoisted(() => ({ getUserInfo: vi.fn() }));
vi.mock("../../src/pusher/services/OpenIDClient", () => ({ openIDClient: { getUserInfo } }));

const { AuthenticateController } = await import("../../src/pusher/controllers/AuthenticateController");
const { jwtTokenManager } = await import("../../src/pusher/services/JWTTokenManager");

describe("/openid-callback with external guests", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        env.guestApproval = true;
    });

    async function callCallback(email: string) {
        const routes = new Map<string, (req: Request, res: Response) => Promise<void>>();
        const app = {
            get: (path: string, handler: never) => routes.set(path, handler),
            post: vi.fn(),
            options: vi.fn(),
        };
        new AuthenticateController(app as unknown as Application);

        getUserInfo.mockResolvedValue({ email, access_token: "google-access", username: "Someone" });
        const res = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn(),
            type: vi.fn().mockReturnThis(),
            clearCookie: vi.fn(),
        };
        const req = { cookies: { playUri: "http://play.test/_/global/map.json" }, method: "GET", originalUrl: "/" };
        await routes.get("/openid-callback")!(req as unknown as Request, res as unknown as Response);
        return res;
    }

    function tokenFrom(res: { send: ReturnType<typeof vi.fn> }): string {
        const html = String(res.send.mock.calls[0][0]);
        return /setItem\("authToken", "([^"]+)"\)/.exec(html)![1];
    }

    it("lets company staff straight in with a normal session", async () => {
        const res = await callCallback("mali@trinityroots.co.th");
        const data = await jwtTokenManager.verifyJWTToken(tokenFrom(res));
        expect(data.identifier).toBe("mali@trinityroots.co.th");
        expect(data.guest).toBeUndefined();
    });

    it("gives an outside email a pending guest pass without any Google access token", async () => {
        const res = await callCallback("anna@gmail.com");
        const token = tokenFrom(res);
        await expect(jwtTokenManager.verifyJWTToken(token)).rejects.toThrow();
        const data = await jwtTokenManager.verifyJWTToken(token, false, true);
        expect(data.guest).toBe("pending");
        expect(data.identifier).toBe("anna@gmail.com");
        expect(data.accessToken).toBeUndefined();
    });

    it("refuses an outside email when guest approval is switched off", async () => {
        env.guestApproval = false;
        const res = await callCallback("anna@gmail.com");
        expect(res.status).toHaveBeenCalledWith(403);
    });
});
