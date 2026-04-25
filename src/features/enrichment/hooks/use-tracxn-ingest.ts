import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postTracxnIngest } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { TracxnRequest, TracxnResponse } from '@/features/enrichment/schemas';

// PRD §7.15.1 + §8.12.4 — Tracxn ingest. On created/merged, invalidate any
// search caches (the new/updated startup may now appear in semantic search
// results) plus the admin summary's startup count widget.
export function useTracxnIngest() {
  const qc = useQueryClient();
  return useMutation<TracxnResponse, ApiError, TracxnRequest>({
    mutationFn: (body) => postTracxnIngest(body),
    onSuccess: (data) => {
      if (data.action === 'duplicate_skipped') return;
      // Invalidate every search query variant by matching the [`search`,…] prefix.
      void qc.invalidateQueries({ queryKey: ['search'] });
      void qc.invalidateQueries({ queryKey: qk.admin.summary });
    },
  });
}
