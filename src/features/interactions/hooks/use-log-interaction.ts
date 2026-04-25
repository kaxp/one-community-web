import { useCallback, useRef } from 'react';
import { logInteraction } from '@/api/endpoints';
import type { InteractionLogRequest } from '@/features/interactions/schemas';

// Client-side dedup per CLAUDE.md §5.6 — 10s window per (target_id, interaction_type)
// to keep us well under the per-minute rate limit even on aggressive re-renders.
// Server-side dedup is 60s (PRD §7.7.1).
const DEDUP_WINDOW_MS = 10_000;

export function useLogInteraction() {
  const lastFiredRef = useRef<Map<string, number>>(new Map());

  const fire = useCallback((body: InteractionLogRequest) => {
    const now = Date.now();
    const key = `${body.interaction_type}:${body.target_id}`;
    const last = lastFiredRef.current.get(key);
    if (last !== undefined && now - last < DEDUP_WINDOW_MS) return;
    lastFiredRef.current.set(key, now);
    // Fire-and-forget. Never await; never throw to caller (PRD §7.7.1 UI flow #5).
    logInteraction(body).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('interaction log failed', err);
    });
  }, []);

  return fire;
}
