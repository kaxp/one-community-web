import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { postStartupProfile } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { StartupProfileRequest, StartupProfileResponse } from '@/features/pitch/schemas';

// PRD §7.3.1 + §8.12.4 — invalidate `qk.pitch.profile` on success. Also
// clear any stale deck-job poll cache so the AI eval block doesn't show
// outdated results referring to a previous profile snapshot.
export function useUpsertStartupProfile() {
  const qc = useQueryClient();
  return useMutation<StartupProfileResponse, ApiError, StartupProfileRequest>({
    mutationFn: postStartupProfile,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.pitch.profile });
      void qc.invalidateQueries({ queryKey: qk.pitch.deckJobAll });
    },
  });
}
