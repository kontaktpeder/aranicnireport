// Customers only ever see a username. Internally each account gets a stable
// synthetic email address derived from that username.
export const USERNAME_EMAIL_DOMAIN = "customers.goldofsicily.no";

/** Letters, numbers, dot, underscore and hyphen — safe as an email local-part. */
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,}$/;

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  return USERNAME_PATTERN.test(normalizeUsername(username));
}

export function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@${USERNAME_EMAIL_DOMAIN}`;
}

// Admins may create accounts with a real email address instead of a username.
// Accept both on sign-in: anything containing "@" is used verbatim.
export function loginIdentifierToEmail(identifier: string) {
  const value = identifier.trim();
  return value.includes("@") ? value.toLowerCase() : usernameToEmail(value);
}
