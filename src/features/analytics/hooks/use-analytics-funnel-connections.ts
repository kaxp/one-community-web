import { useQuery } from '@tanstack/react-query';
import { getAnalyticsFunnelConnections } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { AnalyticsFunnelConnections } from '@/features/analytics/schemas';

// PRD §7.14.4 — connections funnel counts.
export function useAnalyticsFunnelConnections() {
  return useQuery<AnalyticsFunnelConnections, ApiError>({
    queryKey: qk.analytics.funnelConnections,
    queryFn: () => getAnalyticsFunnelConnections(),
    staleTime: 60_000,
  });
}
