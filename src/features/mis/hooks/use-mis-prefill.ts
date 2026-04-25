import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { getMisPrefill } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { MISPrefillResponse } from '@/features/mis/schemas';

interface Args {
  companyId?: string | undefined;
  enabled?: boolean;
}

// PRD §7.9.3 — last-month MIS values. Runs in parallel with `useMisForm`
// per task brief; for non-admin founders the current-month form already
// echoes prefill (§7.9.1), but this hook is the canonical source admins
// hit via `/admin/mis/<company_id>` and we keep it consistent here.
export function useMisPrefill({ companyId, enabled = true }: Args = {}) {
  return useQuery<MISPrefillResponse, ApiError>({
    queryKey: companyId ? [...qk.mis.prefill, { companyId }] : qk.mis.prefill,
    queryFn: () => getMisPrefill(companyId ? { companyId } : undefined),
    staleTime: 60_000,
    enabled,
  });
}
