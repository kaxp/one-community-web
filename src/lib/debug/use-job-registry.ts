// PRD §6.8 — every `202 + job_id` response MUST register here. Stored in
// `localStorage['oc.debug.jobs']` (capped at 100, FIFO). The Jobs tab on
// the debug dock reads from this list.
//
// Lives in `src/lib/debug/` so production builds can tree-shake the dock
// import; the registry itself is cheap and stays in any bundle that wires
// up `<ExecutionPanel jobPoll>`.

const STORAGE_KEY = 'oc.debug.jobs';
const MAX_ENTRIES = 100;

export interface DebugJobEntry {
  job_id: string;
  task_name: string;
  submitted_at: string;
  submitted_by: string | null;
}

function isStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

export function readJobRegistry(): DebugJobEntry[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is DebugJobEntry => {
      if (!row || typeof row !== 'object') return false;
      const r = row as Record<string, unknown>;
      return typeof r.job_id === 'string' && typeof r.task_name === 'string';
    });
  } catch {
    return [];
  }
}

export function registerJob(entry: Omit<DebugJobEntry, 'submitted_at'>) {
  if (!isStorageAvailable()) return;
  const list = readJobRegistry();
  const next: DebugJobEntry = { ...entry, submitted_at: new Date().toISOString() };
  // FIFO cap: keep the most recent MAX_ENTRIES.
  const updated = [next, ...list].slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage quota — silently drop (dev-only telemetry).
  }
}
