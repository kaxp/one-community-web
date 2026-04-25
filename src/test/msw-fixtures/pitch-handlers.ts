import { http, HttpResponse, type HttpHandler } from 'msw';
import type { AIEvaluationResult, StartupProfileResponse } from '@/features/pitch/schemas';

// PRD §7.3.1–§7.3.4 fixtures. Job polling is driven by a per-job counter so
// tests can reproduce the "SUCCESS after N polls" path deterministically
// without touching real timers.

const SEED_PROFILE: StartupProfileResponse = {
  startup_id: '3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12',
  user_id: '0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0',
  name: 'Acme Technologies Pvt Ltd',
  tagline: 'AI for compliance',
  sector: 'fintech',
  stage: 'seed',
  deck_url: null,
  website_url: 'https://acme.ai',
  description: 'We help banks automate KYC via agentic LLM workflows.',
  founding_year: 2024,
  team_size: 12,
  revenue_model: 'SaaS subscription',
  traction: '3 pilot banks, ₹2Cr ARR',
  ask_amount_cr: 10,
  notion_page_id: null,
};

const SEED_AI_RESULT: AIEvaluationResult = {
  signal: 'strong',
  summary:
    'Strong founder-market fit. Pilot traction signals product-market-fit in fintech compliance.',
  strengths: ['Experienced founders with prior exits', 'Clear GTM via bank partnerships'],
  concerns: ['Small TAM', 'Compliance regulatory risk'],
  recommended_lp_types: ['india_fintech_seed', 'compliance_focused_vcs'],
};

type ProfileScenario = 'present' | 'missing';
type DeckOutcome = 'success' | 'failure' | 'timeout';

interface JobState {
  pollsLeftBeforeReady: number;
  outcome: DeckOutcome;
  result: AIEvaluationResult;
}

let profileScenario: ProfileScenario = 'present';
let profileFixture: StartupProfileResponse = { ...SEED_PROFILE };
let nextProfileError: { status: number; code: string; message: string } | null = null;
let nextDeckError: { status: number; code: string; message: string } | null = null;
let nextProfileSaveError: { status: number; code: string; message: string } | null = null;

// Default outcome for any new deck submission. Tests override via the helpers.
let nextDeckOutcome: DeckOutcome = 'success';
let pollsBeforeSuccess = 2;
let aiResultFixture: AIEvaluationResult = { ...SEED_AI_RESULT };

// Per-job counters keyed by job_id so the deck-job poll handler is stateful
// across multiple ticks. Reset between tests.
const jobs = new Map<string, JobState>();
let jobCounter = 0;

function nextJobId(): string {
  jobCounter += 1;
  const hex = jobCounter.toString(16).padStart(4, '0').slice(-4);
  // RFC-4122 v4: 8-4-4-4-12 hex. Segment 3 must start with the version
  // nibble (4 here) and segment 4 with variant (8/9/a/b). The counter
  // lives in segment 2 so each fresh job gets a unique-but-valid UUID.
  return `9f1a6b8e-${hex}-4f2a-a5b3-0e7c8d9f1a2b`;
}

export function resetMswPitchState() {
  profileScenario = 'present';
  profileFixture = { ...SEED_PROFILE };
  nextProfileError = null;
  nextProfileSaveError = null;
  nextDeckError = null;
  nextDeckOutcome = 'success';
  pollsBeforeSuccess = 2;
  aiResultFixture = { ...SEED_AI_RESULT };
  jobs.clear();
  jobCounter = 0;
}

resetMswPitchState();

export function setMswProfileScenario(scenario: ProfileScenario) {
  profileScenario = scenario;
}

export function setMswPitchProfileFixture(fixture: StartupProfileResponse) {
  profileFixture = { ...fixture };
}

export function queuePitchProfileError(err: { status: number; code: string; message: string }) {
  nextProfileError = err;
}

export function queuePitchProfileSaveError(err: { status: number; code: string; message: string }) {
  nextProfileSaveError = err;
}

export function queuePitchDeckError(err: { status: number; code: string; message: string }) {
  nextDeckError = err;
}

export function setMswDeckOutcome(outcome: DeckOutcome, options?: { pollsBeforeReady?: number }) {
  nextDeckOutcome = outcome;
  if (options?.pollsBeforeReady !== undefined) {
    pollsBeforeSuccess = options.pollsBeforeReady;
  }
}

export function setMswPitchAIResult(result: AIEvaluationResult) {
  aiResultFixture = { ...result };
}

export const pitchHandlers: HttpHandler[] = [
  // PRD §7.3.2 — GET /pitch/profile (404 = "no profile yet").
  http.get('*/api/v1/pitch/profile', () => {
    if (nextProfileError) {
      const err = nextProfileError;
      nextProfileError = null;
      return HttpResponse.json(
        { data: null, error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    if (profileScenario === 'missing') {
      return HttpResponse.json(
        { data: null, error: { code: 'not_found', message: 'No startup profile found' } },
        { status: 404 },
      );
    }
    return HttpResponse.json({ data: profileFixture, error: null });
  }),

  // PRD §7.3.1 — POST /pitch/profile (create or update).
  http.post('*/api/v1/pitch/profile', async ({ request }) => {
    if (nextProfileSaveError) {
      const err = nextProfileSaveError;
      nextProfileSaveError = null;
      return HttpResponse.json(
        { data: null, error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    const body = (await request.json()) as Partial<StartupProfileResponse>;
    profileFixture = {
      ...profileFixture,
      ...body,
      // Fields not in the request retain their previous value; ensure
      // required keys remain present.
      name: body.name ?? profileFixture.name,
    };
    profileScenario = 'present';
    return HttpResponse.json({ data: profileFixture, error: null });
  }),

  // PRD §7.3.3 — POST /pitch/deck (202 + job_id).
  http.post('*/api/v1/pitch/deck', async ({ request }) => {
    if (nextDeckError) {
      const err = nextDeckError;
      nextDeckError = null;
      return HttpResponse.json(
        { data: null, error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    const body = (await request.json()) as { deck_url?: string };
    const deckUrl = body.deck_url ?? '';
    profileFixture = { ...profileFixture, deck_url: deckUrl };
    const jobId = nextJobId();
    jobs.set(jobId, {
      pollsLeftBeforeReady:
        nextDeckOutcome === 'timeout' ? Number.POSITIVE_INFINITY : pollsBeforeSuccess,
      outcome: nextDeckOutcome,
      result: aiResultFixture,
    });
    return HttpResponse.json(
      {
        data: {
          startup_id: profileFixture.startup_id,
          deck_url: deckUrl,
          job_id: jobId,
          status: 'queued',
        },
        error: null,
      },
      { status: 202 },
    );
  }),

  // PRD §7.3.4 — GET /pitch/deck/jobs/{job_id}. Each call decrements the
  // per-job counter; once it hits zero we report ready=true with the chosen
  // outcome.
  http.get('*/api/v1/pitch/deck/jobs/:jobId', ({ params }) => {
    const id = String(params.jobId);
    const state = jobs.get(id);
    if (!state) {
      return HttpResponse.json(
        { data: null, error: { code: 'not_found', message: 'Job not found' } },
        { status: 404 },
      );
    }
    if (state.pollsLeftBeforeReady > 0) {
      state.pollsLeftBeforeReady -= 1;
      return HttpResponse.json({
        data: {
          job_id: id,
          state: 'STARTED',
          ready: false,
          successful: null,
          result: null,
        },
        error: null,
      });
    }
    // Reached ready.
    if (state.outcome === 'failure') {
      return HttpResponse.json({
        data: {
          job_id: id,
          state: 'FAILURE',
          ready: true,
          successful: false,
          result: null,
        },
        error: null,
      });
    }
    return HttpResponse.json({
      data: {
        job_id: id,
        state: 'SUCCESS',
        ready: true,
        successful: true,
        result: state.result,
      },
      error: null,
    });
  }),
];
