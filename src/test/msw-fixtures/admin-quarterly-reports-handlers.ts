import { http, HttpResponse, type HttpHandler } from 'msw';
import type { QuarterlyReport } from '@/features/admin/schemas';

// PRD §7.12.7 / §7.12.8 fixtures.

type ErrorEnvelope = { status: number; code: string; message: string; detail?: unknown };

const SEED: QuarterlyReport[] = [
  {
    report_id: 'r1-q1-2026',
    quarter: 'Q1-2026',
    status: 'pending',
    drive_url: 'https://drive.google.com/file/d/abc/view',
    generated_at: '2026-04-01T06:00:00Z',
    approved_by: null,
    approved_at: null,
    distributed_at: null,
    recipient_count: 120,
  },
  {
    report_id: 'r2-q4-2025',
    quarter: 'Q4-2025',
    status: 'sent',
    drive_url: 'https://drive.google.com/file/d/def/view',
    generated_at: '2026-01-05T06:00:00Z',
    approved_by: '00000000-0000-4000-8000-000000000002',
    approved_at: '2026-01-06T10:00:00Z',
    distributed_at: '2026-01-06T10:30:00Z',
    recipient_count: 118,
  },
];

let reports: QuarterlyReport[] = SEED;
let nextListError: ErrorEnvelope | null = null;
let nextApproveError: ErrorEnvelope | null = null;
let approveCounter = 0;

export function resetMswQuarterlyReportsState() {
  reports = SEED.map((r) => ({ ...r }));
  nextListError = null;
  nextApproveError = null;
  approveCounter = 0;
}

resetMswQuarterlyReportsState();

export function setMswQuarterlyReports(next: QuarterlyReport[]) {
  reports = next.map((r) => ({ ...r }));
}

export function getMswQuarterlyReports() {
  return reports.slice();
}

export function getMswQuarterlyApproveCount() {
  return approveCounter;
}

export function queueQuarterlyReportsListError(err: ErrorEnvelope) {
  nextListError = err;
}

export function queueQuarterlyReportApproveError(err: ErrorEnvelope) {
  nextApproveError = err;
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

export const adminQuarterlyReportsHandlers: HttpHandler[] = [
  http.get('*/api/v1/admin/quarterly-reports', ({ request }) => {
    if (nextListError) {
      const err = nextListError;
      nextListError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const url = new URL(request.url);
    const filter = url.searchParams.get('quarter');
    const filtered = filter ? reports.filter((r) => r.quarter === filter) : reports;
    return HttpResponse.json({ data: filtered, error: null });
  }),

  http.post('*/api/v1/admin/quarterly-reports/approve', async ({ request }) => {
    if (nextApproveError) {
      const err = nextApproveError;
      nextApproveError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const body = (await request.json()) as { report_id?: string };
    if (!body.report_id) {
      return HttpResponse.json(
        errorBody({ status: 422, code: 'validation_error', message: 'report_id required' }),
        { status: 422 },
      );
    }
    const idx = reports.findIndex((r) => r.report_id === body.report_id);
    if (idx === -1) {
      return HttpResponse.json(
        errorBody({ status: 404, code: 'not_found', message: 'Report not found' }),
        { status: 404 },
      );
    }
    const row = reports[idx]!;
    if (row.status !== 'pending') {
      return HttpResponse.json(
        errorBody({
          status: 409,
          code: 'conflict',
          message: 'Report already approved',
          detail: { current_status: row.status },
        }),
        { status: 409 },
      );
    }
    const approvedAt = '2026-04-26T17:30:00Z';
    const approvedBy = '00000000-0000-4000-8000-000000000002';
    reports[idx] = {
      ...row,
      status: 'approved',
      approved_by: approvedBy,
      approved_at: approvedAt,
    };
    approveCounter += 1;
    return HttpResponse.json({
      data: {
        report_id: row.report_id,
        status: 'approved' as const,
        approved_by: approvedBy,
        approved_at: approvedAt,
        distribution_job_id: 'dist-job-fixture-uuid',
      },
      error: null,
    });
  }),
];
