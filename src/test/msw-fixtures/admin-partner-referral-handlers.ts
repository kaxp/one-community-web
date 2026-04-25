import { http, HttpResponse, type HttpHandler } from 'msw';

// PRD §7.12.6 fixture.

type ErrorEnvelope = { status: number; code: string; message: string; detail?: unknown };

let nextError: ErrorEnvelope | null = null;
let partnerCount = 3;
let callCounter = 0;

export function resetMswPartnerReferralState() {
  nextError = null;
  partnerCount = 3;
  callCounter = 0;
}

resetMswPartnerReferralState();

export function setMswPartnerReferralCount(value: number) {
  partnerCount = value;
}

export function getMswPartnerReferralCallCount() {
  return callCounter;
}

export function queuePartnerReferralError(err: ErrorEnvelope) {
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

export const adminPartnerReferralHandlers: HttpHandler[] = [
  http.post('*/api/v1/admin/partner-referral', async ({ request }) => {
    if (nextError) {
      const err = nextError;
      nextError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const body = (await request.json()) as { sector?: string };
    if (!body.sector) {
      return HttpResponse.json(
        errorBody({ status: 422, code: 'validation_error', message: 'sector required' }),
        { status: 422 },
      );
    }
    callCounter += 1;
    const partner_ids = Array.from({ length: partnerCount }, (_, i) => `p${i + 1}-fixture`);
    return HttpResponse.json({
      data: {
        partners_notified: partnerCount,
        partner_ids,
        sector: body.sector,
      },
      error: null,
    });
  }),
];
