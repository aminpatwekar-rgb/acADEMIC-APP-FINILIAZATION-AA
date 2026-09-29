/**
 * ONYX Runtime Configuration
 *
 * Centralizes environment-driven configuration so that no secrets, emails,
 * or deployment-specific values are hardcoded inside application components.
 */

/**
 * Bootstrap administrator emails (comma-separated).
 *
 * SECURITY NOTE: This is ONLY a client-side convenience for first-time
 * provisioning of the very first admin account. It is NOT a security
 * boundary — Firestore Security Rules and the `users` collection role
 * field are the source of truth for authorization.
 *
 * Production hardening path:
 *   1. Provision admins via the Admin page (role stored in Firestore), or
 *   2. Set custom claims (`role: "admin"`) via the Firebase Admin SDK, which
 *      rules already honor through `request.auth.token.role`.
 *
 * Leave this empty in production to disable bootstrap entirely.
 */
const rawBootstrapAdmins =
  (import.meta.env.VITE_ADMIN_BOOTSTRAP_EMAILS as string | undefined) || '';

export const BOOTSTRAP_ADMIN_EMAILS: ReadonlySet<string> = new Set(
  rawBootstrapAdmins
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

/** Returns true when the email belongs to a configured bootstrap admin. */
export function isBootstrapAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return BOOTSTRAP_ADMIN_EMAILS.has(email.toLowerCase());
}
