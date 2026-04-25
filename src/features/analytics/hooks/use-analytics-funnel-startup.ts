import { useQuery } from '@tanstack/react-query';
import { getAnalyticsFunnelStartup } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { AnalyticsFunnelStartup } from '@/features/analytics/schemas';

// PRD §7.14.3 — startup pipeline counts.
export function useAnalyticsFunnelStartup() {
  return useQuery<AnalyticsFunnelStartup, ApiError>({
    queryKey: qk.analytics.funnelStartup,
    queryFn: () => getAnalyticsFunnelStartup(),
    staleTime: 60_000,
  });
}
