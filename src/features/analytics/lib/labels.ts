import type { LPFunnelStatus } from '@/features/admin/schemas';

// PRD §7.14.2 — display labels for the LP funnel chart. Kept as a separate
// file so the chart bundles only need this map (the admin/lib/funnel-labels
// file lives in the admin chunk and is reachable from `/admin/lp-funnel`).
export const LP_FUNNEL_LABEL: Record<LPFunnelStatus, string> = {
  '1_new_lead': 'New Lead',
  '2_first_reach_out': 'First reach-out',
  '3_in_conversation': 'In Conversation',
  '4_soft_commit': 'Soft Commit',
  '5_invested': 'Invested',
};

// PRD §7.14.3 — startup pipeline. We only label the documented six values;
// any other status renders verbatim. The page collapses anything beyond the
// top-6 by count into an "Other" bucket per the prompt.
export const STARTUP_PIPELINE_LABEL: Record<string, string> = {
  longlist: 'Longlist',
  team_reach_out: 'Team Reach-out',
  deep_dive_scheduled: 'Deep Dive',
  termsheet_discussion: 'Termsheet',
  portfolio: 'Portfolio',
  pass_for_now: 'Pass for now',
};

// PRD §7.14.4 — connections funnel. Five conn_status keys.
export const CONNECTIONS_FUNNEL_LABEL: Record<string, string> = {
  pending_admin: 'Pending (admin)',
  pending_target: 'Pending (target)',
  accepted: 'Accepted',
  declined: 'Declined',
  rejected_admin: 'Rejected (admin)',
};

export function startupPipelineLabel(status: string): string {
  return STARTUP_PIPELINE_LABEL[status] ?? status;
}

export function connectionsFunnelLabel(status: string): string {
  return CONNECTIONS_FUNNEL_LABEL[status] ?? status;
}
