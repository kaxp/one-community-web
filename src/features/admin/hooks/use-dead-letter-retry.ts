import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postDeadLetterRetry } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { DeadLetterRetryResponse } from '@/features/admin/schemas';

// PRD §7.12.10 — retry a DLQ row. The optimistic remove from the cached
// pending page is handled by the page (it owns the offset/page-key); this
// hook just fires the call and invalidates every variant on settle so the
// row appears in the `retried` tab next.
export function useDeadLetterRetry() {
  const qc = useQueryClient();
  return useMutation<DeadLetterRetryResponse, ApiError, { id: string }>({
    mutationFn: ({ id }) => postDeadLetterRetry(id),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.admin.dlqAll });
    },
  });
}
