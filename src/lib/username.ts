// Customers only ever see a username. Internally each account gets a stable
// synthetic email address derived from that username.
export const USERNAME_EMAIL_DOMAIN = "customers.goldofsicily.no";

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
    .replace(/^[-.]+|[-.]+$/g, "");
}

export function usernameToEmail(username: string) {
  // Already a real email address → use it verbatim.
  const value = normalizeUsername(username);
  if (value.includes("@")) return value;
  return `${usernameToLocalPart(value)}@${USERNAME_EMAIL_DOMAIN}`;
}

// Admins may create accounts with a real email address instead of a username.
// Accept both on sign-in: anything containing "@" is used verbatim.
export function loginIdentifierToEmail(identifier: string) {
  const value = identifier.trim();
  return value.includes("@") ? value.toLowerCase() : usernameToEmail(value);
}
