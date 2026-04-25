import { useMutation } from '@tanstack/react-query';
import { submitFeedback } from '@/api/endpoints';
import type { ApiError } from '@/api/errors';
import type { FeedbackBody, FeedbackResponse } from '@/features/connections/schemas';

// PRD §7.7.2 — `POST /interactions/feedback`. 48h post-accept Yes/No prompt
// surfaced on `/connections` rows. On 200 the prompt collapses; on 409 the
// prompt is already-submitted and we silently hide.
export function useFeedback() {
  return useMutation<FeedbackResponse, ApiError, FeedbackBody>({
    mutationFn: (body) => submitFeedback(body),
  });
}
