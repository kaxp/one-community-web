import { useQuery } from '@tanstack/react-query';
import { getCardScan } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { CardScanRecord } from '@/features/onboarding/schemas';

// PRD §7.2.2 — `GET /onboarding/card-scan/{scan_id}`. Fetched only when
// `scanId` is present (admin deep-link path: `/add-user?scan_id=...`).
export function useGetCardScan(scanId: string | undefined) {
  return useQuery<CardScanRecord, ApiError>({
    queryKey: scanId ? qk.onboarding.cardScan(scanId) : (['__noop__'] as const),
    queryFn: () => {
      if (!scanId) throw new Error('scanId missing');
      return getCardScan(scanId);
    },
    enabled: !!scanId,
    staleTime: 60_000,
  });
}
