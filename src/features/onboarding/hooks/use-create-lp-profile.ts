import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { postLPProfile } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { LPProfileRequest, LPProfileResponse } from '@/features/onboarding/schemas';

export function useCreateLPProfile() {
  const qc = useQueryClient();
  return useMutation<LPProfileResponse, ApiError, LPProfileRequest>({
    mutationFn: postLPProfile,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.auth.me });
    },
  });
}
