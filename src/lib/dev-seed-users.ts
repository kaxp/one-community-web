import type { UserRole } from '@/types/enums';

export interface DevSeedUser {
  phone: string;
  role: UserRole;
  name: string;
  email: string;
}

// Mirrors backend SEED_USERS. Tree-shaken from production via import.meta.env.DEV guard in consumers.
export const DEV_SEED_USERS: readonly DevSeedUser[] = [
  { phone: '+918087464723', role: 'admin', name: 'Kapil', email: 'kapil@warmupventures.com' },
  { phone: '+911234567890', role: 'admin', name: 'Admin Dev', email: 'admin@warmupventures.com' },
  {
    phone: '+911234567891',
    role: 'super_admin',
    name: 'Super Admin Dev',
    email: 'superadmin@warmupventures.com',
  },
  { phone: '+911234567892', role: 'lp', name: 'LP Test User', email: 'lp@test.com' },
  {
    phone: '+911234567893',
    role: 'potential_lp',
    name: 'Potential LP User',
    email: 'potentiallp@test.com',
  },
  {
    phone: '+911234567894',
    role: 'startup_funded',
    name: 'Funded Startup User',
    email: 'startup@test.com',
  },
  {
    phone: '+911234567895',
    role: 'startup_inprogress',
    name: 'InProgress Startup',
    email: 'startup-ip@test.com',
  },
  { phone: '+911234567896', role: 'vc', name: 'VC Test User', email: 'vc@test.com' },
  { phone: '+911234567897', role: 'partner', name: 'Partner User', email: 'partner@test.com' },
  { phone: '+911234567898', role: 'advisor', name: 'Advisor User', email: 'advisor@test.com' },
  {
    phone: '+911234567899',
    role: 'startup_onboarded',
    name: 'Onboarded Startup',
    email: 'onboarded@test.com',
  },
];

export const DEV_OTP_BYPASS_CODE = '000000';
