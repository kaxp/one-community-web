// Module-level dedup cache for `POST /interactions/log` calls.
// PRD §7.7.1 dedupes server-side over a 60s window per (actor, target, type).
// We dedupe client-side over a tighter 10s window so re-mounts and re-renders
// (Profile page mount → unmount → remount) don't burn the per-minute rate
// limit. Module-scoped so two distinct hook instances share state.

const DEFAULT_WINDOW_MS = 10_000;

const lastFiredByKey = new Map<string, number>();

export function interactionDedupKey(type: string, targetId: string): string {
  return `${type}:${targetId}`;
}

export function shouldFireInteraction(
  key: string,
  windowMs: number = DEFAULT_WINDOW_MS,
  now: number = Date.now(),
): boolean {
  const last = lastFiredByKey.get(key);
  if (last !== undefined && now - last < windowMs) return false;
  lastFiredByKey.set(key, now);
  return true;
}

export function resetInteractionDedup(): void {
  lastFiredByKey.clear();
}
