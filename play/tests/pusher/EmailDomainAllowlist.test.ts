import { describe, expect, it } from "vitest";
import { isEmailDomainAllowed, parseAllowedEmailDomains } from "../../src/pusher/services/EmailDomainAllowlist";

describe("parseAllowedEmailDomains", () => {
    it("splits a comma separated list, trims spaces and lowercases", () => {
        expect(parseAllowedEmailDomains(" TrinityRoots.co.th , roots.tech ")).toEqual([
            "trinityroots.co.th",
            "roots.tech",
        ]);
    });

    it("returns an empty list when the setting is missing or blank", () => {
        expect(parseAllowedEmailDomains(undefined)).toEqual([]);
        expect(parseAllowedEmailDomains("  ")).toEqual([]);
    });
});

describe("isEmailDomainAllowed", () => {
    const allowed = ["trinityroots.co.th", "roots.tech"];

    it("accepts an email from an allowed domain, ignoring case", () => {
        expect(isEmailDomainAllowed("mali@trinityroots.co.th", allowed)).toBe(true);
        expect(isEmailDomainAllowed("Someone@ROOTS.TECH", allowed)).toBe(true);
    });

    it("rejects personal and unknown domains", () => {
        expect(isEmailDomainAllowed("someone@gmail.com", allowed)).toBe(false);
    });

    it("rejects look-alike domains", () => {
        expect(isEmailDomainAllowed("a@evil-trinityroots.co.th", allowed)).toBe(false);
        expect(isEmailDomainAllowed("a@trinityroots.co.th.evil.com", allowed)).toBe(false);
        expect(isEmailDomainAllowed("a@sub.roots.tech", allowed)).toBe(false);
        expect(isEmailDomainAllowed("trinityroots.co.th@gmail.com", allowed)).toBe(false);
    });

    it("rejects a value that is not an email address", () => {
        expect(isEmailDomainAllowed("1234567890", allowed)).toBe(false);
        expect(isEmailDomainAllowed("", allowed)).toBe(false);
    });

    it("allows everyone when no domain is configured", () => {
        expect(isEmailDomainAllowed("someone@gmail.com", [])).toBe(true);
    });
});
