import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAppConfig, patchAppConfigKey } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';

export function useAppConfig() {
  return useQuery({
    queryKey: qk.admin.appConfig,
    queryFn: getAppConfig,
    meta: { suppressGlobalErrorToast: true },
  });
}

export function useUpdateAppConfig() {
  const qc = useQueryClient();
  return useMutation<
    Awaited<ReturnType<typeof patchAppConfigKey>>,
    ApiError,
    { key: string; enabled: boolean }
  >({
    mutationFn: ({ key, enabled }) => patchAppConfigKey(key, enabled),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.admin.appConfig });
    },
    meta: { suppressGlobalErrorToast: true },
  });
}
