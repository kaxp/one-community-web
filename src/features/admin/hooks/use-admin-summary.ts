import { useQuery } from '@tanstack/react-query';
import { getAdminSummary } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { AdminSummaryResponse } from '@/features/admin/schemas';

// PRD §7.12.1 — admin/summary KPI dashboard. Caches 60s, refetches on focus
// (the "recent_actions" feed should feel fresh when an admin tabs back in).
export function useAdminSummary() {
  return useQuery<AdminSummaryResponse, ApiError>({
    queryKey: qk.admin.summary,
    queryFn: () => getAdminSummary(),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
