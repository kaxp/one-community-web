import { http, HttpResponse, type HttpHandler } from 'msw';
import type {
  DigestFrequency,
  MyDigestPreferences,
  MyDigestRow,
} from '@/features/digest/me-schemas';

// PRD §7.13.5–7.13.7 fixtures.
// The list handler paginates the seed in batches of `limit` rows using an
// opaque cursor so infinite-query pagination tests can run end-to-end without
// real timers.

type ErrorEnvelope = { status: number; code: string; message: string; detail?: unknown };

function makeRow(idx: number): MyDigestRow {
  return {
    id: `11111111-1111-1111-1111-${idx.toString(16).padStart(12, '0')}`,
    digest_type: 'lp_weekly',
    subject: `Your Weekly Warmup Update #${idx}`,
    segment: 'lp',
    html_snippet: `Hi there — here is your weekly defence-sector digest #${idx}. Three new opportunities matched your thesis this week.`,
    sent_at: `2026-04-${String(7 + idx).padStart(2, '0')}T07:00:00+00:00`,
  };
}

const SEED_ROWS: MyDigestRow[] = [makeRow(1), makeRow(2), makeRow(3)];

let rows: MyDigestRow[] = SEED_ROWS;
let preferences: MyDigestPreferences = {
  frequency: 'weekly',
  interest_tags: ['defence', 'fintech'],
  opted_in_wa: true,
};

let nextListError: ErrorEnvelope | null = null;
let nextPrefsError: ErrorEnvelope | null = null;
let nextUpdateError: ErrorEnvelope | null = null;
let updateCounter = 0;

export function resetMswDigestMeState() {
  rows = SEED_ROWS.map((r) => ({ ...r }));
  preferences = { frequency: 'weekly', interest_tags: ['defence', 'fintech'], opted_in_wa: true };
  nextListError = null;
  nextPrefsError = null;
  nextUpdateError = null;
  updateCounter = 0;
}

resetMswDigestMeState();

export function setMswDigestMeRows(next: MyDigestRow[]) {
  rows = next.map((r) => ({ ...r }));
}

export function setMswDigestMePreferences(next: MyDigestPreferences) {
  preferences = { ...next };
}

export function getMswDigestMeUpdateCount() {
  return updateCounter;
}

export function getMswDigestMePreferences(): MyDigestPreferences {
  return { ...preferences };
}

export function queueDigestMeListError(err: ErrorEnvelope) {
  nextListError = err;
}

export function queueDigestMePrefsError(err: ErrorEnvelope) {
  nextPrefsError = err;
}

export function queueDigestMeUpdateError(err: ErrorEnvelope) {
  nextUpdateError = err;
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

export const digestMeHandlers: HttpHandler[] = [
  // §7.13.5 — recent digests (cursor-paginated). Cursor is the row index as a
  // string — opaque to the client; the real backend uses sent_at.
  http.get('*/api/v1/me/digest/recent', ({ request }) => {
    if (nextListError) {
      const err = nextListError;
      nextListError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const url = new URL(request.url);
    const limit = Math.max(
      1,
      Math.min(100, Number.parseInt(url.searchParams.get('limit') ?? '20', 10) || 20),
    );
    const cursor = url.searchParams.get('cursor');
    const startIdx = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
    const slice = rows.slice(startIdx, startIdx + limit);
    const next_cursor = startIdx + limit < rows.length ? String(startIdx + limit) : null;
    return HttpResponse.json({ data: { items: slice, next_cursor }, error: null });
  }),

  // §7.13.6 — preferences GET.
  http.get('*/api/v1/me/digest/preferences', () => {
    if (nextPrefsError) {
      const err = nextPrefsError;
      nextPrefsError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    return HttpResponse.json({ data: { ...preferences }, error: null });
  }),

  // §7.13.7 — preferences PUT.
  http.put('*/api/v1/me/digest/preferences', async ({ request }) => {
    if (nextUpdateError) {
      const err = nextUpdateError;
      nextUpdateError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const body = (await request.json()) as {
      frequency?: DigestFrequency;
      interest_tags?: string[];
      opted_in_wa?: boolean;
      [extra: string]: unknown;
    };
    const ALLOWED = new Set(['frequency', 'interest_tags', 'opted_in_wa']);
    const extras = Object.keys(body).filter((k) => !ALLOWED.has(k));
    if (extras.length > 0) {
      return HttpResponse.json(
        errorBody({
          status: 422,
          code: 'validation_error',
          message: 'Validation failed',
          detail: extras.map((k) => ({
            loc: ['body', k],
            msg: 'Extra inputs are not permitted',
            type: 'extra_forbidden',
          })),
        }),
        { status: 422 },
      );
    }
    if (body.frequency !== undefined && !['weekly', 'monthly', 'paused'].includes(body.frequency)) {
      return HttpResponse.json(
        errorBody({
          status: 422,
          code: 'validation_error',
          message: 'Validation failed',
          detail: [
            {
              loc: ['body', 'frequency'],
              msg: "Input should be 'weekly', 'monthly' or 'paused'",
              type: 'literal_error',
            },
          ],
        }),
        { status: 422 },
      );
    }
    if (body.frequency !== undefined) preferences.frequency = body.frequency;
    if (body.interest_tags !== undefined) {
      preferences.interest_tags = [
        ...new Set(body.interest_tags.map((t) => t.trim().toLowerCase())),
      ].sort();
    }
    if (body.opted_in_wa !== undefined) preferences.opted_in_wa = body.opted_in_wa;
    updateCounter += 1;
    return HttpResponse.json({ data: { ...preferences }, error: null });
  }),
];
