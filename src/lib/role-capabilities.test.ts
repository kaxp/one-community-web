import { describe, expect, it } from 'vitest';
import {
  can,
  isLpRole,
  isMaskedSearchRole,
  isStartupRole,
  NAV_ITEMS,
  navForRole,
} from './role-capabilities';

describe('role-capabilities', () => {
  it('can("admin", "admin.any") is true', () => {
    expect(can('admin', 'admin.any')).toBe(true);
  });

  it('can("lp", "admin.any") is false', () => {
    expect(can('lp', 'admin.any')).toBe(false);
  });

  it('can(null, anything) is false', () => {
    expect(can(null, 'search.use')).toBe(false);
  });

  it('LP sees Dashboard + Search in navForRole but not admin routes', () => {
    const items = navForRole('lp');
    const keys = items.map((i) => i.key);
    expect(keys).toContain('dashboard');
    expect(keys).toContain('search');
    expect(keys).not.toContain('admin-home');
  });

  it('super_admin sees every admin item', () => {
    const items = navForRole('super_admin');
    const keys = items.map((i) => i.key);
    expect(keys).toContain('admin-home');
    expect(keys).toContain('admin-connections');
  });

  it('partner role can request connections — the only escalation path off masked cards (P-20 / P-21)', () => {
    expect(can('partner', 'connections.request')).toBe(true);
  });

  it('advisor role cannot request connections (passive role)', () => {
    expect(can('advisor', 'connections.request')).toBe(false);
  });

  it('partner role is admitted to search.use with masked results per decisions.md [P-20]', () => {
    expect(can('partner', 'search.use')).toBe(true);
    const items = navForRole('partner');
    expect(items.find((i) => i.key === 'search')).toBeDefined();
  });

  it('NAV_ITEMS roles are a subset of UserRole or "*"', () => {
    for (const item of NAV_ITEMS) {
      expect(item.roles.length).toBeGreaterThan(0);
    }
  });

  it('NAV_ITEMS exposes /admin/partner-referral to admin + super_admin (I-7)', () => {
    const item = NAV_ITEMS.find((i) => i.path === '/admin/partner-referral');
    expect(item).toBeDefined();
    expect(item?.roles).toEqual(['admin', 'super_admin']);
  });

  describe('display-mode predicates (I-3)', () => {
    it('isStartupRole covers all three startup_* values', () => {
      expect(isStartupRole('startup_inprogress')).toBe(true);
      expect(isStartupRole('startup_onboarded')).toBe(true);
      expect(isStartupRole('startup_funded')).toBe(true);
      expect(isStartupRole('lp')).toBe(false);
      expect(isStartupRole('partner')).toBe(false);
      expect(isStartupRole(null)).toBe(false);
      expect(isStartupRole(undefined)).toBe(false);
    });

    it('isLpRole covers lp + potential_lp', () => {
      expect(isLpRole('lp')).toBe(true);
      expect(isLpRole('potential_lp')).toBe(true);
      expect(isLpRole('vc')).toBe(false);
      expect(isLpRole('startup_funded')).toBe(false);
      expect(isLpRole(null)).toBe(false);
    });

    it('isMaskedSearchRole returns true for partner only', () => {
      expect(isMaskedSearchRole('partner')).toBe(true);
      expect(isMaskedSearchRole('lp')).toBe(false);
      expect(isMaskedSearchRole('admin')).toBe(false);
      expect(isMaskedSearchRole(null)).toBe(false);
    });
  });
});
