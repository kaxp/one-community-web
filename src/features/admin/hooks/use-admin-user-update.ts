import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchAdminUser } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { AdminUserUpdateRequest, AdminUserUpdateResponse } from '@/features/admin/schemas';

interface Args {
  userId: string;
  body: AdminUserUpdateRequest;
}

export function useAdminUserUpdate() {
  const qc = useQueryClient();
  return useMutation<AdminUserUpdateResponse, ApiError, Args>({
    mutationFn: ({ userId, body }) => patchAdminUser(userId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.admin.usersAll });
    },
  });
}
