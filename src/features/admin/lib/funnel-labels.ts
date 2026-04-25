import type { LPFunnelStatus } from '@/features/admin/schemas';

// PRD §7.12.5 transformation note + §13.5 (LP funnel status). Single source
// of truth for LP funnel display labels — referenced from the funnel page,
// the badge, and any future analytics surface.
export const FUNNEL_LABEL: Record<LPFunnelStatus, string> = {
  '1_new_lead': 'New Lead',
  '2_first_reach_out': 'First reach-out',
  '3_in_conversation': 'In Conversation',
  '4_soft_commit': 'Soft Commit',
  '5_invested': 'Invested',
};

// Step index used to detect skip-forward attempts client-side. The backend
// also checks; this is purely UX (we want to show "needs override" as a
// hint before submit).
export const FUNNEL_INDEX: Record<LPFunnelStatus, number> = {
  '1_new_lead': 1,
  '2_first_reach_out': 2,
  '3_in_conversation': 3,
  '4_soft_commit': 4,
  '5_invested': 5,
};
