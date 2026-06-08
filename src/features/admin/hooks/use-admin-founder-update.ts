import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchAdminFounder } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type {
  AdminFounderUpdateRequest,
  AdminFounderUpdateResponse,
} from '@/features/admin/schemas';

interface Args {
  founderId: string;
  body: AdminFounderUpdateRequest;
}

export function useAdminFounderUpdate() {
  const qc = useQueryClient();
  return useMutation<AdminFounderUpdateResponse, ApiError, Args>({
    mutationFn: ({ founderId, body }) => patchAdminFounder(founderId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.admin.foundersAll });
    },
  });
}
