import type { UserRole } from '@/types/enums';
import type { AuthMeResponse } from '@/features/auth/schemas';

// Per decisions.md [P-18] (overrides PRD §10.2): every manual sign-in lands on
// /dashboard, regardless of role. The role-based map below is reserved for
// post-onboarding workflow continuation, not the signin landing.
const POST_ONBOARDING_BY_ROLE: Record<UserRole, string> = {
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
// Always /dashboard if profile is complete; /onboarding/profile if not.
export function nextRouteForUser(me: Pick<AuthMeResponse, 'role' | 'profile_complete'>): string {
  if (!me.profile_complete) return '/onboarding/profile';
  return '/dashboard';
}

// Where should a user land after /onboarding/profile submit?
// LP + potential_lp are prompted (not forced) to fill the investment profile next.
// All other roles continue into their workflow home.
export function nextRouteAfterProfile(role: UserRole): string {
  if (role === 'lp' || role === 'potential_lp') return '/onboarding/lp-profile';
  return POST_ONBOARDING_BY_ROLE[role];
}

// Workflow home for a given role — used by the LP-profile Skip button and similar
// onboarding-completion paths. NOT used by the signin flow.
export function defaultHomeFor(role: UserRole): string {
  return POST_ONBOARDING_BY_ROLE[role];
}
