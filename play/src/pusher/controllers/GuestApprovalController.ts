import { createHmac } from "crypto";
import type { Application, Request, Response } from "express";
import { z } from "zod";
import { OPENID_ALLOWED_EMAIL_DOMAINS, SECRET_KEY } from "../enums/EnvironmentVariable";
import type { AuthTokenData } from "../services/JWTTokenManager";
import { jwtTokenManager } from "../services/JWTTokenManager";
import { isEmailDomainAllowed } from "../services/EmailDomainAllowlist";
import type { GuestApprovalStore } from "../services/GuestApprovalStore";
import { BaseHttpController } from "./BaseHttpController";

export interface OnlineMember {
    email: string;
    name: string;
}

const RequestBody = z.object({ hostId: z.string(), guestName: z.string().trim().min(1).max(40) });
const AnswerBody = z.object({ approve: z.boolean() });

/**
 * HTTP endpoints for the "ask a team member to let me in" flow of external guests.
 * Guests (pass "pending") pick an online team member and wait. Team members answer from their inbox.
 */
export class GuestApprovalController extends BaseHttpController {
    constructor(
        app: Application,
        private readonly store: GuestApprovalStore,
        private readonly getOnlineMembers: () => OnlineMember[],
    ) {
        super(app);
    }

    protected routes(): void {
        this.app.get("/guest/hosts", async (req, res) => {
            const token = await this.authenticate(req, res);
            if (!token || !this.requirePendingGuest(token, res)) {
                return;
            }
            res.json({ hosts: this.listHosts().map(({ id, name }) => ({ id, name })) });
        });

        this.app.post("/guest/requests", async (req, res) => {
            const token = await this.authenticate(req, res);
            if (!token || !this.requirePendingGuest(token, res)) {
                return;
            }
            const body = RequestBody.safeParse(req.body);
            if (!body.success) {
                res.status(400).json({ error: "invalid_request" });
                return;
            }
            const host = this.listHosts().find((candidate) => candidate.id === body.data.hostId);
            if (!host) {
                res.status(404).json({ error: "host_offline" });
                return;
            }
            try {
                this.store.create(token.identifier, body.data.guestName, host.email);
            } catch (err) {
                if (err instanceof Error && err.message === "already_pending") {
                    res.status(409).json({ error: "already_pending" });
                    return;
                }
                throw err;
            }
            res.json({ status: "pending" });
        });

        this.app.get("/guest/requests/current", async (req, res) => {
            const token = await this.authenticate(req, res);
            if (!token || !this.requirePendingGuest(token, res)) {
                return;
            }
            const request = this.store.getForGuest(token.identifier);
            if (!request) {
                res.status(404).json({ error: "no_request" });
                return;
            }
            if (request.status !== "approved") {
                res.json({ status: request.status });
                return;
            }
            const authToken = await jwtTokenManager.createAuthToken(
                token.identifier,
                undefined,
                request.guestName,
                token.locale,
                undefined,
                undefined,
                undefined,
                "approved",
            );
            res.json({ status: "approved", authToken });
        });

        this.app.get("/guest/inbox", async (req, res) => {
            const token = await this.authenticate(req, res);
            if (!token || !this.requireStaff(token, res)) {
                return;
            }
            const requests = this.store.listPendingForHost(token.identifier).map((request) => ({
                id: request.id,
                guestName: request.guestName,
                guestEmail: request.guestEmail,
                expiresAt: request.expiresAt,
            }));
            res.json({ requests });
        });

        this.app.post("/guest/inbox/:id/answer", async (req, res) => {
            const token = await this.authenticate(req, res);
            if (!token || !this.requireStaff(token, res)) {
                return;
            }
            const body = AnswerBody.safeParse(req.body);
            if (!body.success) {
                res.status(400).json({ error: "invalid_request" });
                return;
            }
            const id = String(req.params.id);
            if (!this.store.answer(id, token.identifier, body.data.approve)) {
                res.status(404).json({ error: "request_not_found" });
                return;
            }
            res.json({ status: body.data.approve ? "approved" : "declined" });
        });
    }

    private async authenticate(req: Request, res: Response): Promise<AuthTokenData | undefined> {
        const authHeader = req.header("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) {
            res.status(401).json(["Missing Authorization header"]);
            return undefined;
        }
        try {
            return await jwtTokenManager.verifyJWTToken(token, false, true);
        } catch {
            res.status(401).json(["Invalid token"]);
            return undefined;
        }
    }

    private requirePendingGuest(token: AuthTokenData, res: Response): boolean {
        if (token.guest !== "pending") {
            res.status(403).json({ error: "not_a_waiting_guest" });
            return false;
        }
        return true;
    }

    private requireStaff(token: AuthTokenData, res: Response): boolean {
        if (token.guest !== undefined || !isEmailDomainAllowed(token.identifier, OPENID_ALLOWED_EMAIL_DOMAINS)) {
            res.status(403).json({ error: "not_a_team_member" });
            return false;
        }
        return true;
    }

    /** Online team members, each with an opaque id so guests never learn staff email addresses. */
    private listHosts(): { id: string; name: string; email: string }[] {
        const seen = new Set<string>();
        const hosts: { id: string; name: string; email: string }[] = [];
        for (const member of this.getOnlineMembers()) {
            const email = member.email.trim().toLowerCase();
            if (seen.has(email) || !isEmailDomainAllowed(email, OPENID_ALLOWED_EMAIL_DOMAINS)) {
                continue;
            }
            seen.add(email);
            const id = createHmac("sha256", SECRET_KEY).update(`guest-host:${email}`).digest("hex").slice(0, 24);
            hosts.push({ id, name: member.name, email });
        }
        return hosts;
    }
}
