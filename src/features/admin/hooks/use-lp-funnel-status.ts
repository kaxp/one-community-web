import { useMutation, useQueryClient } from '@tanstack/react-query';
import { putLpFunnelStatus } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { FunnelStatusRequest, FunnelStatusResponse } from '@/features/admin/schemas';

interface MutationArgs extends FunnelStatusRequest {
  user_id: string;
}

// PRD §7.12.5 — set LP funnel status. 409 on skip without override; the
// page surfaces an "Enable override?" dialog that re-PUTs with override=true.
// Invalidates the per-user funnel query + admin summary (audit feed).
export function useLpFunnelStatus() {
  const qc = useQueryClient();
  return useMutation<FunnelStatusResponse, ApiError, MutationArgs>({
    mutationFn: ({ user_id, status, override }) =>
      putLpFunnelStatus(user_id, override === undefined ? { status } : { status, override }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: qk.admin.lpFunnel(data.user_id) });
      void qc.invalidateQueries({ queryKey: qk.admin.summary });
    },
  });
}
