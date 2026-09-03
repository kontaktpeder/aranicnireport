// Customers only ever see a username. Internally each account gets a stable
// synthetic email address derived from that username.
// Use the real Gold of Sicily domain: it has MX records. A made-up subdomain
// like customers.goldofsicily.no is rejected by Supabase Auth as "invalid format".
export const USERNAME_EMAIL_DOMAIN = "goldofsicily.no";
export const LEGACY_USERNAME_EMAIL_DOMAIN = "customers.goldofsicily.no";

/** Letters, numbers, dot, underscore and hyphen — safe as an email local-part. */
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  const value = normalizeUsername(username);
  return value.length >= 3 && USERNAME_PATTERN.test(value) && !value.includes("..");
}

export function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@${USERNAME_EMAIL_DOMAIN}`;
}

export function identifierToEmailCandidates(identifier: string) {
  const value = identifier.trim();
  if (!value) return [];
  if (value.includes("@")) return [value.toLowerCase()];
  const local = normalizeUsername(value);
  return [
    ...new Set([`${local}@${USERNAME_EMAIL_DOMAIN}`, `${local}@${LEGACY_USERNAME_EMAIL_DOMAIN}`]),
  ];
}

// Admins may create accounts with a real email address instead of a username.
// Accept both on sign-in: anything containing "@" is used verbatim.
export function loginIdentifierToEmail(identifier: string) {
  return identifierToEmailCandidates(identifier)[0] ?? "";
}
