import { useQuery } from '@tanstack/react-query';
import { getAnalyticsFunnelLp } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { AnalyticsFunnelLp } from '@/features/analytics/schemas';

// PRD §7.14.2 — LP funnel counts.
export function useAnalyticsFunnelLp() {
  return useQuery<AnalyticsFunnelLp, ApiError>({
    queryKey: qk.analytics.funnelLp,
    queryFn: () => getAnalyticsFunnelLp(),
    staleTime: 60_000,
  });
}
