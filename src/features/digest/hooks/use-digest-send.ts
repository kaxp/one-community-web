import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postAdminDigestSend } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { DigestSendRequest, DigestSendResponse } from '@/features/digest/schemas';

// PRD §7.12.4 — Send Now. Invalidates workflow list (last_send updates),
// digest history, and the admin summary's recent_digests row.
export function useDigestSend() {
  const qc = useQueryClient();
  return useMutation<DigestSendResponse, ApiError, DigestSendRequest>({
    mutationFn: (body) => postAdminDigestSend(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.admin.digest });
      void qc.invalidateQueries({ queryKey: qk.digest.historyAll });
      void qc.invalidateQueries({ queryKey: qk.admin.summary });
    },
  });
}
