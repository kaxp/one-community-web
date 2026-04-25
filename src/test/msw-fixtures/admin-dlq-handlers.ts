import { http, HttpResponse, type HttpHandler } from 'msw';
import type { DeadLetterJob, DLQRetryStatus } from '@/features/admin/schemas';

// PRD §7.12.9 / §7.12.10 fixtures. Offset-paginated; uses the legacy
// envelope shape `{ data: DeadLetterJob[], error, pagination }`.

type ErrorEnvelope = { status: number; code: string; message: string; detail?: unknown };

function makeRow(idx: number, status: DLQRetryStatus = 'pending'): DeadLetterJob {
  return {
    id: `dlq-${idx.toString(16).padStart(8, '0')}`,
    task_name: 'workers.jobs.digest_job.run',
    task_id: `celery-${idx.toString(16).padStart(8, '0')}`,
    args: [],
    kwargs: { segment: 'lp', batch: idx },
    exception_class: idx % 3 === 0 ? 'OpenAITimeoutError' : 'IntegrityError',
    exception_message: 'Timed out after 30s',
    traceback:
      `Traceback (most recent call last):\n` +
      `  File "/app/workers/digest_job.py", line 42, in run\n` +
      `    raise ${idx % 3 === 0 ? 'OpenAITimeoutError' : 'IntegrityError'}\n` +
      `${idx % 3 === 0 ? 'OpenAITimeoutError' : 'IntegrityError'}: failure ${idx}`,
    failed_at: `2026-04-${String(20 + (idx % 6)).padStart(2, '0')}T05:12:00Z`,
    retried_at: null,
    retry_status: status,
  };
}

let pendingRows: DeadLetterJob[] = Array.from({ length: 60 }, (_, i) => makeRow(i + 1, 'pending'));
let retriedRows: DeadLetterJob[] = [makeRow(101, 'retried'), makeRow(102, 'retried')];
let succeededRows: DeadLetterJob[] = [makeRow(201, 'succeeded')];
let abandonedRows: DeadLetterJob[] = [makeRow(301, 'abandoned')];

let nextListError: ErrorEnvelope | null = null;
let nextRetryError: ErrorEnvelope | null = null;
let retryCounter = 0;

function bucket(status: DLQRetryStatus | null) {
  if (status === 'pending') return pendingRows;
  if (status === 'retried') return retriedRows;
  if (status === 'succeeded') return succeededRows;
  if (status === 'abandoned') return abandonedRows;
  return [...pendingRows, ...retriedRows, ...succeededRows, ...abandonedRows];
}

export function resetMswDlqState() {
  pendingRows = Array.from({ length: 60 }, (_, i) => makeRow(i + 1, 'pending'));
  retriedRows = [makeRow(101, 'retried'), makeRow(102, 'retried')];
  succeededRows = [makeRow(201, 'succeeded')];
  abandonedRows = [makeRow(301, 'abandoned')];
  nextListError = null;
  nextRetryError = null;
  retryCounter = 0;
}

resetMswDlqState();

export function setMswDlqPending(rows: DeadLetterJob[]) {
  pendingRows = rows.slice();
}

export function getMswDlqPending() {
  return pendingRows.slice();
}

export function getMswDlqRetryCount() {
  return retryCounter;
}

export function queueDlqListError(err: ErrorEnvelope) {
  nextListError = err;
}

export function queueDlqRetryError(err: ErrorEnvelope) {
  nextRetryError = err;
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

export const adminDlqHandlers: HttpHandler[] = [
  http.get('*/api/v1/admin/dead-letter-jobs', ({ request }) => {
    if (nextListError) {
      const err = nextListError;
      nextListError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const url = new URL(request.url);
    const status = url.searchParams.get('retry_status') as DLQRetryStatus | null;
    const limit = Math.max(
      1,
      Math.min(200, Number.parseInt(url.searchParams.get('limit') ?? '50', 10) || 50),
    );
    const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') ?? '0', 10) || 0);
    const all = bucket(status);
    const slice = all.slice(offset, offset + limit);
    return HttpResponse.json({
      data: slice,
      error: null,
      pagination: { limit, offset },
    });
  }),

  http.post('*/api/v1/admin/dead-letter-jobs/:id/retry', ({ params }) => {
    if (nextRetryError) {
      const err = nextRetryError;
      nextRetryError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const id = String(params.id);
    const idx = pendingRows.findIndex((r) => r.id === id);
    if (idx === -1) {
      // Maybe in another bucket — that's a 409 (already moved).
      const inOther = [...retriedRows, ...succeededRows, ...abandonedRows].find((r) => r.id === id);
      if (inOther) {
        return HttpResponse.json(
          errorBody({
            status: 409,
            code: 'conflict',
            message: `Cannot retry job in status=${inOther.retry_status}`,
          }),
          { status: 409 },
        );
      }
      return HttpResponse.json(
        errorBody({ status: 404, code: 'not_found', message: 'Dead-letter job not found' }),
        { status: 404 },
      );
    }
    const row = pendingRows[idx]!;
    pendingRows = pendingRows.filter((r) => r.id !== id);
    retriedRows = [
      { ...row, retry_status: 'retried' as const, retried_at: '2026-04-26T18:00:00Z' },
      ...retriedRows,
    ];
    retryCounter += 1;
    return HttpResponse.json({
      data: {
        dlq_id: id,
        new_task_id: `celery-retry-${retryCounter}`,
        retry_status: 'retried' as const,
      },
      error: null,
    });
  }),
];
