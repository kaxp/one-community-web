import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requestConnection } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type {
  ConnectionRequestBody,
  ConnectionRequestResponse,
} from '@/features/connections/schemas';

// PRD §7.6.1 — `POST /connections/request`. On success, invalidate
// `qk.connections.pending` (new row appears as outgoing) and
// `qk.profile.byId(target_id)` (the profile button flips to "Pending admin
// approval"). PRD §8.12.4 invalidation matrix.
export function useRequestConnection() {
  const qc = useQueryClient();
  return useMutation<ConnectionRequestResponse, ApiError, ConnectionRequestBody>({
    mutationFn: (body) => requestConnection(body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: qk.connections.pendingAll });
      void qc.invalidateQueries({ queryKey: qk.profile.byId(vars.target_id) });
    },
  });
}
