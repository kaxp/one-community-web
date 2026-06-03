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

function deriveSeedProfile(request: Request) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice('Bearer '.length).trim();
  // The MSW JWT is `msw-jwt.<base64url(phone)>`.
  if (!token.startsWith('msw-jwt.')) return null;
  try {
    const encoded = token.slice('msw-jwt.'.length);
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const phone =
      typeof window !== 'undefined' && typeof window.atob === 'function'
        ? window.atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
        : Buffer.from(padded, 'base64').toString('utf8');
    return seedProfileFor(phone);
  } catch {
    return null;
  }
}

function deriveTargetType(request: Request): 'startup' | 'lp' {
  const profile = deriveSeedProfile(request);
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
}

// Partner-masked allowlists per decisions.md [P-20]. Backend strips fields via
// `_STARTUP_VISIBLE_FIELDS["partner"]` / `_LP_VISIBLE_FIELDS["partner"]`. The
// MSW mock replicates that contract so dev/test behaviour matches prod.
const PARTNER_STARTUP_ALLOWED = new Set<keyof StartupResultItem>([
  'user_id',
  'name',
  'company_name',
  'sector',
  'stage',
  'one_liner',
]);
const PARTNER_LP_ALLOWED = new Set<keyof LPResultItem>(['user_id', 'name', 'fund_name', 'sectors']);

function maskStartupForPartner(item: StartupResultItem): StartupResultItem {
  const out: Partial<StartupResultItem> = {};
  for (const key of Object.keys(item) as (keyof StartupResultItem)[]) {
    if (PARTNER_STARTUP_ALLOWED.has(key)) {
      (out as Record<string, unknown>)[key] = item[key];
    }
  }
  return out as StartupResultItem;
}

function maskLPForPartner(item: LPResultItem): LPResultItem {
  const out: Partial<LPResultItem> = {};
  for (const key of Object.keys(item) as (keyof LPResultItem)[]) {
    if (PARTNER_LP_ALLOWED.has(key)) {
      (out as Record<string, unknown>)[key] = item[key];
    }
  }
  return out as LPResultItem;
}

function startupHaystack(item: StartupResultItem): string {
  // user_id is included so the §13 G1 interim profile composer can locate a
  // catalogue entry by passing the UUID as the search query.
  return [
    item.user_id,
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
    item.user_id,
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
  const profile = deriveSeedProfile(request);
  const isPartner = profile?.role === 'partner';
  const target = deriveTargetType(request);
  const q = body.query?.trim() ?? '';
  if (target === 'lp') {
    const matches = LP_CATALOGUE.filter(
      (item) => matchesQuery(lpHaystack(item), q) && matchesLPFilters(item, body.filters),
    );
    return {
      results: isPartner ? matches.map(maskLPForPartner) : matches,
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
    results: isPartner ? matches.map(maskStartupForPartner) : matches,
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

  // Phase 2: conversational search endpoint. Wraps the same scenarios as
  // /search but in the ConversationResponse envelope. A stable conversation_id
  // is reused per-test-run so multi-turn tests can verify state continuity.
  http.post('*/api/v1/search/conversation', async ({ request }) => {
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
    const body = (await request.json()) as {
      conversation_id?: string | null;
      message: string;
      target_type?: string | null;
      limit?: number;
    };
    if (typeof body.message !== 'string' || body.message.trim().length === 0) {
      return HttpResponse.json(
        {
          data: null,
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            detail: [{ loc: ['body', 'message'], msg: 'required', type: 'value_error' }],
          },
        },
        { status: 422 },
      );
    }
    // Reuse the /search auto logic to filter the catalogue. autoSearch
    // derives target_type from the request headers (signed-in role), not the
    // body, so we only need to forward the query text here.
    const searchBody: SearchBody = { query: body.message };
    const inner = scenario === 'auto' ? autoSearch(request, searchBody) : FORCED[scenario];
    const conversationId = body.conversation_id ?? 'conv-msw-fixed-id';
    return HttpResponse.json({
      data: {
        conversation_id: conversationId,
        turn: 1,
        action: 'search',
        resolved_query: body.message,
        clarification: null,
        results: inner.results,
        total: inner.total,
        target_type: inner.target_type,
        intent: inner.intent ?? null,
        text: inner.text ?? null,
        answer: inner.answer ?? null,
        stage3_applied: inner.stage3_applied,
        // v5 prose fields — present in v5 mode; optional so v4 tests still pass
        // v5 prose: only supplied for the 'startup' scenario (the canonical
        // v5 success path). All other scenarios (auto, lp, stage3_fallback,
        // partner_masked, empty) remain on the v4 card-grid path so those
        // tests continue to validate masking, locked footers, and fallbacks.
        answer_markdown: (() => {
          if (scenario !== 'startup') return null;
          const first = inner.results[0];
          if (!first) return null;
          const displayName =
            ('company_name' in first ? first.company_name : first.name) ?? 'Startup';
          return `Here are some relevant startups:\n\n- [**${displayName}**](/search/profile/${first.user_id}): A relevant match for your query.`;
        })(),
        sources: (() => {
          if (scenario !== 'startup') return [];
          const first = inner.results[0];
          if (!first) return [];
          const displayName =
            ('company_name' in first ? first.company_name : first.name) ?? 'Startup';
          return [{ startup_id: first.user_id, company_name: displayName }];
        })(),
        cached: false,
        confidence: 0.75,
        session_id: conversationId,
      },
      error: null,
    });
  }),

  // v5: pre-load conversation for WA → web continuity (?c=<id>)
  http.get('*/api/v1/search/conversation/:id', ({ params: routeParams }) => {
    return HttpResponse.json({
      data: {
        conversation_id: routeParams.id,
        turns: [
          {
            turn: 1,
            user_message: 'WhatsApp query pre-loaded',
            answer_markdown:
              'Here is a startup from WhatsApp:\n\n- [**Acme**](/search/profile/mock-wa-id): Relevant for your needs.',
            sources: [{ startup_id: 'mock-wa-id', company_name: 'Acme' }],
            intent: 'list_query',
            ts: new Date().toISOString(),
          },
        ],
      },
      error: null,
    });
  }),

  http.post('*/api/v1/interactions/log', async () => {
    interactionLogCount += 1;
    return HttpResponse.json({ data: { logged: true, deduped: false }, error: null });
  }),
];
