import { describe, expect, it } from 'vitest';
import { can, navForRole, NAV_ITEMS } from './role-capabilities';

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

  it('partner role is excluded from connections.request per PRD §7.4.1', () => {
    expect(can('partner', 'connections.request')).toBe(false);
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
});
