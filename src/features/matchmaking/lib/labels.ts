import type { MatchSuggestion } from '@/features/matchmaking/schemas';

// PRD §7.8.5 transformation note — score is 0..1 float. Three buckets per
// the prompt: > 0.8 strong, 0.6–0.8 moderate, < 0.6 weak. `null` → muted.
export function scoreBadgeVariant(
  score: number | null,
): 'success' | 'warning' | 'secondary' | 'outline' {
  if (score === null) return 'outline';
  if (score > 0.8) return 'success';
  if (score >= 0.6) return 'warning';
  return 'secondary';
}

export function fmtScore(score: number | null): string {
  if (score === null || Number.isNaN(score)) return '—';
  return `${Math.round(score * 100)}% match`;
}

export type Perspective = 'i_am_lp' | 'i_am_startup' | 'admin_view';

export function perspectiveFor(
  suggestion: Pick<MatchSuggestion, 'lp_id' | 'startup_id'>,
  myUserId: string | null | undefined,
): Perspective {
  if (!myUserId) return 'admin_view';
  if (suggestion.lp_id === myUserId) return 'i_am_lp';
  if (suggestion.startup_id === myUserId) return 'i_am_startup';
  return 'admin_view';
}

// Header label for the counterpart's role. The PRD's hydrated fields
// (`company_name`, `sector`, `one_liner`) are described as startup attributes
// in §7.8.4/§7.8.5, but the user-facing list semantically displays the OTHER
// side — so when the caller is a startup we surface the same fields under an
// "Investor" header. Admin previews fall through to a neutral label.
export function counterpartLabel(perspective: Perspective): string {
  if (perspective === 'i_am_lp') return 'Startup';
  if (perspective === 'i_am_startup') return 'Investor';
  return 'Suggestion';
}
