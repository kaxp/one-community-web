import { useMutation, useQueryClient } from '@tanstack/react-query';
import { putHomeCity } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import { useAuthStore } from '@/auth/auth-store';
import type { HomeCityForm, HomeCityRequest, HomeCityResponse } from '@/features/travel/schemas';

// PRD §7.11.4 + §8.12.4 — set/update home city. On success, optimistically
// patch the auth-store so name + home_city render immediately, then
// invalidate `qk.auth.me` so /auth/me re-hydration matches server truth.
export function useUpdateHomeCity() {
  const qc = useQueryClient();
  return useMutation<HomeCityResponse, ApiError, HomeCityForm>({
    mutationFn: (form) => {
      const body: HomeCityRequest = { home_city: form.home_city };
      return putHomeCity(body);
    },
    onSuccess: (data) => {
      const current = useAuthStore.getState().user;
      if (current) {
        useAuthStore.getState().setUser({ ...current, home_city: data.home_city });
      }
      void qc.invalidateQueries({ queryKey: qk.auth.me });
    },
  });
}
