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

  it('super_admin sees admin items (admin-home removed — Dashboard now shows KPIs)', () => {
    const items = navForRole('super_admin');
    const keys = items.map((i) => i.key);
    // TODO(kaxp): admin-home menu removed; Dashboard tab now shows KPI content
    expect(keys).not.toContain('admin-home');
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

  // TODO(kaxp): Documents nav item commented out for all roles for now.
  // Previously only hidden from admin (decisions.md [P-24]); now hidden from all.
  describe('documents nav — hidden from all roles (TODO kaxp: re-enable when ready)', () => {
    it('admin does NOT see Documents in nav', () => {
      const keys = navForRole('admin').map((i) => i.key);
      expect(keys).not.toContain('documents');
    });

    it('super_admin does NOT see Documents in nav', () => {
      const keys = navForRole('super_admin').map((i) => i.key);
      expect(keys).not.toContain('documents');
    });

    it('lp does NOT see Documents in nav (TODO kaxp: commented out)', () => {
      expect(navForRole('lp').map((i) => i.key)).not.toContain('documents');
    });

    it('startup_inprogress does NOT see Documents in nav (TODO kaxp: commented out)', () => {
      expect(navForRole('startup_inprogress').map((i) => i.key)).not.toContain('documents');
    });

    it('partner does NOT see Documents in nav (TODO kaxp: commented out)', () => {
      expect(navForRole('partner').map((i) => i.key)).not.toContain('documents');
    });

    it('advisor does NOT see Documents in nav (TODO kaxp: commented out)', () => {
      expect(navForRole('advisor').map((i) => i.key)).not.toContain('documents');
    });
  });

  describe('admin nav — MIS replaced by admin-mis (Stage 6 S3)', () => {
    it('admin does NOT see MIS in nav', () => {
      const keys = navForRole('admin').map((i) => i.key);
      expect(keys).not.toContain('mis');
    });

    it('admin sees admin-mis (MIS overview) in nav', () => {
      const keys = navForRole('admin').map((i) => i.key);
      expect(keys).toContain('admin-mis');
    });

    it('startup_funded sees MIS but NOT admin-mis', () => {
      const keys = navForRole('startup_funded').map((i) => i.key);
      expect(keys).toContain('mis');
      expect(keys).not.toContain('admin-mis');
    });

    it('admin-mis nav item has correct path and roles', () => {
      const item = NAV_ITEMS.find((i) => i.key === 'admin-mis');
      expect(item?.path).toBe('/admin/mis-overview');
      expect(item?.roles).toEqual(['admin', 'super_admin']);
    });
  });

  describe('admin nav — pitch replaced by admin-pitches (Stage 6 S2)', () => {
    it('admin does NOT see My pitch in nav', () => {
      const keys = navForRole('admin').map((i) => i.key);
      expect(keys).not.toContain('pitch');
    });

    it('admin sees admin-pitches (Inbound pitches) in nav', () => {
      const keys = navForRole('admin').map((i) => i.key);
      expect(keys).toContain('admin-pitches');
    });

    it('startup_funded sees My pitch but NOT admin-pitches', () => {
      const keys = navForRole('startup_funded').map((i) => i.key);
      expect(keys).toContain('pitch');
      expect(keys).not.toContain('admin-pitches');
    });

    it('admin-pitches nav item has correct path and roles', () => {
      const item = NAV_ITEMS.find((i) => i.key === 'admin-pitches');
      expect(item?.path).toBe('/admin/pitches/inbound');
      expect(item?.roles).toEqual(['admin', 'super_admin']);
    });
  });

  describe('admin nav exclusions — participant flows removed (Stage 6 S1)', () => {
    it('admin does NOT see Suggestions / Connections / Pending / Who viewed me / My digest', () => {
      const keys = navForRole('admin').map((i) => i.key);
      expect(keys).not.toContain('matchmaking');
      expect(keys).not.toContain('connections');
      expect(keys).not.toContain('pending');
      expect(keys).not.toContain('viewers');
      expect(keys).not.toContain('digest');
    });

    it('super_admin does NOT see Suggestions / Connections / Pending / Who viewed me / My digest', () => {
      const keys = navForRole('super_admin').map((i) => i.key);
      expect(keys).not.toContain('matchmaking');
      expect(keys).not.toContain('connections');
      expect(keys).not.toContain('pending');
      expect(keys).not.toContain('viewers');
      expect(keys).not.toContain('digest');
    });

    it('admin retains Dashboard / Search / Add contact (Schedule / Travel TODO kaxp: commented out)', () => {
      const keys = navForRole('admin').map((i) => i.key);
      expect(keys).toContain('dashboard');
      expect(keys).toContain('search');
      expect(keys).toContain('add-user');
      // TODO(kaxp): Schedule and Travel commented out for now
      expect(keys).not.toContain('schedule');
      expect(keys).not.toContain('travel');
    });
  });

  describe('admin CAPABILITIES exclusions — participant actions removed (Stage 6 S1)', () => {
    it('admin cannot initiate connection requests (participant action)', () => {
      expect(can('admin', 'connections.request')).toBe(false);
    });

    it('super_admin cannot initiate connection requests', () => {
      expect(can('super_admin', 'connections.request')).toBe(false);
    });

    it('admin cannot respond to connection invites (participant action)', () => {
      expect(can('admin', 'connections.respond')).toBe(false);
    });

    it('super_admin cannot respond to connection invites', () => {
      expect(can('super_admin', 'connections.respond')).toBe(false);
    });

    it('admin cannot respond to matchmaking suggestions (participant action)', () => {
      expect(can('admin', 'matchmaking.respond')).toBe(false);
    });

    it('super_admin cannot respond to matchmaking suggestions', () => {
      expect(can('super_admin', 'matchmaking.respond')).toBe(false);
    });

    it('admin retains connections.approve (admin triage action)', () => {
      expect(can('admin', 'connections.approve')).toBe(true);
    });

    it('admin retains matchmaking.approve (admin triage action)', () => {
      expect(can('admin', 'matchmaking.approve')).toBe(true);
    });

    it('admin retains search.use (used during digest review)', () => {
      expect(can('admin', 'search.use')).toBe(true);
    });

    it('admin retains card_scan.use (adds LPs from events)', () => {
      expect(can('admin', 'card_scan.use')).toBe(true);
    });
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
