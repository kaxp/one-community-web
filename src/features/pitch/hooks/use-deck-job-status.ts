import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { getDeckJob } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { DeckJobStatus } from '@/features/pitch/schemas';

// PRD §7.3.4 — standalone hook (used in tests; the route consumes the same
// `getDeckJob` via ExecutionPanel `jobPoll.queryFn`). Polling cadence is
// owned by the panel; this hook is one-shot.
export function useDeckJobStatus(jobId: string | null) {
  return useQuery<DeckJobStatus, ApiError>({
    queryKey: jobId ? qk.pitch.deckJob(jobId) : ['pitch', 'deckJob', 'idle'],
    queryFn: () => {
      if (!jobId) throw new Error('jobId is required');
      return getDeckJob(jobId);
    },
    enabled: !!jobId,
    staleTime: 0,
  });
}
