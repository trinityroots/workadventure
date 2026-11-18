// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/pusher/enums/EnvironmentVariable", async () => ({
    ...(await import("./mocks/pusherEnvironmentVariableMock")),
}));

const { jwtTokenManager } = await import("../../src/pusher/services/JWTTokenManager");

async function guestToken(guest: "pending" | "approved") {
    return jwtTokenManager.createAuthToken(
        "anna@gmail.com",
        undefined,
        "Anna Smith",
        undefined,
        undefined,
        undefined,
        undefined,
        guest,
    );
}

describe("guest tokens", () => {
    it("refuses a pending guest token everywhere unless the caller explicitly allows it", async () => {
        const token = await guestToken("pending");
        await expect(jwtTokenManager.verifyJWTToken(token)).rejects.toThrow();
        await expect(jwtTokenManager.verifyJWTToken(token, true)).rejects.toThrow();
    });

    it("accepts a pending guest token when explicitly allowed", async () => {
        const token = await guestToken("pending");
        const data = await jwtTokenManager.verifyJWTToken(token, false, true);
        expect(data.identifier).toBe("anna@gmail.com");
        expect(data.guest).toBe("pending");
    });

    it("accepts an approved guest token like a normal token", async () => {
        const token = await guestToken("approved");
        const data = await jwtTokenManager.verifyJWTToken(token);
        expect(data.guest).toBe("approved");
        expect(data.username).toBe("Anna Smith");
    });

    it("leaves normal company tokens unchanged", async () => {
        const token = await jwtTokenManager.createAuthToken("mali@trinityroots.co.th", "access", "Mali");
        const data = await jwtTokenManager.verifyJWTToken(token);
        expect(data.guest).toBeUndefined();
    });
});
