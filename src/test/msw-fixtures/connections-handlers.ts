import { http, HttpResponse, type HttpHandler } from 'msw';
import type { AcceptedConnection, PendingConnection } from '@/features/connections/schemas';

// Module-scoped fixture stores. Tests can mutate these via the helpers below.

type RespondError = { status: number; code: string; message: string; detail?: unknown };
type RequestError = { status: number; code: string; message: string; detail?: unknown };
type FeedbackError = { status: number; code: string; message: string };

const STARTUP_FIXTURE_ID = '11111111-1111-4000-8000-000000000001';

// One mixed-state seed list used by the connections feature. Tests can override
// the row set via `setMswConnectionsRows` / `setMswPendingRows`.
const SEED_ACCEPTED: AcceptedConnection[] = [
  {
    connection_id: 'aa11bb22-cc33-dd44-ee55-ff6677889900',
    status: 'accepted',
    counterpart: {
      user_id: STARTUP_FIXTURE_ID,
      name: 'Kapil Sahu',
      role: 'startup_funded',
      organisation: 'Acme Technologies',
      avatar_url: null,
      contact: {
        email: 'kapil@acme.ai',
        phone: '+919876543210',
        linkedin_url: 'https://linkedin.com/in/kapilsahu',
      },
    },
    intro_id: 'cc33dd44-ee55-4000-8000-001122334455',
    feedback_submitted: false,
    created_at: '2026-04-10T10:30:00Z',
    responded_at: '2026-04-11T08:01:00Z',
  },
  {
    connection_id: 'aa11bb22-cc33-dd44-ee55-ff6677889911',
    status: 'accepted',
    counterpart: {
      user_id: '11111111-1111-4000-8000-000000000005',
      name: 'Vikram Joshi',
      role: 'startup_funded',
      organisation: 'Mosaic Labs',
      avatar_url: null,
      contact: {
        email: 'vikram@mosaic.io',
        phone: '+919876111222',
        linkedin_url: null,
      },
    },
    intro_id: null,
    feedback_submitted: true,
    created_at: '2026-04-05T10:30:00Z',
    responded_at: '2026-04-06T08:01:00Z',
  },
];

const SEED_PENDING: PendingConnection[] = [
  {
    connection_id: 'bb22cc33-dd44-4000-8000-001122334455',
    status: 'pending_admin',
    direction: 'outgoing',
    counterpart: {
      user_id: '11111111-1111-4000-8000-000000000003',
      name: 'Aryan Mehta',
      role: 'startup_funded',
      organisation: 'GreenStack',
      avatar_url: null,
    },
    message: 'Hi Aryan — saw GreenStack in the digest, would love 20 min.',
    created_at: '2026-04-23T10:15:00Z',
    responded_at: null,
  },
  {
    connection_id: 'bb22cc33-dd44-4000-8000-001122334466',
    status: 'pending_target',
    direction: 'incoming',
    counterpart: {
      user_id: '22222222-2222-4000-8000-000000000004',
      name: 'Priya Rao',
      role: 'vc',
      organisation: 'NeoVC',
      avatar_url: null,
    },
    message: 'Excited about Acme — keen to learn more.',
    created_at: '2026-04-22T09:15:00Z',
    responded_at: null,
  },
  {
    connection_id: 'bb22cc33-dd44-4000-8000-001122334477',
    status: 'pending_target',
    direction: 'outgoing',
    counterpart: {
      user_id: '11111111-1111-4000-8000-000000000004',
      name: 'Rhea Iyer',
      role: 'startup_funded',
      organisation: 'Sutra Health',
      avatar_url: null,
    },
    message: null,
    created_at: '2026-04-21T08:00:00Z',
    responded_at: null,
  },
];

let acceptedRows: AcceptedConnection[] = [];
let pendingRows: PendingConnection[] = [];
let nextRespondError: RespondError | null = null;
let nextRequestError: RequestError | null = null;
let nextFeedbackError: FeedbackError | null = null;
let nextListError: { status: number; code: string; message: string } | null = null;
let nextPendingListError: { status: number; code: string; message: string } | null = null;
let counter = 0;

function nextUUID(prefix: 'cc' | 'aa' | 'dd'): string {
  counter += 1;
  // Counter expanded to 6 hex chars + 2-char prefix = 8-char first segment.
  // Resulting UUID: <prefix><6hex>-4000-4000-8000-001122334455.
  const hex = counter.toString(16).padStart(6, '0').slice(-6);
  return `${prefix}${hex}-4000-4000-8000-001122334455`;
}

export function resetMswConnectionsState() {
  acceptedRows = SEED_ACCEPTED.map((r) => ({ ...r, counterpart: { ...r.counterpart } }));
  pendingRows = SEED_PENDING.map((r) => ({ ...r, counterpart: { ...r.counterpart } }));
  nextRespondError = null;
  nextRequestError = null;
  nextFeedbackError = null;
  nextListError = null;
  nextPendingListError = null;
  counter = 0;
}

resetMswConnectionsState();

export function setMswConnectionsRows(next: AcceptedConnection[]) {
  acceptedRows = next.map((r) => ({ ...r, counterpart: { ...r.counterpart } }));
}

export function setMswPendingRows(next: PendingConnection[]) {
  pendingRows = next.map((r) => ({ ...r, counterpart: { ...r.counterpart } }));
}

export function queueConnectionsListError(err: { status: number; code: string; message: string }) {
  nextListError = err;
}

export function queuePendingListError(err: { status: number; code: string; message: string }) {
  nextPendingListError = err;
}

export function queueRespondError(err: RespondError) {
  nextRespondError = err;
}

export function queueRequestError(err: RequestError) {
  nextRequestError = err;
}

export function queueFeedbackError(err: FeedbackError) {
  nextFeedbackError = err;
}

export function getMswPendingRowCount() {
  return pendingRows.length;
}

export function getMswAcceptedRowCount() {
  return acceptedRows.length;
}

export const connectionsHandlers: HttpHandler[] = [
  // PRD §7.6.4 — accepted list.
  http.get('*/api/v1/connections', () => {
    if (nextListError) {
      const err = nextListError;
      nextListError = null;
      return HttpResponse.json(
        { data: null, error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    return HttpResponse.json({
      data: { items: acceptedRows.slice(), next_cursor: null },
      error: null,
    });
  }),

  // PRD §7.6.5 — pending (incoming + outgoing).
  http.get('*/api/v1/connections/pending', () => {
    if (nextPendingListError) {
      const err = nextPendingListError;
      nextPendingListError = null;
      return HttpResponse.json(
        { data: null, error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    return HttpResponse.json({
      data: { items: pendingRows.slice(), next_cursor: null },
      error: null,
    });
  }),

  // PRD §7.6.1 — request connection.
  http.post('*/api/v1/connections/request', async ({ request }) => {
    if (nextRequestError) {
      const err = nextRequestError;
      nextRequestError = null;
      return HttpResponse.json(
        {
          data: null,
          error: {
            code: err.code,
            message: err.message,
            ...(err.detail !== undefined ? { detail: err.detail } : {}),
          },
        },
        { status: err.status },
      );
    }
    const body = (await request.json()) as { target_id?: string; message?: string };
    const newId = nextUUID('cc');
    if (body.target_id) {
      pendingRows.unshift({
        connection_id: newId,
        status: 'pending_admin',
        direction: 'outgoing',
        counterpart: {
          user_id: body.target_id,
          name: 'Pending target',
          role: 'startup_funded',
          organisation: null,
          avatar_url: null,
        },
        message: body.message ?? null,
        created_at: new Date().toISOString(),
        responded_at: null,
      });
    }
    return HttpResponse.json({
      data: { connection_id: newId, status: 'pending_admin' as const },
      error: null,
    });
  }),

  // PRD §7.6.3 — respond (accept/decline).
  http.patch('*/api/v1/connections/:id/respond', async ({ request, params }) => {
    if (nextRespondError) {
      const err = nextRespondError;
      nextRespondError = null;
      return HttpResponse.json(
        {
          data: null,
          error: {
            code: err.code,
            message: err.message,
            ...(err.detail !== undefined ? { detail: err.detail } : {}),
          },
        },
        { status: err.status },
      );
    }
    const id = String(params.id);
    const idx = pendingRows.findIndex((r) => r.connection_id === id);
    if (idx === -1) {
      return HttpResponse.json(
        { data: null, error: { code: 'not_found', message: 'Connection request not found' } },
        { status: 404 },
      );
    }
    const row = pendingRows[idx]!;
    if (row.status !== 'pending_target') {
      return HttpResponse.json(
        {
          data: null,
          error: {
            code: 'conflict',
            message: 'Cannot respond: connection is not pending_target',
            detail: { current_status: row.status },
          },
        },
        { status: 409 },
      );
    }
    const body = (await request.json()) as { action?: string };
    const respondedAt = new Date().toISOString();
    if (body.action === 'accept') {
      const introId = nextUUID('aa');
      pendingRows.splice(idx, 1);
      acceptedRows.unshift({
        connection_id: id,
        status: 'accepted',
        counterpart: {
          ...row.counterpart,
          contact: {
            email: 'unlocked@example.com',
            phone: '+919999000000',
            linkedin_url: null,
          },
        },
        intro_id: introId,
        feedback_submitted: false,
        created_at: row.created_at,
        responded_at: respondedAt,
      });
      return HttpResponse.json({
        data: {
          connection_id: id,
          status: 'accepted' as const,
          intro_id: introId,
          responded_at: respondedAt,
        },
        error: null,
      });
    }
    // decline
    pendingRows[idx] = { ...row, status: 'declined', responded_at: respondedAt };
    return HttpResponse.json({
      data: {
        connection_id: id,
        status: 'declined' as const,
        intro_id: null,
        responded_at: respondedAt,
      },
      error: null,
    });
  }),

  // PRD §7.7.2 — feedback (Yes/No on intro).
  http.post('*/api/v1/interactions/feedback', async ({ request }) => {
    if (nextFeedbackError) {
      const err = nextFeedbackError;
      nextFeedbackError = null;
      return HttpResponse.json(
        { data: null, error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    const body = (await request.json()) as { intro_id?: string; response?: 'yes' | 'no' };
    return HttpResponse.json({
      data: {
        recorded: true,
        intro_id: body.intro_id ?? '',
        response: body.response ?? 'yes',
      },
      error: null,
    });
  }),
];
