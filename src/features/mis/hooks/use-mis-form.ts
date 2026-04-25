import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { getMisForm } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { MISFormResponse } from '@/features/mis/schemas';

// PRD §7.9.1 — current-month form schema + prefill. Errors (404, 500) flow
// through ApiError; the route renders <ErrorState> on isError.
export function useMisForm() {
  return useQuery<MISFormResponse, ApiError>({
    queryKey: qk.mis.form,
    queryFn: getMisForm,
    staleTime: 60_000,
  });
}
