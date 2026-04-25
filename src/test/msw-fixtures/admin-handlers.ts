import { http, HttpResponse, type HttpHandler } from 'msw';
import type { AdminConnection, AdminConnectionStatus } from '@/features/admin/schemas';

// Module-scoped fixture store. Tests / dev sessions can reset and seed this
// store via the helpers below.

const SEED_ROWS: AdminConnection[] = [
  {
    connection_id: '11111111-aaaa-4000-8000-000000000001',
    status: 'pending_admin',
    requester: {
      user_id: '22222222-2222-4000-8000-000000000004',
      name: 'LP Test User',
      role: 'lp',
      organisation: 'Acme Capital',
    },
    target: {
      user_id: '11111111-1111-4000-8000-000000000001',
      name: 'Kapil Sahu',
      role: 'startup_funded',
      organisation: 'Acme Technologies',
    },
    message: 'Hi Kapil — interested in your seed round.',
    created_at: '2026-04-22T10:30:00Z',
    responded_at: null,
  },
  {
    connection_id: '11111111-aaaa-4000-8000-000000000002',
    status: 'pending_admin',
    requester: {
      user_id: '22222222-2222-4000-8000-000000000005',
      name: 'Potential LP User',
      role: 'potential_lp',
      organisation: 'Bluestone',
    },
    target: {
      user_id: '11111111-1111-4000-8000-000000000003',
      name: 'Aryan Mehta',
      role: 'startup_funded',
      organisation: 'GreenStack',
    },
    message: 'Climate stack looks great — keen to chat.',
    created_at: '2026-04-22T12:14:00Z',
    responded_at: null,
  },
  {
    connection_id: '11111111-aaaa-4000-8000-000000000003',
    status: 'pending_target',
    requester: {
      user_id: '22222222-2222-4000-8000-000000000004',
      name: 'LP Test User',
      role: 'lp',
      organisation: 'Acme Capital',
    },
    target: {
      user_id: '11111111-1111-4000-8000-000000000004',
      name: 'Rhea Iyer',
      role: 'startup_funded',
      organisation: 'Sutra Health',
    },
    message: null,
    created_at: '2026-04-21T08:00:00Z',
    responded_at: '2026-04-22T09:10:00Z',
  },
  {
    connection_id: '11111111-aaaa-4000-8000-000000000004',
    status: 'accepted',
    requester: {
      user_id: '22222222-2222-4000-8000-000000000004',
      name: 'LP Test User',
      role: 'lp',
      organisation: 'Acme Capital',
    },
    target: {
      user_id: '11111111-1111-4000-8000-000000000005',
      name: 'Vikram Joshi',
      role: 'startup_funded',
      organisation: 'Mosaic Labs',
    },
    message: null,
    created_at: '2026-04-18T11:00:00Z',
    responded_at: '2026-04-19T15:00:00Z',
  },
  {
    connection_id: '11111111-aaaa-4000-8000-000000000005',
    status: 'declined',
    requester: {
      user_id: '22222222-2222-4000-8000-000000000004',
      name: 'LP Test User',
      role: 'lp',
      organisation: 'Acme Capital',
    },
    target: {
      user_id: '11111111-1111-4000-8000-000000000008',
      name: 'Meera Nair',
      role: 'startup_inprogress',
      organisation: 'EduCanvas',
    },
    message: null,
    created_at: '2026-04-15T10:00:00Z',
    responded_at: '2026-04-16T14:00:00Z',
  },
];

let rows: AdminConnection[] = [];
let nextActionError: { status: number; code: string; message: string; detail?: unknown } | null =
  null;
let nextListError: { status: number; code: string; message: string } | null = null;

export function resetMswAdminState() {
  rows = SEED_ROWS.map((r) => ({ ...r }));
  nextActionError = null;
  nextListError = null;
}

resetMswAdminState();

export function getMswAdminRowCount(status?: AdminConnectionStatus) {
  if (!status) return rows.length;
  return rows.filter((r) => r.status === status).length;
}

export function setMswAdminRows(next: AdminConnection[]) {
  rows = next.map((r) => ({ ...r }));
}

export function queueAdminActionError(err: {
  status: number;
  code: string;
  message: string;
  detail?: unknown;
}) {
  nextActionError = err;
}

export function queueAdminListError(err: { status: number; code: string; message: string }) {
  nextListError = err;
}

export const adminConnectionsHandlers: HttpHandler[] = [
  http.get('*/api/v1/admin/connections', ({ request }) => {
    if (nextListError) {
      const err = nextListError;
      nextListError = null;
      return HttpResponse.json(
        { data: null, error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    const url = new URL(request.url);
    const status = url.searchParams.get('status') as AdminConnectionStatus | null;
    const items = status ? rows.filter((r) => r.status === status) : rows.slice();
    return HttpResponse.json({ data: { items, next_cursor: null }, error: null });
  }),

  http.patch('*/api/v1/connections/:id/admin', async ({ request, params }) => {
    if (nextActionError) {
      const err = nextActionError;
      nextActionError = null;
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
    const id = params.id as string;
    const idx = rows.findIndex((r) => r.connection_id === id);
    if (idx === -1) {
      return HttpResponse.json(
        { data: null, error: { code: 'not_found', message: 'Connection request not found' } },
        { status: 404 },
      );
    }
    const row = rows[idx]!;
    if (row.status !== 'pending_admin') {
      return HttpResponse.json(
        {
          data: null,
          error: {
            code: 'conflict',
            message: 'Cannot approve: connection is not pending_admin',
            detail: { current_status: row.status },
          },
        },
        { status: 409 },
      );
    }
    const body = (await request.json()) as { action?: string };
    const nextStatus: AdminConnectionStatus =
      body.action === 'approve' ? 'pending_target' : 'rejected_admin';
    rows[idx] = { ...row, status: nextStatus, responded_at: new Date().toISOString() };
    return HttpResponse.json({
      data: {
        connection_id: id,
        status: nextStatus,
        admin_id: '22222222-2222-4000-8000-000000000003',
        acted_at: new Date().toISOString(),
      },
      error: null,
    });
  }),
];
