import { useMutation } from '@tanstack/react-query';
import { postMatchGenerate } from '@/api/endpoints';
import type { ApiError } from '@/api/errors';
import type { MatchGenerateAck, MatchGenerateRequest } from '@/features/matchmaking/schemas';

// PRD §7.8.1 — `POST /matchmaking/generate`. Returns 202 + job_id; the
// page wires this through <ExecutionPanel jobPoll>. Polling-side
// invalidation of `qk.matchmaking.pending` happens after SUCCESS via the
// page's onJobAccepted/onSuccess hooks.
export function useMatchGenerate() {
  return useMutation<MatchGenerateAck, ApiError, MatchGenerateRequest>({
    mutationFn: (body) => postMatchGenerate(body),
  });
}
