import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { adminActOnConnection } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type {
  AdminActionRequest,
  AdminActionResponse,
  AdminConnectionsResponse,
  AdminConnectionStatus,
} from '@/features/admin/schemas';

interface MutationArgs extends AdminActionRequest {
  connection_id: string;
  // The current tab the row was visible under — drives the optimistic remove.
  current_status: AdminConnectionStatus;
}

interface RollbackContext {
  status: AdminConnectionStatus;
  previous: InfiniteData<AdminConnectionsResponse> | undefined;
}

// PRD §7.6.2 + §7.12.2 transformation note: optimistic remove from the cached list,
// rollback on error, refetch on 409. Invalidate qk.admin.connections (all statuses),
// qk.admin.summary (badge count), qk.connections.pending (target-side queue).
export function useAdminConnectionAction() {
  const qc = useQueryClient();
  return useMutation<AdminActionResponse, ApiError, MutationArgs, RollbackContext>({
    mutationFn: ({ connection_id, action, note }) =>
      adminActOnConnection(connection_id, note !== undefined ? { action, note } : { action }),
    onMutate: async ({ connection_id, current_status }) => {
      const queryKey = qk.admin.connections.list(current_status);
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<InfiniteData<AdminConnectionsResponse>>(queryKey);
      if (previous) {
        qc.setQueryData<InfiniteData<AdminConnectionsResponse>>(queryKey, {
          ...previous,
          pages: previous.pages.map((page) => ({
            ...page,
            items: page.items.filter((row) => row.connection_id !== connection_id),
          })),
        });
      }
      return { status: current_status, previous };
    },
    onError: (_err, _args, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(qk.admin.connections.list(ctx.status), ctx.previous);
      }
    },
    onSettled: () => {
      // Server is the source of truth — refetch every list (status-keyed) so the
      // moved row appears under its new status, plus the badge count + target queue.
      void qc.invalidateQueries({ queryKey: qk.admin.connections.all });
      void qc.invalidateQueries({ queryKey: qk.admin.summary });
      void qc.invalidateQueries({ queryKey: qk.connections.pendingAll });
    },
  });
}
