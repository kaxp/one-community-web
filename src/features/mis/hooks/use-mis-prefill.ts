import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { getMisHistory } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { MISHistoryResponse } from '@/features/mis/schemas';

interface Args {
  companyId?: string | undefined;
  limit?: number;
  enabled?: boolean;
}

// PRD §7.9.3 — past MIS file submissions list.
// Renamed from useMisPrefill (structured-form era) to useMisHistory after
// the P-23 file-upload redesign. The old name is kept for import compatibility;
// prefer the alias below in new code.
export function useMisHistory({ companyId, limit = 12, enabled = true }: Args = {}) {
  return useQuery<MISHistoryResponse, ApiError>({
    queryKey: companyId ? [...qk.mis.history, { companyId }] : qk.mis.history,
    queryFn: () => getMisHistory(companyId ? { companyId, limit } : { limit }),
    staleTime: 60_000,
    enabled,
  });
}

/** @deprecated Use `useMisHistory` instead. */
export const useMisPrefill = useMisHistory;
