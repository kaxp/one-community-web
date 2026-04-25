import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postMatchApprove } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type {
  MatchApproveRequest,
  MatchApproveResponse,
  MatchPendingResponse,
} from '@/features/matchmaking/schemas';

interface RollbackContext {
  previous: MatchPendingResponse | undefined;
}

// PRD §7.8.3 — admin approve. Optimistic remove + rollback. On settle,
// invalidate pending (server truth) AND user-facing suggestions (the
// approved row will appear there for the LP/startup).
export function useMatchApprove() {
  const qc = useQueryClient();
  return useMutation<MatchApproveResponse, ApiError, MatchApproveRequest, RollbackContext>({
    mutationFn: (body) => postMatchApprove(body),
    onMutate: async ({ suggestion_id }) => {
      await qc.cancelQueries({ queryKey: qk.matchmaking.pending });
      const previous = qc.getQueryData<MatchPendingResponse>(qk.matchmaking.pending);
      if (previous) {
        qc.setQueryData<MatchPendingResponse>(
          qk.matchmaking.pending,
          previous.filter((row) => row.id !== suggestion_id),
        );
      }
      return { previous };
    },
    onError: (_err, _args, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(qk.matchmaking.pending, ctx.previous);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.matchmaking.pending });
      void qc.invalidateQueries({ queryKey: qk.matchmaking.suggestions });
    },
  });
}
