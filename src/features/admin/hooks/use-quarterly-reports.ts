import { useQuery } from '@tanstack/react-query';
import { getQuarterlyReports } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { QuarterlyReportsResponse } from '@/features/admin/schemas';

interface Args {
  quarter: string | null;
}

// PRD §7.12.7 — quarterly reports list, optional `?quarter=` filter.
export function useQuarterlyReports({ quarter }: Args) {
  return useQuery<QuarterlyReportsResponse, ApiError>({
    queryKey: qk.admin.quarterlyReports(quarter),
    queryFn: () => getQuarterlyReports(quarter ? { quarter } : {}),
    staleTime: 60_000,
  });
}
