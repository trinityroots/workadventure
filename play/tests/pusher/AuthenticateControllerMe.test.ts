// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Application, Request, Response } from "express";

vi.mock("../../src/pusher/enums/EnvironmentVariable", async () => ({
    ...(await import("./mocks/pusherEnvironmentVariableMock")),
}));

const { fetchMemberDataByUuid, checkTokenAuthWithRefresh } = vi.hoisted(() => ({
    fetchMemberDataByUuid: vi.fn(),
    checkTokenAuthWithRefresh: vi.fn(),
}));
vi.mock("../../src/pusher/services/AdminService", () => ({ adminService: { fetchMemberDataByUuid } }));
vi.mock("../../src/pusher/services/OpenIDClient", () => ({ openIDClient: { checkTokenAuthWithRefresh } }));

const { AuthenticateController } = await import("../../src/pusher/controllers/AuthenticateController");
const { jwtTokenManager } = await import("../../src/pusher/services/JWTTokenManager");

describe("/me", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    function registerRoutes() {
        const routes = new Map<string, (req: Request, res: Response) => Promise<void>>();
        const app = {
            get: (path: string, handler: never) => routes.set(path, handler),
            post: vi.fn(),
            options: vi.fn(),
        };
        new AuthenticateController(app as unknown as Application);
        return routes;
    }

    function bearerHeader(token: string) {
        return (name: string) => (name === "authorization" ? `Bearer ${token}` : undefined);
    }

    it("renews the access token before asking the admin, and drops the tags the provider no longer grants", async () => {
        const routes = registerRoutes();

        const staleToken = await jwtTokenManager.createAuthToken(
            "john@example.com",
            "expired-access",
            "John",
            "en-US",
            ["admin"],
            undefined,
            "encrypted-refresh-1",
        );
        checkTokenAuthWithRefresh.mockResolvedValue({
            userInfo: { sub: "1" },
            claims: { username: "John", locale: "en-US", tags: ["member"] },
            accessToken: "renewed-access",
            encryptedRefreshToken: "encrypted-refresh-2",
            refreshed: true,
        });
        fetchMemberDataByUuid.mockResolvedValue({ status: "ok" });

        const json = vi.fn();
        await routes.get("/me")?.(
            {
                query: { playUri: "http://play.test/_/global/map.json" },
                header: bearerHeader(staleToken),
            } as never,
            { json, status: vi.fn(), send: vi.fn() } as never,
        );

        expect(checkTokenAuthWithRefresh).toHaveBeenCalledWith("expired-access", "encrypted-refresh-1");
        const adminArgs = fetchMemberDataByUuid.mock.calls[0];
        expect(adminArgs[1]).toBe("renewed-access");
        expect(adminArgs[7]).toEqual(["member"]);

        const authToken = json.mock.calls[0][0].authToken as string;
        const renewed = await jwtTokenManager.verifyJWTToken(authToken, false);
        expect(renewed.accessToken).toBe("renewed-access");
        expect(renewed.encryptedRefreshToken).toBe("encrypted-refresh-2");
        expect(renewed.tags).toEqual(["member"]);
    });

    it("takes the session JWT from the Authorization header", async () => {
        const routes = registerRoutes();

        const token = await jwtTokenManager.createAuthToken(
            "john@example.com",
            "access",
            "John",
            "en-US",
            undefined,
            undefined,
            undefined,
        );
        checkTokenAuthWithRefresh.mockResolvedValue({
            userInfo: { sub: "1" },
            claims: { username: "John", locale: "en-US" },
            accessToken: "access",
            encryptedRefreshToken: undefined,
            refreshed: false,
        });
        fetchMemberDataByUuid.mockResolvedValue({ status: "ok" });

        const json = vi.fn();
        const status = vi.fn();
        await routes.get("/me")?.(
            {
                query: { playUri: "http://play.test/_/global/map.json" },
                header: bearerHeader(token),
            } as never,
            { json, status, send: vi.fn() } as never,
        );

        expect(status).not.toHaveBeenCalledWith(401);
        expect(json.mock.calls[0][0].authToken).toBe(token);
        expect(fetchMemberDataByUuid).toHaveBeenCalled();
    });

    it("rejects a token sent in the query string", async () => {
        const routes = registerRoutes();

        const token = await jwtTokenManager.createAuthToken(
            "john@example.com",
            "access",
            "John",
            "en-US",
            undefined,
            undefined,
            undefined,
        );

        const json = vi.fn();
        const status = vi.fn(() => ({ json }));
        await routes.get("/me")?.(
            {
                query: { token, playUri: "http://play.test/_/global/map.json" },
                header: () => undefined,
            } as never,
            { json, status, send: vi.fn() } as never,
        );

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith(["Missing Authorization header"]);
        expect(fetchMemberDataByUuid).not.toHaveBeenCalled();
    });

    it("rejects a request with neither a header nor a query token", async () => {
        const routes = registerRoutes();

        const json = vi.fn();
        const status = vi.fn(() => ({ json }));
        await routes.get("/me")?.(
            {
                query: { playUri: "http://play.test/_/global/map.json" },
                header: () => undefined,
            } as never,
            { json, status, send: vi.fn() } as never,
        );

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith(["Missing Authorization header"]);
    });
});
