// Customers only ever see a username. Internally each account gets a stable
// synthetic email address derived from that username.
// Use the real Gold of Sicily domain: it has MX records. A made-up subdomain
// like customers.goldofsicily.no is rejected by Supabase Auth as "invalid format".
export const USERNAME_EMAIL_DOMAIN = "goldofsicily.no";
export const LEGACY_USERNAME_EMAIL_DOMAIN = "customers.goldofsicily.no";

/** Letters, numbers, dot, underscore and hyphen — safe as an email local-part. */
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

const REAL_EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

// Strip everything an email local-part cannot contain (spaces, æøå, quotes …)
// so a human-friendly username still yields a valid synthetic address.
export function usernameToLocalPart(username: string) {
  return normalizeUsername(username)
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFKD")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .replace(/\.{2,}/g, ".");
}

export const sanitizeUsername = usernameToLocalPart;

export function isValidUsername(username: string) {
  return parseLoginIdentifier(username) !== null;
}

export function parseLoginIdentifier(
  identifier: string,
): { username: string; email: string } | null {
  const value = identifier.trim().toLowerCase();
  if (!value) return null;

  if (value.includes("@")) {
    if (!REAL_EMAIL_PATTERN.test(value)) return null;
    const username = usernameToLocalPart(value.slice(0, value.indexOf("@")));
    if (username.length < 3 || !USERNAME_PATTERN.test(username)) return null;
    return { username, email: value };
  }

  const username = usernameToLocalPart(value);
  if (username.length < 3 || !USERNAME_PATTERN.test(username)) return null;
  return { username, email: `${username}@${USERNAME_EMAIL_DOMAIN}` };
}

export function usernameToEmail(username: string) {
  const value = normalizeUsername(username);
  if (value.includes("@")) return value;
  return (
    parseLoginIdentifier(value)?.email ?? `${usernameToLocalPart(value)}@${USERNAME_EMAIL_DOMAIN}`
  );
}

export function identifierToEmailCandidates(identifier: string) {
  const parsed = parseLoginIdentifier(identifier);
  if (!parsed) {
    const value = identifier.trim();
    if (value.includes("@")) return [value.toLowerCase()];
    return [];
  }
  if (identifier.trim().includes("@")) return [parsed.email];
  return [...new Set([parsed.email, `${parsed.username}@${LEGACY_USERNAME_EMAIL_DOMAIN}`])];
}

// Admins may create accounts with a real email address instead of a username.
// Accept both on sign-in: anything containing "@" is used verbatim.
export function loginIdentifierToEmail(identifier: string) {
  return identifierToEmailCandidates(identifier)[0] ?? usernameToEmail(identifier);
}
