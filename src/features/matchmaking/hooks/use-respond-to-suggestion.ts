import { useMutation, useQueryClient } from '@tanstack/react-query';
import { respondToSuggestion } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type {
  MatchSuggestionsResponse,
  RespondAction,
  RespondResult,
} from '@/features/matchmaking/schemas';

interface MutationArgs {
  suggestion_id: string;
  action: RespondAction;
}

interface RollbackContext {
  previous: MatchSuggestionsResponse | undefined;
}

// PRD §7.8.6 + §8.12.4 + §8.12.5 — respond to a user-facing suggestion with an
// optimistic remove from the cached list. Rollback on error, refetch on
// settle. When the response carries `connection_created=true`, also
// invalidate `qk.connections.pending` so the new request appears in the
// requester's pending tab.
export function useRespondToSuggestion() {
  const qc = useQueryClient();
  return useMutation<RespondResult, ApiError, MutationArgs, RollbackContext>({
    mutationFn: ({ suggestion_id, action }) => respondToSuggestion(suggestion_id, { action }),
    onMutate: async ({ suggestion_id }) => {
      await qc.cancelQueries({ queryKey: qk.matchmaking.suggestions });
      const previous = qc.getQueryData<MatchSuggestionsResponse>(qk.matchmaking.suggestions);
      if (previous) {
        qc.setQueryData<MatchSuggestionsResponse>(
          qk.matchmaking.suggestions,
          previous.filter((row) => row.id !== suggestion_id),
        );
      }
      return { previous };
    },
    onError: (_err, _args, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(qk.matchmaking.suggestions, ctx.previous);
      }
    },
    onSuccess: (data) => {
      if (data.connection_created) {
        void qc.invalidateQueries({ queryKey: qk.connections.pendingAll });
      }
    },
    onSettled: () => {
      // Server is the source of truth — refetch so a 409 / network race
      // reconciles with the actual server state.
      void qc.invalidateQueries({ queryKey: qk.matchmaking.suggestions });
    },
  });
}
