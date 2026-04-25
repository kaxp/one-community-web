import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { postDeck } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { DeckUploadAck, DeckUploadRequest } from '@/features/pitch/schemas';

// PRD §7.3.3 — POST returns 202 + job_id. The component polls via
// ExecutionPanel `jobPoll`. We invalidate `qk.pitch.profile` so deck_url
// flips from null to the submitted URL once the panel refetches.
export function useSubmitDeck() {
  const qc = useQueryClient();
  return useMutation<DeckUploadAck, ApiError, DeckUploadRequest>({
    mutationFn: postDeck,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.pitch.profile });
    },
  });
}
