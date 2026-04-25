import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postDigestGenerate } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { DigestGenerateRequest, DigestGenerateResponse } from '@/features/digest/schemas';

// PRD §7.13.1 — generate AI drafts for a segment. Bumps the pending list.
export function useDigestGenerate() {
  const qc = useQueryClient();
  return useMutation<DigestGenerateResponse, ApiError, DigestGenerateRequest>({
    mutationFn: (body) => postDigestGenerate(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.digest.pending });
    },
  });
}
