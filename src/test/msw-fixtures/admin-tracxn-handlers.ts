import { http, HttpResponse, type HttpHandler } from 'msw';
import type { TracxnAction, TracxnResponse } from '@/features/enrichment/schemas';

// PRD §7.15.1 fixture. The action returned varies based on
// `forcedAction` (test override) or by simulating idempotency: each unique
// `company_name` is created once; subsequent submits flip to `merged` then
// `duplicate_skipped` if no fields change.

type ErrorEnvelope = { status: number; code: string; message: string; detail?: unknown };

const knownCompanies: Map<string, { id: string; lastFingerprint: string }> = new Map();
let counter = 0;
let forcedAction: TracxnAction | null = null;
let nextError: ErrorEnvelope | null = null;
let callCounter = 0;

export function resetMswTracxnState() {
  knownCompanies.clear();
  counter = 0;
  forcedAction = null;
  nextError = null;
  callCounter = 0;
}

resetMswTracxnState();

export function setMswTracxnForcedAction(action: TracxnAction | null) {
  forcedAction = action;
}

export function getMswTracxnCallCount() {
  return callCounter;
}

export function queueTracxnError(err: ErrorEnvelope) {
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

function fingerprint(body: Record<string, unknown>): string {
  const keys = ['website_url', 'sector', 'stage', 'description', 'funding_amount_cr', 'founders'];
  return keys.map((k) => String(body[k] ?? '')).join('|');
}

export const adminTracxnHandlers: HttpHandler[] = [
  http.post('*/api/v1/enrichment/tracxn', async ({ request }) => {
    if (nextError) {
      const err = nextError;
      nextError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const body = (await request.json()) as { company_name?: string } & Record<string, unknown>;
    if (!body.company_name) {
      return HttpResponse.json(
        errorBody({ status: 422, code: 'validation_error', message: 'company_name required' }),
        { status: 422 },
      );
    }
    callCounter += 1;
    const name = body.company_name;
    const fp = fingerprint(body);

    const existing = knownCompanies.get(name);
    let action: TracxnAction;
    let id: string;

    if (forcedAction) {
      action = forcedAction;
      id = existing?.id ?? `3c9a1e00-1d12-4b56-9ab0-${counter.toString(16).padStart(12, '0')}`;
      if (!existing) {
        counter += 1;
        knownCompanies.set(name, { id, lastFingerprint: fp });
      }
    } else if (!existing) {
      counter += 1;
      id = `3c9a1e00-1d12-4b56-9ab0-${counter.toString(16).padStart(12, '0')}`;
      knownCompanies.set(name, { id, lastFingerprint: fp });
      action = 'created';
    } else if (existing.lastFingerprint !== fp) {
      id = existing.id;
      knownCompanies.set(name, { id, lastFingerprint: fp });
      action = 'merged';
    } else {
      id = existing.id;
      action = 'duplicate_skipped';
    }

    const data: TracxnResponse =
      action === 'merged'
        ? {
            action: 'merged',
            startup_id: id,
            updated_fields: ['sector', 'stage', 'funding_amount_cr'],
          }
        : { action, startup_id: id };

    return HttpResponse.json({ data, error: null });
  }),
];
