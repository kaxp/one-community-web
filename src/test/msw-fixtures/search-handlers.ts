import { http, HttpResponse, type HttpHandler } from 'msw';
import {
  emptyResultsFixture,
  lpResultsFixture,
  partnerMaskedFixture,
  stage3FallbackFixture,
  startupResultsFixture,
} from './search-fixtures';
import type { SearchResponse } from '@/features/search/schemas';

// Tests pick the fixture by setting `setMswSearchScenario(...)` before rendering.
// `'startup' | 'lp' | 'empty' | 'stage3_fallback' | 'partner_masked' | 'error_500'`.
type SearchScenario =
  | 'startup'
  | 'lp'
  | 'empty'
  | 'stage3_fallback'
  | 'partner_masked'
  | 'error_500'
  | 'rate_limit';

let scenario: SearchScenario = 'startup';
let interactionLogCount = 0;

export function setMswSearchScenario(s: SearchScenario) {
  scenario = s;
}

export function resetMswSearchState() {
  scenario = 'startup';
  interactionLogCount = 0;
}

export function getMswInteractionLogCount() {
  return interactionLogCount;
}

const FIXTURES: Record<Exclude<SearchScenario, 'error_500' | 'rate_limit'>, SearchResponse> = {
  startup: startupResultsFixture,
  lp: lpResultsFixture,
  empty: emptyResultsFixture,
  stage3_fallback: stage3FallbackFixture,
  partner_masked: partnerMaskedFixture,
};

export const searchHandlers: HttpHandler[] = [
  http.post('*/api/v1/search', async ({ request }) => {
    if (scenario === 'error_500') {
      return HttpResponse.json(
        { data: null, error: { code: 'internal_error', message: 'Server error' } },
        { status: 500 },
      );
    }
    if (scenario === 'rate_limit') {
      return HttpResponse.json(
        { data: null, error: { code: 'rate_limit_exceeded', message: 'Too many requests' } },
        { status: 429 },
      );
    }
    const body = (await request.json()) as { query?: unknown };
    if (typeof body.query !== 'string' || body.query.trim().length === 0) {
      return HttpResponse.json(
        {
          data: null,
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            detail: [{ loc: ['body', 'query'], msg: 'required', type: 'value_error' }],
          },
        },
        { status: 422 },
      );
    }
    return HttpResponse.json({ data: FIXTURES[scenario], error: null });
  }),

  http.post('*/api/v1/interactions/log', async () => {
    interactionLogCount += 1;
    return HttpResponse.json({ data: { logged: true, deduped: false }, error: null });
  }),
];
