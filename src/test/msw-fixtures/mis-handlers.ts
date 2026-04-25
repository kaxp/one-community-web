import { http, HttpResponse, type HttpHandler } from 'msw';
import type { MISFormResponse, MISPrefillResponse, MISSubmitRequest } from '@/features/mis/schemas';

// PRD §7.9.1 / §7.9.2 / §7.9.3 fixtures. The handler tracks one "submitted"
// flag per test run so the 200 → already_submitted → 409 cycle can be
// reproduced deterministically.

const SEED_PERIOD = '2026-04';
const SEED_LAST_PERIOD = '2026-03';
const SEED_STARTUP_ID = '3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12';
const SEED_COMPANY = 'Acme Technologies';

const SEED_FORM: MISFormResponse = {
  period: SEED_PERIOD,
  company_name: SEED_COMPANY,
  startup_id: SEED_STARTUP_ID,
  fields_schema: {
    revenue: { unit: 'INR', required: true },
    burn: { unit: 'INR', required: true },
    runway_months: { unit: 'months', required: false },
    headcount: { unit: 'count', required: false },
    highlights: { max_length: 2000, required: false },
    lowlights: { max_length: 2000, required: false },
  },
  prefill: {
    revenue: 2000000,
    burn: 1500000,
    runway_months: 8,
    headcount: 12,
    highlights: 'Closed Bank X as a pilot.',
    lowlights: 'Churned Customer Y.',
  },
  already_submitted: false,
  last_submission_at: null,
};

const SEED_PREFILL: MISPrefillResponse = {
  period: SEED_LAST_PERIOD,
  company_name: SEED_COMPANY,
  prefill: {
    revenue: 2000000,
    burn: 1500000,
    runway_months: 8,
    headcount: 12,
    highlights: 'Closed Bank X as a pilot.',
    lowlights: 'Churned Customer Y.',
  },
};

let formFixture: MISFormResponse = { ...SEED_FORM };
let prefillFixture: MISPrefillResponse = { ...SEED_PREFILL };
let nextFormError: { status: number; code: string; message: string } | null = null;
let nextPrefillError: { status: number; code: string; message: string } | null = null;
let nextSubmitError: { status: number; code: string; message: string; detail?: unknown } | null =
  null;
let submissionCounter = 0;

export function resetMswMisState() {
  formFixture = {
    ...SEED_FORM,
    prefill: { ...(SEED_FORM.prefill ?? {}) } as typeof SEED_FORM.prefill,
  };
  prefillFixture = {
    ...SEED_PREFILL,
    prefill: { ...(SEED_PREFILL.prefill ?? {}) } as typeof SEED_PREFILL.prefill,
  };
  nextFormError = null;
  nextPrefillError = null;
  nextSubmitError = null;
  submissionCounter = 0;
}

resetMswMisState();

export function setMswMisFormFixture(fixture: Partial<MISFormResponse>) {
  formFixture = { ...formFixture, ...fixture };
}

export function setMswMisAlreadySubmitted(at: string) {
  formFixture = { ...formFixture, already_submitted: true, last_submission_at: at };
}

export function setMswMisPrefillFixture(fixture: Partial<MISPrefillResponse>) {
  prefillFixture = { ...prefillFixture, ...fixture };
}

export function queueMisFormError(err: { status: number; code: string; message: string }) {
  nextFormError = err;
}

export function queueMisPrefillError(err: { status: number; code: string; message: string }) {
  nextPrefillError = err;
}

export function queueMisSubmitError(err: {
  status: number;
  code: string;
  message: string;
  detail?: unknown;
}) {
  nextSubmitError = err;
}

export const misHandlers: HttpHandler[] = [
  // PRD §7.9.1 — current-month form schema + prefill.
  http.get('*/api/v1/portfolio/mis', () => {
    if (nextFormError) {
      const err = nextFormError;
      nextFormError = null;
      return HttpResponse.json(
        { data: null, error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    return HttpResponse.json({ data: formFixture, error: null });
  }),

  // PRD §7.9.3 — last-month prefill (parallel fetch).
  http.get('*/api/v1/portfolio/mis/prefill', () => {
    if (nextPrefillError) {
      const err = nextPrefillError;
      nextPrefillError = null;
      return HttpResponse.json(
        { data: null, error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    return HttpResponse.json({ data: prefillFixture, error: null });
  }),

  // PRD §7.9.2 — submission. UNIQUE(startup_id, period). After the first
  // success the in-memory fixture flips to already_submitted=true, so a
  // second POST in the same test surfaces 409 mis_already_submitted.
  http.post('*/api/v1/portfolio/mis', async ({ request }) => {
    if (nextSubmitError) {
      const err = nextSubmitError;
      nextSubmitError = null;
      return HttpResponse.json(
        {
          data: null,
          error: { code: err.code, message: err.message, detail: err.detail ?? undefined },
        },
        { status: err.status },
      );
    }
    const body = (await request.json()) as MISSubmitRequest;
    if (formFixture.already_submitted) {
      return HttpResponse.json(
        {
          data: null,
          error: {
            code: 'mis_already_submitted',
            message: 'MIS for this period was already submitted',
            detail: { existing_submission_id: 'fixture-prev', period: body.period },
          },
        },
        { status: 409 },
      );
    }
    submissionCounter += 1;
    const submittedAt = new Date('2026-04-23T15:45:00.000Z').toISOString();
    formFixture = { ...formFixture, already_submitted: true, last_submission_at: submittedAt };
    return HttpResponse.json({
      data: {
        submission_id: `d4e5f6a7-8b9c-4d1e-9f3a-4b5c6d7e8f${submissionCounter
          .toString(16)
          .padStart(2, '0')
          .slice(-2)}`,
        period: body.period,
        startup_id: SEED_STARTUP_ID,
        submitted_at: submittedAt,
      },
      error: null,
    });
  }),
];
