import { http, HttpResponse, type HttpHandler } from 'msw';
import type { MatchSuggestion } from '@/features/matchmaking/schemas';

// PRD §7.8 fixtures. Stateful — POST removes the responded suggestion from
// the in-memory list, and a second response on the same row surfaces 409
// deterministically.

type ErrorEnvelope = { status: number; code: string; message: string; detail?: unknown };

const LP_USER_ID = '00000000-0000-4000-8000-000000000004';
const STARTUP_USER_ID = '00000000-0000-4000-8000-000000000006';

const SEED_SUGGESTIONS: MatchSuggestion[] = [
  {
    id: 'c1d2e3f4-5a6b-4c8d-9e0f-1a2b3c4d5e6f',
    lp_id: LP_USER_ID,
    startup_id: '3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12',
    score: 0.91,
    reason: 'Sector + stage + ticket match',
    status: 'approved',
    week_of: '2026-04-28',
    company_name: 'Acme Technologies',
    sector: 'fintech',
    one_liner: 'AI for compliance',
  },
  {
    id: 'c1d2e3f4-5a6b-4c8d-9e0f-1a2b3c4d5e70',
    lp_id: LP_USER_ID,
    startup_id: '3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a13',
    score: 0.72,
    reason: 'Strong sector overlap, slightly off-stage',
    status: 'approved',
    week_of: '2026-04-28',
    company_name: 'Boltline Robotics',
    sector: 'industrial',
    one_liner: 'Warehouse automation for tier-2 logistics',
  },
  {
    id: 'c1d2e3f4-5a6b-4c8d-9e0f-1a2b3c4d5e71',
    lp_id: LP_USER_ID,
    startup_id: '3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a14',
    score: 0.55,
    reason: 'Geography match only',
    status: 'approved',
    week_of: '2026-04-28',
    company_name: 'Cresta Health',
    sector: 'healthcare',
    one_liner: 'Outpatient triage workflows',
  },
];

let suggestionsFixture: MatchSuggestion[] = [];
let connectionAlwaysCreatesPair = true;
// Tracks which suggestions have already received a response so we can
// surface 409 conflict on a repeat respond call deterministically.
let respondedIds: Set<string> = new Set();
let nextListError: ErrorEnvelope | null = null;
let nextRespondError: ErrorEnvelope | null = null;
let respondCounter = 0;

export function resetMswMatchmakingState() {
  suggestionsFixture = SEED_SUGGESTIONS.map((s) => ({ ...s }));
  connectionAlwaysCreatesPair = true;
  respondedIds = new Set();
  nextListError = null;
  nextRespondError = null;
  respondCounter = 0;
}

resetMswMatchmakingState();

export function setMswMatchmakingFixture(next: MatchSuggestion[]) {
  suggestionsFixture = next.map((s) => ({ ...s }));
}

export function setMswConnectionAlwaysCreates(value: boolean) {
  connectionAlwaysCreatesPair = value;
}

export function getMswMatchmakingSuggestions() {
  return suggestionsFixture.slice();
}

export function getMswMatchmakingResponded(): readonly string[] {
  return Array.from(respondedIds);
}

export function queueMatchmakingListError(err: ErrorEnvelope) {
  nextListError = err;
}

export function queueMatchmakingRespondError(err: ErrorEnvelope) {
  nextRespondError = err;
}

function errorBody(err: ErrorEnvelope) {
  return {
    data: null,
    error: {
      code: err.code,
      message: err.message,
      ...(err.detail !== undefined ? { detail: err.detail } : {}),
    },
  };
}

export const matchmakingHandlers: HttpHandler[] = [
  // PRD §7.8.5 — user-facing list. Returns `data: MatchSuggestion[]`.
  http.get('*/api/v1/matchmaking/suggestions', () => {
    if (nextListError) {
      const err = nextListError;
      nextListError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    return HttpResponse.json({ data: suggestionsFixture.slice(), error: null });
  }),

  // PRD §7.8.6 — respond. Removes the suggestion from the list on first
  // response; returns 409 on repeat. `connection_created` is `true` when
  // `action=accepted` AND the global flag is on (mutual auto-accept simulation).
  http.post('*/api/v1/matchmaking/suggestions/:id/respond', async ({ params, request }) => {
    if (nextRespondError) {
      const err = nextRespondError;
      nextRespondError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const id = String(params.id);
    if (respondedIds.has(id)) {
      return HttpResponse.json(
        errorBody({
          status: 409,
          code: 'conflict',
          message: 'Suggestion already responded to',
          detail: { previous_action: 'rejected' },
        }),
        { status: 409 },
      );
    }
    const body = (await request.json()) as { action?: 'accepted' | 'rejected' | 'skipped' };
    const action = body.action ?? 'skipped';
    if (!suggestionsFixture.some((s) => s.id === id)) {
      return HttpResponse.json(
        errorBody({ status: 404, code: 'not_found', message: 'Suggestion not found' }),
        { status: 404 },
      );
    }
    suggestionsFixture = suggestionsFixture.filter((s) => s.id !== id);
    respondedIds.add(id);
    respondCounter += 1;
    const connection_created = action === 'accepted' && connectionAlwaysCreatesPair;
    const connection_id = connection_created
      ? `f0e1d2c3-b4a5-4687-9f00-1a2b3c4d5e${respondCounter
          .toString(16)
          .padStart(2, '0')
          .slice(-2)}`
      : null;
    return HttpResponse.json({
      data: {
        suggestion_id: id,
        action,
        connection_created,
        connection_id,
      },
      error: null,
    });
  }),
];

// Re-export the LP / startup test ids so other tests can sign in as the
// caller whose perspective drives counterpart-side rendering.
export { LP_USER_ID as MSW_LP_USER_ID, STARTUP_USER_ID as MSW_STARTUP_USER_ID };
