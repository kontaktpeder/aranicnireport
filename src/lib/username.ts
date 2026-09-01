// Customers only ever see a username. Internally each account gets a stable
// synthetic email address derived from that username.
export const USERNAME_EMAIL_DOMAIN = "customers.goldofsicily.no";

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@${USERNAME_EMAIL_DOMAIN}`;
}
