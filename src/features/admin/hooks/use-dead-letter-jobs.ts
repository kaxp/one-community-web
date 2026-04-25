import { useQuery } from '@tanstack/react-query';
import { getDeadLetterJobs, type DLQListResult } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { DLQRetryStatus } from '@/features/admin/schemas';

interface Args {
  retry_status: DLQRetryStatus;
  limit: number;
  offset: number;
}

// PRD §7.12.9 — DLQ list. OFFSET-paginated (the only endpoint that does so —
// §13 G10). Caller passes retry_status + limit + offset; the server returns
// a bare array + envelope-level pagination metadata.
export function useDeadLetterJobs(args: Args) {
  return useQuery<DLQListResult, ApiError>({
    queryKey: qk.admin.dlq(args),
    queryFn: () => getDeadLetterJobs(args),
    staleTime: 15_000,
  });
}
