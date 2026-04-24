import type { UserRole } from '@/types/enums';

export const CAPABILITIES = {
  'search.use': ['lp', 'potential_lp', 'vc', 'startup_funded', 'partner', 'admin', 'super_admin'],
  'search.see_contact': [],
  'connections.request': ['lp', 'potential_lp', 'vc', 'startup_funded', 'admin', 'super_admin'],
  'connections.respond': [
    'lp',
    'potential_lp',
    'vc',
    'startup_inprogress',
    'startup_onboarded',
    'startup_funded',
    'partner',
    'advisor',
    'admin',
    'super_admin',
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
  'matchmaking.respond': ['lp', 'potential_lp', 'vc', 'startup_funded', 'admin', 'super_admin'],
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
    roles: ['lp', 'potential_lp', 'vc', 'startup_funded', 'partner', 'admin', 'super_admin'],
  },
  {
    key: 'matchmaking',
    label: 'Suggestions',
    path: '/matchmaking',
    icon: 'Sparkles',
    roles: ['lp', 'potential_lp', 'vc', 'startup_funded', 'admin', 'super_admin'],
  },
  { key: 'connections', label: 'Connections', path: '/connections', icon: 'Users', roles: ['*'] },
  { key: 'pending', label: 'Pending', path: '/connections/pending', icon: 'Clock', roles: ['*'] },
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
    roles: ['startup_inprogress', 'startup_onboarded', 'startup_funded', 'admin', 'super_admin'],
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
  { key: 'viewers', label: 'Who viewed me', path: '/profile-viewers', icon: 'Eye', roles: ['*'] },
  { key: 'documents', label: 'Documents', path: '/documents', icon: 'Folder', roles: ['*'] },
  { key: 'digest', label: 'My digest', path: '/digest', icon: 'Newspaper', roles: ['*'] },
  {
    key: 'admin-home',
    label: 'Admin home',
    path: '/admin',
    icon: 'LayoutDashboard',
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
];

export function navForRole(role: UserRole | null | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter(
    (item) => item.roles.includes('*') || (item.roles as readonly string[]).includes(role),
  );
}
