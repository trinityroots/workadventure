/**
 * Parses a comma separated list of email domains (e.g. "trinityroots.co.th, roots.tech").
 * Returns lowercase, trimmed domains. A missing or blank value returns an empty list.
 */
export function parseAllowedEmailDomains(raw: string | undefined): string[] {
    return (raw ?? "")
        .split(",")
        .map((domain) => domain.trim().toLowerCase())
        .filter((domain) => domain !== "");
}

/**
 * Tells whether an email address belongs to one of the allowed domains.
 * The domain must match exactly (sub-domains and look-alike domains are rejected).
 * An empty allowed list disables the check and allows everyone.
 */
export function isEmailDomainAllowed(email: string, allowedDomains: string[]): boolean {
    if (allowedDomains.length === 0) {
        return true;
    }
    const atIndex = email.lastIndexOf("@");
    if (atIndex < 1) {
        return false;
    }
    return allowedDomains.includes(email.slice(atIndex + 1).toLowerCase());
}
