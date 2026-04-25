import { useCallback } from 'react';
import { logInteraction } from '@/api/endpoints';
import type { InteractionLogRequest } from '@/features/interactions/schemas';
import { interactionDedupKey, shouldFireInteraction } from '@/lib/interaction-dedup';

// Client-side dedup per CLAUDE.md §5.6 — 10s window per (target_id, interaction_type)
// to keep us well under the per-minute rate limit even on aggressive re-renders.
// Server-side dedup is 60s (PRD §7.7.1). The dedup state is module-scoped (see
// `@/lib/interaction-dedup`) so a page mount/unmount/remount within 10s does
// NOT re-fire — the previous useRef-scoped cache only deduped within a single
// hook instance.

export function useLogInteraction() {
  const fire = useCallback((body: InteractionLogRequest) => {
    const key = interactionDedupKey(body.interaction_type, body.target_id);
    if (!shouldFireInteraction(key)) return;
    // Fire-and-forget. Never await; never throw to caller (PRD §7.7.1 UI flow #5).
    logInteraction(body).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('interaction log failed', err);
    });
  }, []);

  return fire;
}
