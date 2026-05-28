import { describe, expect, it } from 'vitest';
import { isSafeNextPath } from '@/features/auth/lib/safe-next-path';

// Phase 4 menu Phase B (2026-05-28) — `?next=<path>` redirect target validation.
//
// Backend mints magic links with a `next` query param pointing at the
// page the WA user asked for (e.g. /dashboard, /digest, /opportunities).
// We only honor SAME-ORIGIN paths to prevent open redirect.

describe('isSafeNextPath', () => {
  it('accepts a normal absolute path', () => {
    expect(isSafeNextPath('/dashboard')).toBe(true);
    expect(isSafeNextPath('/digest')).toBe(true);
    expect(isSafeNextPath('/admin/pitches/inbound')).toBe(true);
  });

  it('accepts a path with query params', () => {
    expect(isSafeNextPath('/search?q=fintech')).toBe(true);
    expect(isSafeNextPath('/admin/digest?tab=pending')).toBe(true);
  });

  it('rejects null / undefined / empty', () => {
    expect(isSafeNextPath(null)).toBe(false);
    expect(isSafeNextPath(undefined)).toBe(false);
    expect(isSafeNextPath('')).toBe(false);
  });

  it('rejects protocol-relative URLs (open redirect vector)', () => {
    expect(isSafeNextPath('//evil.com')).toBe(false);
    expect(isSafeNextPath('//evil.com/path')).toBe(false);
  });

  it('rejects backslash-prefixed redirects (browser-quirk vector)', () => {
    expect(isSafeNextPath('/\\evil.com')).toBe(false);
  });

  it('rejects absolute URLs with a scheme', () => {
    expect(isSafeNextPath('http://evil.com')).toBe(false);
    expect(isSafeNextPath('https://evil.com')).toBe(false);
    expect(isSafeNextPath('javascript:alert(1)')).toBe(false);
    expect(isSafeNextPath('data:text/html,foo')).toBe(false);
  });

  it('rejects paths that do not start with a slash', () => {
    expect(isSafeNextPath('dashboard')).toBe(false);
    expect(isSafeNextPath('foo/bar')).toBe(false);
  });

  it('rejects overlong paths (DoS guard)', () => {
    expect(isSafeNextPath('/' + 'a'.repeat(1000))).toBe(false);
  });
});
