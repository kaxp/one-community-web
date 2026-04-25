import { http, HttpResponse, type HttpHandler } from 'msw';
import type { AdminSummaryResponse } from '@/features/admin/schemas';

// PRD §7.12.1 fixtures.

type ErrorEnvelope = { status: number; code: string; message: string; detail?: unknown };

const SEED: AdminSummaryResponse = {
  pending_connection_count: 4,
  mis_status: [
    {
      startup_id: '3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12',
      company_name: 'Acme Technologies',
      period: '2026-04',
      submitted: false,
    },
    {
      startup_id: 'a7b3d500-3f21-4a99-9e2f-8a1b3c4d5e6f',
      company_name: 'NeoLedger',
      period: '2026-04',
      submitted: true,
    },
    {
      startup_id: 'b1c2d300-4e5f-4a7b-8c9d-0e1f2a3b4c5d',
      company_name: 'Boltline Robotics',
      period: '2026-04',
      submitted: false,
    },
  ],
  recent_digests: [
    {
      id: 'e3d2c1b0-1234-4678-90ab-cdef01234567',
      digest_type: 'lp_weekly',
      sent_at: '2026-04-21T07:00:00Z',
    },
  ],
  recent_actions: [
    {
      admin_id: 'a1b2c3d4-5678-490b-8def-0123456789ab',
      admin_name: 'Raghav',
      action: 'approve_connection',
      target_type: 'connection_request',
      target_id: 'f0e1d2c3-b4a5-4687-9f00-1a2b3c4d5e6f',
      created_at: '2026-04-23T10:30:00Z',
    },
  ],
};

let summaryFixture: AdminSummaryResponse = SEED;
let nextError: ErrorEnvelope | null = null;

export function resetMswAdminHomeState() {
  summaryFixture = SEED;
  nextError = null;
}

resetMswAdminHomeState();

export function setMswAdminSummary(value: AdminSummaryResponse) {
  summaryFixture = value;
}

export function queueAdminSummaryError(err: ErrorEnvelope) {
  nextError = err;
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

export const adminHomeHandlers: HttpHandler[] = [
  http.get('*/api/v1/admin/summary', () => {
    if (nextError) {
      const err = nextError;
      nextError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    return HttpResponse.json({ data: summaryFixture, error: null });
  }),
];
