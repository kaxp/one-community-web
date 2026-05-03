import type { UserRole } from '@/types/enums';

export const CAPABILITIES = {
  // Partner is admitted to search with backend-side field masking (decisions.md
  // [P-20]). Partners see only `user_id, name, company_name, sector, stage,
  // one_liner` for startup targets and `user_id, name, fund_name, sectors`
  // for LP targets — enough to identify, never enough to reach off-platform.
  // Connection request (admin-gated) is the only escalation path.
  'search.use': ['lp', 'potential_lp', 'vc', 'startup_funded', 'partner', 'admin', 'super_admin'],
  'search.see_contact': [],
  // Partner is admitted (decisions.md [P-20] / [P-21]) — request-to-connect is
  // the only escalation path partners have to unlock contact data.
  'connections.request': ['lp', 'potential_lp', 'vc', 'startup_funded', 'partner'],
  'connections.respond': [
    'lp',
    'potential_lp',
    'vc',
    'startup_inprogress',
    'startup_onboarded',
    'startup_funded',
    'partner',
    'advisor',
  ],
  'connections.approve': ['admin', 'super_admin'],
  'pitch.edit': [
    'startup_inprogress',
    'startup_onboarded',
    'startup_funded',
    'admin',
    'super_admin',
  ],
  'mis.submit': ['startup_funded', 'admin', 'super_admin'],
  'matchmaking.respond': ['lp', 'potential_lp', 'vc', 'startup_funded'],
  'matchmaking.approve': ['admin', 'super_admin'],
  'admin.any': ['admin', 'super_admin'],
  'analytics.view': ['admin', 'super_admin'],
  'tracxn.ingest': ['admin', 'super_admin'],
  'card_scan.use': ['lp', 'potential_lp', 'vc', 'admin', 'super_admin'],
} as const satisfies Record<string, readonly UserRole[]>;

export type Capability = keyof typeof CAPABILITIES;

export function can(role: UserRole | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return (CAPABILITIES[capability] as readonly UserRole[]).includes(role);
}

// Display-mode predicates — use these for branching UI presentation, not for
// security gating. `can()` remains the only sanctioned way to gate capabilities.
// Centralising the role-set membership here keeps inline `role === 'xxx'` chains
// out of feature code (CLAUDE.md §3.4).

const STARTUP_ROLES: readonly UserRole[] = [
  'startup_inprogress',
  'startup_onboarded',
  'startup_funded',
];

const LP_ROLES: readonly UserRole[] = ['lp', 'potential_lp'];

const MASKED_SEARCH_ROLES: readonly UserRole[] = ['partner'];

export function isStartupRole(role: UserRole | null | undefined): boolean {
  return !!role && STARTUP_ROLES.includes(role);
}

export function isLpRole(role: UserRole | null | undefined): boolean {
  return !!role && LP_ROLES.includes(role);
}

export function isMaskedSearchRole(role: UserRole | null | undefined): boolean {
  return !!role && MASKED_SEARCH_ROLES.includes(role);
}

export interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: string;
  roles: readonly (UserRole | '*')[];
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'Home', roles: ['*'] },
  {
    key: 'search',
    label: 'Search',
    path: '/search',
    icon: 'Search',
    // Partner admitted with masked results — see comment on CAPABILITIES['search.use'].
    roles: ['lp', 'potential_lp', 'vc', 'startup_funded', 'partner', 'admin', 'super_admin'],
  },
  {
    key: 'matchmaking',
    label: 'Suggestions',
    path: '/matchmaking',
    icon: 'Sparkles',
    roles: ['lp', 'potential_lp', 'vc', 'startup_funded'],
  },
  {
    key: 'connections',
    label: 'Connections',
    path: '/connections',
    icon: 'Users',
    roles: [
      'lp',
      'potential_lp',
      'vc',
      'startup_inprogress',
      'startup_onboarded',
      'startup_funded',
      'partner',
      'advisor',
    ],
  },
  {
    key: 'pending',
    label: 'Pending',
    path: '/connections/pending',
    icon: 'Clock',
    roles: [
      'lp',
      'potential_lp',
      'vc',
      'startup_inprogress',
      'startup_onboarded',
      'startup_funded',
      'partner',
      'advisor',
    ],
  },
  {
    key: 'add-user',
    label: 'Add contact',
    path: '/add-user',
    icon: 'UserPlus',
    roles: ['lp', 'potential_lp', 'vc', 'admin', 'super_admin'],
  },
  {
    key: 'pitch',
    label: 'My pitch',
    path: '/pitch',
    icon: 'FileText',
    roles: ['startup_inprogress', 'startup_onboarded', 'startup_funded'],
  },
  {
    key: 'mis',
    label: 'MIS',
    path: '/mis',
    icon: 'BarChart3',
    roles: ['startup_funded', 'admin', 'super_admin'],
  },
  { key: 'schedule', label: 'Schedule', path: '/schedule', icon: 'Calendar', roles: ['*'] },
  { key: 'travel', label: 'Travel', path: '/travel', icon: 'Plane', roles: ['*'] },
  {
    key: 'viewers',
    label: 'Who viewed me',
    path: '/profile-viewers',
    icon: 'Eye',
    roles: [
      'lp',
      'potential_lp',
      'vc',
      'startup_inprogress',
      'startup_onboarded',
      'startup_funded',
      'partner',
      'advisor',
    ],
  },
  { key: 'documents', label: 'Documents', path: '/documents', icon: 'Folder', roles: ['*'] },
  {
    key: 'digest',
    label: 'My digest',
    path: '/digest',
    icon: 'Newspaper',
    roles: [
      'lp',
      'potential_lp',
      'vc',
      'startup_inprogress',
      'startup_onboarded',
      'startup_funded',
      'partner',
      'advisor',
    ],
  },
  {
    key: 'admin-home',
    label: 'Admin home',
    path: '/admin',
    icon: 'LayoutDashboard',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'admin-pitches',
    label: 'Inbound pitches',
    path: '/admin/pitches/inbound',
    icon: 'FileSearch',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'admin-connections',
    label: 'Connection queue',
    path: '/admin/connections',
    icon: 'Inbox',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'admin-digest',
    label: 'Digests',
    path: '/admin/digest',
    icon: 'Mail',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'admin-match',
    label: 'Matchmaking ops',
    path: '/admin/matchmaking',
    icon: 'Zap',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'admin-reports',
    label: 'Quarterly reports',
    path: '/admin/quarterly-reports',
    icon: 'FileCheck',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'admin-dlq',
    label: 'Dead-letter jobs',
    path: '/admin/dead-letter-jobs',
    icon: 'AlertTriangle',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'admin-analytics',
    label: 'Analytics',
    path: '/admin/analytics',
    icon: 'PieChart',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'admin-lp-funnel',
    label: 'LP funnel',
    path: '/admin/lp-funnel',
    icon: 'Route',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'admin-tracxn',
    label: 'Tracxn ingest',
    path: '/admin/tracxn',
    icon: 'Globe',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'admin-partner-referral',
    label: 'Partner referral',
    path: '/admin/partner-referral',
    icon: 'Megaphone',
    roles: ['admin', 'super_admin'],
  },
];

export function navForRole(role: UserRole | null | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter(
    (item) => item.roles.includes('*') || (item.roles as readonly string[]).includes(role),
  );
}
