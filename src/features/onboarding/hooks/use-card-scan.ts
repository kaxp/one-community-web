import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postCardScan } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { CardScanRequest, CardScanResponse } from '@/features/onboarding/schemas';

// PRD §7.2.1 — `POST /onboarding/card-scan`. The hook is intentionally
// thin: the page wraps it twice (once for the OCR-text parse, once for the
// final create-or-update with `parsed` + `category`). Cache invalidation
// targets the per-scan GET key so a freshly created scan can be re-fetched
// via §7.2.2 without a stale read.
export function useCardScan() {
  const qc = useQueryClient();
  return useMutation<CardScanResponse, ApiError, CardScanRequest>({
    mutationFn: (body) => postCardScan(body),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: qk.onboarding.cardScan(data.scan_id) });
    },
  });
}
