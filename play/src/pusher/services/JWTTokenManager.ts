import { jwtVerify, SignJWT, errors } from "jose";
import z from "zod";
import { ADMIN_SOCKETS_TOKEN, SECRET_KEY } from "../enums/EnvironmentVariable";

export const AuthTokenData = z.object({
    identifier: z.string(), //will be a email if logged in or an uuid if anonymous
    accessToken: z.string().optional(),
    encryptedRefreshToken: z.string().optional(),
    username: z.string().optional(),
    locale: z.string().optional(),
    tags: z
        .preprocess((val) => {
            if (typeof val === "string") {
                try {
                    return JSON.parse(val);
                } catch {
                    return [val];
                }
            }
            return val;
        }, z.string().array())
        .optional(),
    matrixUserId: z.string().optional(),
    // Set for external guests: "pending" until a team member lets them in, then "approved".
    guest: z.enum(["pending", "approved"]).optional(),
});
export type AuthTokenData = z.infer<typeof AuthTokenData>;

export const AccessTokenData = z.object({
    tags: z
        .preprocess((val) => {
            if (typeof val === "string") {
                try {
                    return JSON.parse(val);
                } catch {
                    return [val];
                }
            }
            return val;
        }, z.string().array())
        .optional(),
});
export type AccessTokenData = z.infer<typeof AccessTokenData>;

export const AdminSocketTokenData = z.object({
    authorizedRoomIds: z.string().array(), //the list of rooms the client is authorized to read from.
});
export type AdminSocketTokenData = z.infer<typeof AdminSocketTokenData>;
export const tokenInvalidException = "tokenInvalid";

const secret = new TextEncoder().encode(SECRET_KEY ?? "");
const adminSocketsSecret = new TextEncoder().encode(ADMIN_SOCKETS_TOKEN ?? "");

export class JWTTokenManager {
    public async verifyAdminSocketToken(token: string): Promise<AdminSocketTokenData> {
        if (!ADMIN_SOCKETS_TOKEN) {
            throw new Error("Missing environment variable ADMIN_SOCKETS_TOKEN");
        }

        const verifiedToken = (await jwtVerify(token, adminSocketsSecret)).payload;

        return AdminSocketTokenData.parse(verifiedToken);
    }

    public async createAuthToken(
        identifier: string,
        accessToken?: string,
        username?: string,
        locale?: string,
        tags?: string[],
        matrixUserId?: string,
        encryptedRefreshToken?: string,
        guest?: "pending" | "approved",
    ): Promise<string> {
        return new SignJWT({
            identifier,
            accessToken,
            username,
            locale,
            tags,
            matrixUserId,
            encryptedRefreshToken,
            guest,
        })
            .setExpirationTime(guest === "pending" ? "1h" : guest === "approved" ? "8h" : "30d")
            .setProtectedHeader({ alg: "HS256" })
            .sign(secret);
    }

    /**
     * Verifies a session token. A guest who is still waiting for approval is refused,
     * unless the caller (the guest approval endpoints) explicitly allows it.
     */
    public async verifyJWTToken(
        token: string,
        ignoreExpiration = false,
        allowPendingGuest = false,
    ): Promise<AuthTokenData> {
        let data: AuthTokenData;
        try {
            data = AuthTokenData.parse((await jwtVerify(token, secret)).payload);
        } catch (error) {
            if (ignoreExpiration && error instanceof errors.JWTExpired) {
                data = AuthTokenData.parse(error.payload);
            } else {
                throw new errors.JWTInvalid("Token is invalid");
            }
        }
        if (data.guest === "pending" && (!allowPendingGuest || ignoreExpiration)) {
            throw new errors.JWTInvalid("Guest is not approved yet");
        }
        return data;
    }
}

export const jwtTokenManager = new JWTTokenManager();
