import type { UserRole } from '@/types/enums';
import type { AuthMeResponse } from '@/features/auth/schemas';

const DEFAULT_BY_ROLE: Record<UserRole, string> = {
  admin: '/admin',
  super_admin: '/admin',
  lp: '/search',
  potential_lp: '/search',
  vc: '/search',
  startup_funded: '/search',
  partner: '/search',
  startup_inprogress: '/pitch',
  startup_onboarded: '/pitch',
  advisor: '/connections/pending',
};

// Where should a user land after /signin or cold-start hydration?
export function nextRouteForUser(me: Pick<AuthMeResponse, 'role' | 'profile_complete'>): string {
  if (!me.profile_complete) return '/onboarding/profile';
  return DEFAULT_BY_ROLE[me.role];
}

// Where should a user land after /onboarding/profile submit?
// LP + potential_lp are prompted (not forced) to fill the investment profile next.
export function nextRouteAfterProfile(role: UserRole): string {
  if (role === 'lp' || role === 'potential_lp') return '/onboarding/lp-profile';
  return DEFAULT_BY_ROLE[role];
}

export function defaultHomeFor(role: UserRole): string {
  return DEFAULT_BY_ROLE[role];
}
