import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAdminUser } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { AdminUserDeleteResponse } from '@/features/admin/schemas';

export function useAdminUserDelete() {
  const qc = useQueryClient();
  return useMutation<AdminUserDeleteResponse, ApiError, string>({
    mutationFn: (userId) => deleteAdminUser(userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.admin.usersAll });
    },
  });
}
