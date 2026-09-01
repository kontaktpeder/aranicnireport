// Customers only ever see a username. Internally each account gets a stable
// synthetic email address derived from that username.
export const USERNAME_EMAIL_DOMAIN = "customers.goldofsicily.no";

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
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
