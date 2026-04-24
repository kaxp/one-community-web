import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { patchProfile } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ProfileUpdateRequest, ProfileUpdateResponse } from '@/features/onboarding/schemas';

export function useCompleteProfile() {
  const qc = useQueryClient();
  return useMutation<ProfileUpdateResponse, ApiError, ProfileUpdateRequest>({
    mutationFn: patchProfile,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.auth.me });
    },
  });
}
