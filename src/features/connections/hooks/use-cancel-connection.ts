import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelConnectionRequest } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';

export function useCancelConnection() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (connectionId) => cancelConnectionRequest(connectionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.connections.pendingAll });
    },
  });
}
