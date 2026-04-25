import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postDigestApprove } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type {
  DigestApproveRequest,
  DigestApproveResponse,
  DigestPendingResponse,
} from '@/features/digest/schemas';

interface RollbackContext {
  previous: DigestPendingResponse | undefined;
}

// PRD §7.13.2 — Approve & Send. Optimistic remove from the cached pending
// list with rollback on error. On success: also invalidate history (the
// approved row will appear there once the worker runs) + admin summary
// (recent_digests + audit feed both shift).
export function useDigestApprove() {
  const qc = useQueryClient();
  return useMutation<DigestApproveResponse, ApiError, DigestApproveRequest, RollbackContext>({
    mutationFn: (body) => postDigestApprove(body),
    onMutate: async ({ digest_id }) => {
      await qc.cancelQueries({ queryKey: qk.digest.pending });
      const previous = qc.getQueryData<DigestPendingResponse>(qk.digest.pending);
      if (previous) {
        qc.setQueryData<DigestPendingResponse>(
          qk.digest.pending,
          previous.filter((row) => row.id !== digest_id),
        );
      }
      return { previous };
    },
    onError: (_err, _args, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(qk.digest.pending, ctx.previous);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.digest.pending });
      void qc.invalidateQueries({ queryKey: qk.digest.historyAll });
      void qc.invalidateQueries({ queryKey: qk.admin.summary });
    },
  });
}
