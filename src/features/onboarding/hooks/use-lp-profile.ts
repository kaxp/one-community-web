import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { getLPProfile } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import { useUser } from '@/auth/use-auth';
import type { LPProfileGetResponse } from '@/features/onboarding/schemas';

export function useLPProfile() {
  const user = useUser();
  const isLP = user?.role === 'lp' || user?.role === 'potential_lp';
  return useQuery<LPProfileGetResponse, ApiError>({
    queryKey: qk.onboarding.lpProfile,
    queryFn: getLPProfile,
    enabled: isLP,
  });
}
