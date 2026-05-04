import { useQuery } from '@tanstack/react-query';
import { getAdminInboundPitchDetail } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { InboundPitchDetail } from '@/features/admin/schemas';

// Phase 7.2.f — on-demand detail fetch for the drawer.
// `enabled: false` by default — caller enables when the drawer opens.
export function useAdminInboundPitchDetail(startupId: string | null) {
  return useQuery<InboundPitchDetail, ApiError>({
    queryKey: qk.admin.inboundPitchDetail(startupId ?? ''),
    queryFn: () => getAdminInboundPitchDetail(startupId!),
    enabled: !!startupId,
    staleTime: 60_000,
  });
}
