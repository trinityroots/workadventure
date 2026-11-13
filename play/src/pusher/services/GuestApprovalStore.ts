import { randomUUID } from "crypto";

export type GuestRequestStatus = "pending" | "approved" | "declined" | "expired";

export interface GuestRequest {
    id: string;
    guestEmail: string;
    guestName: string;
    hostEmail: string;
    status: GuestRequestStatus;
    expiresAt: number;
}

/**
 * Keeps the "can I come in" requests that external guests send to team members.
 * A guest has at most one pending request. Requests expire after `ttlMs`.
 * Everything is kept in memory: a restart clears pending requests and guests simply ask again.
 */
export class GuestApprovalStore {
    private requests = new Map<string, GuestRequest>();
    private latestIdByGuest = new Map<string, string>();

    constructor(
        private readonly ttlMs: number = 120_000,
        private readonly now: () => number = Date.now,
    ) {}

    /** Creates a pending request. Throws "already_pending" if the guest still has one open. */
    public create(guestEmail: string, guestName: string, hostEmail: string): GuestRequest {
        this.purgeOldRequests();
        const guest = guestEmail.trim().toLowerCase();
        if (this.getForGuest(guest)?.status === "pending") {
            throw new Error("already_pending");
        }
        const request: GuestRequest = {
            id: randomUUID(),
            guestEmail: guest,
            guestName,
            hostEmail: hostEmail.trim().toLowerCase(),
            status: "pending",
            expiresAt: this.now() + this.ttlMs,
        };
        this.requests.set(request.id, request);
        this.latestIdByGuest.set(guest, request.id);
        return { ...request };
    }

    /** The most recent request of this guest, with its current status. */
    public getForGuest(guestEmail: string): GuestRequest | undefined {
        const id = this.latestIdByGuest.get(guestEmail.trim().toLowerCase());
        const request = id ? this.requests.get(id) : undefined;
        return request ? this.withCurrentStatus(request) : undefined;
    }

    /** The requests waiting for an answer from this team member. */
    public listPendingForHost(hostEmail: string): GuestRequest[] {
        const host = hostEmail.trim().toLowerCase();
        return [...this.requests.values()]
            .map((request) => this.withCurrentStatus(request))
            .filter((request) => request.hostEmail === host && request.status === "pending");
    }

    /** Records the host's answer. Returns false unless it came from the chosen host on a still-pending request. */
    public answer(requestId: string, hostEmail: string, approve: boolean): boolean {
        const request = this.requests.get(requestId);
        if (
            !request ||
            request.hostEmail !== hostEmail.trim().toLowerCase() ||
            this.withCurrentStatus(request).status !== "pending"
        ) {
            return false;
        }
        request.status = approve ? "approved" : "declined";
        return true;
    }

    private withCurrentStatus(request: GuestRequest): GuestRequest {
        const expired = request.status === "pending" && this.now() >= request.expiresAt;
        return { ...request, status: expired ? "expired" : request.status };
    }

    private purgeOldRequests(): void {
        const limit = this.now() - this.ttlMs * 10;
        for (const [id, request] of this.requests) {
            if (request.expiresAt < limit) {
                this.requests.delete(id);
                if (this.latestIdByGuest.get(request.guestEmail) === id) {
                    this.latestIdByGuest.delete(request.guestEmail);
                }
            }
        }
    }
}
