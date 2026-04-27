import { http, HttpResponse, type HttpHandler } from 'msw';
import type { MatchJobStatus, MatchPendingResponse } from '@/features/matchmaking/schemas';

// PRD §7.8.1 / §7.8.2 / §7.8.3 / §7.8.4 fixtures (admin-side ops). The
// generation handler returns 202 immediately with a job_id; subsequent
// `/matchmaking/jobs/{id}` polls flip from PENDING → SUCCESS deterministically
// after `pollsBeforeReady` reads (default 1) so jest tests can drive the
// polling loop without real timers.

type ErrorEnvelope = { status: number; code: string; message: string; detail?: unknown };

const SEED_PENDING: MatchPendingResponse = [
  {
    id: 'c1d2e3f4-5a6b-4c8d-9e0f-1a2b3c4d5e6f',
    lp_id: '00000000-0000-4000-8000-000000000004',
    startup_id: '3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12',
    score: 0.91,
    reason: 'Sector + stage + ticket match',
    status: 'pending',
    week_of: '2026-04-28',
    company_name: 'Acme Technologies',
    sector: 'fintech',
    one_liner: 'AI for compliance',
  },
  {
    id: 'c1d2e3f4-5a6b-4c8d-9e0f-1a2b3c4d5e70',
    lp_id: '00000000-0000-4000-8000-000000000004',
    startup_id: '3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a13',
    score: 0.72,
    reason: 'Strong sector overlap',
    status: 'pending',
    week_of: '2026-04-28',
    company_name: 'Boltline Robotics',
    sector: 'industrial',
    one_liner: 'Warehouse automation for tier-2 logistics',
  },
];

interface JobState {
  job_id: string;
  state: MatchJobStatus['state'];
  ready: boolean;
  successful: boolean | null;
  result: MatchJobStatus['result'];
  reads: number;
  pollsBeforeReady: number;
  week_of: string;
}

let pending: MatchPendingResponse = SEED_PENDING.map((p) => ({ ...p }));
const jobs: Map<string, JobState> = new Map();
let jobCounter = 0;
let pollsBeforeReady = 1;
let nextGenerateError: ErrorEnvelope | null = null;
let nextJobError: ErrorEnvelope | null = null;
let nextApproveError: ErrorEnvelope | null = null;
let nextPendingError: ErrorEnvelope | null = null;
let approveCounter = 0;

export function resetMswMatchmakingOpsState() {
  pending = SEED_PENDING.map((p) => ({ ...p }));
  jobs.clear();
  jobCounter = 0;
  pollsBeforeReady = 1;
  nextGenerateError = null;
  nextJobError = null;
  nextApproveError = null;
  nextPendingError = null;
  approveCounter = 0;
}

resetMswMatchmakingOpsState();

export function setMswMatchmakingPending(next: MatchPendingResponse) {
  pending = next.map((p) => ({ ...p }));
}

export function setMswMatchmakingPollsBeforeReady(value: number) {
  pollsBeforeReady = value;
}

export function getMswMatchmakingApproveCount() {
  return approveCounter;
}

export function queueMatchmakingGenerateError(err: ErrorEnvelope) {
  nextGenerateError = err;
}

export function queueMatchmakingJobError(err: ErrorEnvelope) {
  nextJobError = err;
}

export function queueMatchmakingOpsApproveError(err: ErrorEnvelope) {
  nextApproveError = err;
}

export function queueMatchmakingOpsPendingError(err: ErrorEnvelope) {
  nextPendingError = err;
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

export const adminMatchmakingOpsHandlers: HttpHandler[] = [
  // PRD §7.8.1 — 202 + job_id
  http.post('*/api/v1/matchmaking/generate', async ({ request }) => {
    if (nextGenerateError) {
      const err = nextGenerateError;
      nextGenerateError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const body = (await request.json()) as { week_of?: string };
    if (!body.week_of) {
      return HttpResponse.json(
        errorBody({
          status: 422,
          code: 'validation_error',
          message: 'week_of required',
        }),
        { status: 422 },
      );
    }
    jobCounter += 1;
    // 8-4-4-4-12 UUID-v4 layout — second segment is 4 hex chars per spec.
    // Was 8 hex chars, which Zod's `.uuid()` rejected (issues.md [I-10] surfaced
    // this as a side-effect when use-match-generate gained its own unit test).
    const job_id = `b4c5d6e7-${jobCounter.toString(16).padStart(4, '0')}-4a2b-9c4d-5e6f7a8b9c0d`;
    jobs.set(job_id, {
      job_id,
      state: 'PENDING',
      ready: false,
      successful: null,
      result: null,
      reads: 0,
      pollsBeforeReady,
      week_of: body.week_of,
    });
    return HttpResponse.json(
      {
        data: { job_id, status: 'queued' as const, week_of: body.week_of },
        error: null,
      },
      { status: 202 },
    );
  }),

  // PRD §7.8.2 — Celery job poll. Flips to SUCCESS after `pollsBeforeReady` reads.
  http.get('*/api/v1/matchmaking/jobs/:id', ({ params }) => {
    if (nextJobError) {
      const err = nextJobError;
      nextJobError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const id = String(params.id);
    const job = jobs.get(id);
    if (!job) {
      return HttpResponse.json(
        errorBody({ status: 404, code: 'not_found', message: 'Job not found' }),
        { status: 404 },
      );
    }
    job.reads += 1;
    if (job.reads >= job.pollsBeforeReady) {
      job.state = 'SUCCESS';
      job.ready = true;
      job.successful = true;
      job.result = { generated_count: 47, week_of: job.week_of };
    }
    return HttpResponse.json({
      data: {
        job_id: job.job_id,
        state: job.state,
        ready: job.ready,
        successful: job.successful,
        result: job.result,
      },
      error: null,
    });
  }),

  // PRD §7.8.3 — admin approve.
  http.post('*/api/v1/matchmaking/approve', async ({ request }) => {
    if (nextApproveError) {
      const err = nextApproveError;
      nextApproveError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const body = (await request.json()) as { suggestion_id?: string };
    const id = body.suggestion_id;
    if (!id) {
      return HttpResponse.json(
        errorBody({ status: 422, code: 'validation_error', message: 'suggestion_id required' }),
        { status: 422 },
      );
    }
    const idx = pending.findIndex((p) => p.id === id);
    if (idx === -1) {
      return HttpResponse.json(
        errorBody({ status: 404, code: 'not_found', message: 'Suggestion not found' }),
        { status: 404 },
      );
    }
    pending = pending.filter((p) => p.id !== id);
    approveCounter += 1;
    return HttpResponse.json({
      data: {
        suggestion_id: id,
        status: 'approved' as const,
        approved_at: '2026-04-26T10:00:00Z',
      },
      error: null,
    });
  }),

  // PRD §7.8.4 — admin pending list.
  http.get('*/api/v1/matchmaking/pending', () => {
    if (nextPendingError) {
      const err = nextPendingError;
      nextPendingError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    return HttpResponse.json({ data: pending, error: null });
  }),
];
