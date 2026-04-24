export type UserRole =
  | 'lp'
  | 'potential_lp'
  | 'vc'
  | 'startup_inprogress'
  | 'startup_onboarded'
  | 'startup_funded'
  | 'partner'
  | 'advisor'
  | 'admin'
  | 'super_admin';

export const ALL_USER_ROLES: readonly UserRole[] = [
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
];

export type ConnectionStatus =
  | 'pending_admin'
  | 'approved'
  | 'rejected_admin'
  | 'pending_target'
  | 'accepted'
  | 'declined';

export type InteractionType =
  | 'search_view'
  | 'search_click'
  | 'profile_view'
  | 'connection_request'
  | 'connection_accepted'
  | 'meeting_booked'
  | 'feedback_positive'
  | 'feedback_negative'
  | 'feedback_skip'
  | 'match_accepted'
  | 'match_rejected';

export type StartupStage =
  | 'ideation'
  | 'pre_seed'
  | 'seed'
  | 'early_growth'
  | 'pre_a'
  | 'series_a'
  | 'pre_b'
  | 'series_b'
  | 'late_growth';

export type LPFunnelStatus =
  | '1_new_lead'
  | '2_first_reach_out'
  | '3_in_conversation'
  | '4_soft_commit'
  | '5_invested';
