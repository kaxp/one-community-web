import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { respondToConnection } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type {
  PendingConnectionsResponse,
  RespondAction,
  RespondResponse,
} from '@/features/connections/schemas';

interface MutationArgs {
  connection_id: string;
  action: RespondAction;
  // Counterpart user id — needed so we can invalidate qk.profile.byId(counterpart)
  // after accept so /profile/:id unmasks the contact card. (PRD §7.6.3 transformation note.)
  counterpart_id: string;
}

interface RollbackContext {
  previous: InfiniteData<PendingConnectionsResponse> | undefined;
}

// PRD §7.6.3 — `PATCH /connections/{id}/respond`.
// Optimistic remove from `qk.connections.pending`. On accept, also invalidate
// `qk.connections.list` (new accepted row) and `qk.profile.byId(counterpart)`
// (contact unmasks). On error, restore the cached pending list.
export function useRespondToConnection() {
  const qc = useQueryClient();
  return useMutation<RespondResponse, ApiError, MutationArgs, RollbackContext>({
    mutationFn: ({ connection_id, action }) => respondToConnection(connection_id, { action }),
    onMutate: async ({ connection_id }) => {
      await qc.cancelQueries({ queryKey: qk.connections.pendingAll });
      const queryKey = qk.connections.pending(50);
      const previous = qc.getQueryData<InfiniteData<PendingConnectionsResponse>>(queryKey);
      if (previous) {
        qc.setQueryData<InfiniteData<PendingConnectionsResponse>>(queryKey, {
          ...previous,
          pages: previous.pages.map((page) => ({
            ...page,
            items: page.items.filter((row) => row.connection_id !== connection_id),
          })),
        });
      }
      return { previous };
    },
    onError: (_err, _args, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(qk.connections.pending(50), ctx.previous);
      }
    },
    onSettled: (_data, _err, args) => {
      void qc.invalidateQueries({ queryKey: qk.connections.pendingAll });
      if (args.action === 'accept') {
        void qc.invalidateQueries({ queryKey: qk.connections.listAll });
        void qc.invalidateQueries({ queryKey: qk.profile.byId(args.counterpart_id) });
      }
    },
  });
}
