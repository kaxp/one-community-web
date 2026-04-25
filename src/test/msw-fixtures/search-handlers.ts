import { http, HttpResponse, type HttpHandler } from 'msw';
import {
  emptyResultsFixture,
  lpResultsFixture,
  partnerMaskedFixture,
  stage3FallbackFixture,
  startupResultsFixture,
  STARTUP_CATALOGUE,
  LP_CATALOGUE,
} from './search-fixtures';
import { seedProfileFor } from './seed-users';
import type { LPResultItem, SearchResponse, StartupResultItem } from '@/features/search/schemas';

// Scenarios:
//   'auto'              — DEFAULT. Filter the catalogue by request.query + filters.
//                         Pick target_type from the signed-in user's role.
//   'startup' / 'lp'    — Force the legacy hardcoded fixture (test back-compat).
//   'empty'             — Force empty results.
//   'stage3_fallback'   — Force a stage3_applied=false fixture.
//   'partner_masked'    — Force a Partner-masked fixture.
//   'error_500' / 'rate_limit' — Force the corresponding error envelope.
type SearchScenario =
  | 'auto'
  | 'startup'
  | 'lp'
  | 'empty'
  | 'stage3_fallback'
  | 'partner_masked'
  | 'error_500'
  | 'rate_limit';

let scenario: SearchScenario = 'auto';
let interactionLogCount = 0;

export function setMswSearchScenario(s: SearchScenario) {
  scenario = s;
}

export function resetMswSearchState() {
  scenario = 'auto';
  interactionLogCount = 0;
}

export function getMswInteractionLogCount() {
  return interactionLogCount;
}

const FORCED: Record<
  Exclude<SearchScenario, 'auto' | 'error_500' | 'rate_limit'>,
  SearchResponse
> = {
  startup: startupResultsFixture,
  lp: lpResultsFixture,
  empty: emptyResultsFixture,
  stage3_fallback: stage3FallbackFixture,
  partner_masked: partnerMaskedFixture,
};

interface SearchBody {
  query?: string;
  filters?: { sector?: string[]; stage?: string[]; geography?: string[] };
  limit?: number;
  cursor?: string | null;
}

function deriveTargetType(request: Request): 'startup' | 'lp' {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return 'startup';
  const token = auth.slice('Bearer '.length).trim();
  // The MSW JWT is `msw-jwt.<base64url(phone)>`.
  if (!token.startsWith('msw-jwt.')) return 'startup';
  try {
    const encoded = token.slice('msw-jwt.'.length);
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const phone =
      typeof window !== 'undefined' && typeof window.atob === 'function'
        ? window.atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
        : Buffer.from(padded, 'base64').toString('utf8');
    const profile = seedProfileFor(phone);
    if (!profile) return 'startup';
    // Startups search for LPs; everyone else searches for startups.
    if (
      profile.role === 'startup_funded' ||
      profile.role === 'startup_inprogress' ||
      profile.role === 'startup_onboarded'
    ) {
      return 'lp';
    }
    return 'startup';
  } catch {
    return 'startup';
  }
}

function startupHaystack(item: StartupResultItem): string {
  return [
    item.name,
    item.organisation,
    item.company_name,
    item.sector,
    item.stage,
    item.one_liner,
    item.description,
    item.traction,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function lpHaystack(item: LPResultItem): string {
  return [
    item.name,
    item.organisation,
    item.designation,
    item.fund_name,
    ...(item.sectors ?? []),
    ...(item.stages ?? []),
    ...(item.geography ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function matchesQuery(haystack: string, query: string): boolean {
  if (!query) return true;
  // Match if EVERY whitespace-separated token in the query appears somewhere
  // in the haystack — close enough for a dev mock; production runs semantic search.
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return tokens.every((t) => haystack.includes(t));
}

function matchesStartupFilters(
  item: StartupResultItem,
  filters: { sector?: string[]; stage?: string[]; geography?: string[] } | undefined,
): boolean {
  if (!filters) return true;
  if (filters.sector?.length && (!item.sector || !filters.sector.includes(item.sector))) {
    return false;
  }
  if (filters.stage?.length && (!item.stage || !filters.stage.includes(item.stage))) {
    return false;
  }
  // Catalogue startups don't carry geography; ignore that filter for startups.
  return true;
}

function matchesLPFilters(
  item: LPResultItem,
  filters: { sector?: string[]; stage?: string[]; geography?: string[] } | undefined,
): boolean {
  if (!filters) return true;
  if (filters.sector?.length) {
    const sectors = item.sectors ?? [];
    if (!filters.sector.some((s) => sectors.includes(s))) return false;
  }
  if (filters.stage?.length) {
    const stages = item.stages ?? [];
    if (!filters.stage.some((s) => stages.includes(s))) return false;
  }
  if (filters.geography?.length) {
    const geos = item.geography ?? [];
    if (!filters.geography.some((g) => geos.includes(g))) return false;
  }
  return true;
}

function autoSearch(request: Request, body: SearchBody): SearchResponse {
  const target = deriveTargetType(request);
  const q = body.query?.trim() ?? '';
  if (target === 'lp') {
    const matches = LP_CATALOGUE.filter(
      (item) => matchesQuery(lpHaystack(item), q) && matchesLPFilters(item, body.filters),
    );
    return {
      results: matches,
      total: matches.length,
      target_type: 'lp',
      stage3_applied: true,
      rerank_cap: 20,
      next_cursor: null,
    };
  }
  const matches = STARTUP_CATALOGUE.filter(
    (item) => matchesQuery(startupHaystack(item), q) && matchesStartupFilters(item, body.filters),
  );
  return {
    results: matches,
    total: matches.length,
    target_type: 'startup',
    stage3_applied: true,
    rerank_cap: 20,
    next_cursor: null,
  };
}

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
    const body = (await request.json()) as SearchBody;
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
    if (scenario === 'auto') {
      return HttpResponse.json({ data: autoSearch(request, body), error: null });
    }
    return HttpResponse.json({ data: FORCED[scenario], error: null });
  }),

  http.post('*/api/v1/interactions/log', async () => {
    interactionLogCount += 1;
    return HttpResponse.json({ data: { logged: true, deduped: false }, error: null });
  }),
];
