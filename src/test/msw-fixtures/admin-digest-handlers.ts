import { http, HttpResponse, type HttpHandler } from 'msw';
import type {
  AdminDigestResponse,
  DigestHistoryResponse,
  DigestPendingResponse,
} from '@/features/digest/schemas';

// PRD §7.12.3 / §7.12.4 / §7.13.1–4 fixtures.

type ErrorEnvelope = { status: number; code: string; message: string; detail?: unknown };

const SEED_WORKFLOWS: AdminDigestResponse = [
  {
    workflow_name: 'lp_weekly',
    status: 'active',
    target_roles: ['lp', 'potential_lp'],
    schedule: 'Monday 07:00 IST',
    last_send: {
      digest_id: 'e3d2c1b0-1234-4678-90ab-cdef01234567',
      sent_at: '2026-04-21T07:00:00Z',
      message_count: 87,
    },
  },
  {
    workflow_name: 'vc_monthly',
    status: 'active',
    target_roles: ['vc'],
    schedule: '1st of month 10:00 IST',
    last_send: null,
  },
  {
    workflow_name: 'partner_pulse',
    status: 'paused',
    target_roles: ['partner'],
    schedule: 'Manual',
    last_send: null,
  },
];

const SEED_PENDING: DigestPendingResponse = [
  {
    id: 'e3d2c1b0-1234-4678-90ab-cdef01234567',
    user_id: 'b1c2d300-4e5f-4a7b-8c9d-0e1f2a3b4c5d',
    digest_type: 'lp_weekly',
    content: {
      status: 'pending',
      subject: 'Your Weekly Warmup Update',
      html: '<html><body><h1>This week</h1><p>Three new defence-tech opportunities matched your thesis.</p></body></html>',
      plain: 'Hi Abhinav, here is your weekly defence-tech digest.',
      segment: 'lp',
      interest_tags: ['defence'],
    },
    sent_at: null,
  },
  {
    id: 'a1b2c3d4-1234-4678-90ab-cdef01234567',
    user_id: '0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0',
    digest_type: 'vc_monthly',
    content: {
      status: 'pending',
      subject: 'April VC Pulse',
      html: '<html><body><h1>April</h1><p>Monthly thematic roll-up.</p></body></html>',
      plain: 'April VC Pulse — monthly thematic roll-up.',
      segment: 'vc',
      interest_tags: ['fintech', 'saas'],
    },
    sent_at: null,
  },
];

const SEED_HISTORY: DigestHistoryResponse = [
  {
    id: 'c3b2a100-1234-4678-90ab-cdef01234567',
    user_id: 'b1c2d300-4e5f-4a7b-8c9d-0e1f2a3b4c5d',
    digest_type: 'lp_weekly',
    content: {
      status: 'sent',
      subject: 'Your Weekly Warmup Update',
      segment: 'lp',
    },
    sent_at: '2026-04-21T07:00:15Z',
  },
];

let workflows: AdminDigestResponse = SEED_WORKFLOWS;
let pending: DigestPendingResponse = SEED_PENDING;
let history: DigestHistoryResponse = SEED_HISTORY;
let nextWorkflowsError: ErrorEnvelope | null = null;
let nextSendError: ErrorEnvelope | null = null;
let nextGenerateError: ErrorEnvelope | null = null;
let nextApproveError: ErrorEnvelope | null = null;
let nextPendingError: ErrorEnvelope | null = null;
let nextHistoryError: ErrorEnvelope | null = null;
let approveCounter = 0;

export function resetMswAdminDigestState() {
  workflows = SEED_WORKFLOWS.map((w) => ({
    ...w,
    last_send: w.last_send ? { ...w.last_send } : null,
  }));
  pending = SEED_PENDING.map((p) => ({ ...p, content: { ...p.content } }));
  history = SEED_HISTORY.map((h) => ({ ...h, content: { ...h.content } }));
  nextWorkflowsError = null;
  nextSendError = null;
  nextGenerateError = null;
  nextApproveError = null;
  nextPendingError = null;
  nextHistoryError = null;
  approveCounter = 0;
}

resetMswAdminDigestState();

export function setMswDigestWorkflows(next: AdminDigestResponse) {
  workflows = next.map((w) => ({ ...w }));
}

export function setMswDigestPending(next: DigestPendingResponse) {
  pending = next.map((p) => ({ ...p, content: { ...p.content } }));
}

export function setMswDigestHistory(next: DigestHistoryResponse) {
  history = next.map((h) => ({ ...h, content: { ...h.content } }));
}

export function getMswDigestPending() {
  return pending.slice();
}

export function getMswDigestHistory() {
  return history.slice();
}

export function queueAdminDigestError(err: ErrorEnvelope) {
  nextWorkflowsError = err;
}

export function queueDigestSendError(err: ErrorEnvelope) {
  nextSendError = err;
}

export function queueDigestGenerateError(err: ErrorEnvelope) {
  nextGenerateError = err;
}

export function queueDigestApproveError(err: ErrorEnvelope) {
  nextApproveError = err;
}

export function queueDigestPendingError(err: ErrorEnvelope) {
  nextPendingError = err;
}

export function queueDigestHistoryError(err: ErrorEnvelope) {
  nextHistoryError = err;
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

export const adminDigestHandlers: HttpHandler[] = [
  // PRD §7.12.3
  http.get('*/api/v1/admin/digest', () => {
    if (nextWorkflowsError) {
      const err = nextWorkflowsError;
      nextWorkflowsError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    return HttpResponse.json({ data: workflows, error: null });
  }),

  // PRD §7.12.4
  http.post('*/api/v1/admin/digest/send', async ({ request }) => {
    if (nextSendError) {
      const err = nextSendError;
      nextSendError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const body = (await request.json()) as { workflow_name?: string };
    const wf = workflows.find((w) => w.workflow_name === body.workflow_name);
    if (!wf) {
      return HttpResponse.json(
        errorBody({
          status: 404,
          code: 'not_found',
          message: `Workflow not found: ${body.workflow_name}`,
        }),
        { status: 404 },
      );
    }
    return HttpResponse.json({
      data: {
        workflow_name: wf.workflow_name,
        triggered_at: '2026-04-26T16:45:00Z',
        message_count: 87,
        digest_id: 'c3b2a100-2222-4678-90ab-cdef01234567',
      },
      error: null,
    });
  }),

  // PRD §7.13.1
  http.post('*/api/v1/digest/generate', async ({ request }) => {
    if (nextGenerateError) {
      const err = nextGenerateError;
      nextGenerateError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const body = (await request.json()) as { segment?: string };
    return HttpResponse.json({
      data: {
        generated_count: 3,
        segment: body.segment ?? 'lp',
        digest_ids: [
          'e3d2c1b0-1111-4678-90ab-cdef01234567',
          'e3d2c1b0-2222-4678-90ab-cdef01234567',
          'e3d2c1b0-3333-4678-90ab-cdef01234567',
        ],
      },
      error: null,
    });
  }),

  // PRD §7.13.2
  http.post('*/api/v1/digest/approve', async ({ request }) => {
    if (nextApproveError) {
      const err = nextApproveError;
      nextApproveError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const body = (await request.json()) as { digest_id?: string };
    if (!body.digest_id) {
      return HttpResponse.json(
        errorBody({ status: 422, code: 'validation_error', message: 'digest_id required' }),
        { status: 422 },
      );
    }
    const idx = pending.findIndex((p) => p.id === body.digest_id);
    if (idx === -1) {
      return HttpResponse.json(
        errorBody({ status: 404, code: 'not_found', message: 'Digest not found' }),
        { status: 404 },
      );
    }
    const row = pending[idx]!;
    pending = pending.filter((p) => p.id !== row.id);
    history = [
      {
        ...row,
        content: { ...row.content, status: 'sent' as const },
        sent_at: '2026-04-26T18:00:00Z',
      },
      ...history,
    ];
    approveCounter += 1;
    return HttpResponse.json({
      data: { sent: true, digest_id: row.id, queued_at: '2026-04-26T18:00:00Z' },
      error: null,
    });
  }),

  // PRD §7.13.3
  http.get('*/api/v1/digest/pending', () => {
    if (nextPendingError) {
      const err = nextPendingError;
      nextPendingError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    return HttpResponse.json({ data: pending, error: null });
  }),

  // PRD §7.13.4
  http.get('*/api/v1/digest/history', ({ request }) => {
    if (nextHistoryError) {
      const err = nextHistoryError;
      nextHistoryError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const url = new URL(request.url);
    const limit = Math.max(
      1,
      Math.min(200, Number.parseInt(url.searchParams.get('limit') ?? '50', 10) || 50),
    );
    return HttpResponse.json({ data: history.slice(0, limit), error: null });
  }),
];

// Internal counter used by tests to verify approve fired.
export function getMswApproveCount() {
  return approveCounter;
}
