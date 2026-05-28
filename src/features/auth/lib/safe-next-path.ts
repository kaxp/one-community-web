/**
 * Validate a `?next=` redirect target. The backend mints magic links with
 * deep-link paths in this query param (Phase B menu deep links: /dashboard,
 * /digest, /opportunities, …). We only accept SAME-ORIGIN paths to prevent
 * open redirect.
 *
 * Allowed: `/foo`, `/foo/bar?x=1`
 * Rejected: `//evil.com` (protocol-relative), `http://...`, `javascript:...`,
 *           anything not starting with a single `/`.
 *
 * Lives in its own file so MagicLinkPage stays a clean Fast-Refresh boundary
 * (one component export, no shared utilities). See issues.md [I-5].
 */
export function isSafeNextPath(value: string | null | undefined): value is string {
  if (!value) return false;
  if (value.length > 512) return false;
  if (!value.startsWith('/')) return false;
  // `//host` is protocol-relative → opens another origin
  if (value.startsWith('//')) return false;
  // `/\evil.com` works in some browsers
  if (value.startsWith('/\\')) return false;
  return true;
}
