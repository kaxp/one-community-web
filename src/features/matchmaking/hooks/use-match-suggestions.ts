import { useQuery } from '@tanstack/react-query';
import { getMatchSuggestions } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { MatchSuggestionsResponse } from '@/features/matchmaking/schemas';

// PRD §7.8.5 — user-facing matchmaking list. Cached for 5 minutes per the
// spec. The empty-state copy nudges users to "check back on Monday", so we
// explicitly disable refetch-on-focus to avoid the empty list briefly
// flickering whenever the user tabs back in.
export function useMatchSuggestions() {
  return useQuery<MatchSuggestionsResponse, ApiError>({
    queryKey: qk.matchmaking.suggestions,
    queryFn: () => getMatchSuggestions(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
