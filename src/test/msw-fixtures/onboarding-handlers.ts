import { http, HttpResponse, type HttpHandler } from 'msw';
import type {
  CardScanParsed,
  CardScanRecord,
  CardScanResponse,
} from '@/features/onboarding/schemas';

// PRD §7.2.1 / §7.2.2 fixtures + a /ocr stub for the flag-flip path.
//
// State machine: each `POST /onboarding/card-scan` increments a counter
// and stashes the result keyed by `scan_id` so a follow-up §7.2.2 GET
// can read it back. The handler distinguishes "initial parse" (raw_text
// only) from "final confirm" (parsed + category present) by the body
// shape, mimicking the backend's two-phase flow.

type ErrorEnvelope = { status: number; code: string; message: string; detail?: unknown };

let scanCounter = 0;
let nextParseError: ErrorEnvelope | null = null;
let nextConfirmError: ErrorEnvelope | null = null;
let nextGetError: ErrorEnvelope | null = null;
let nextOcrError: ErrorEnvelope | null = null;
let parsedOverride: Partial<CardScanParsed> | null = null;
let createUserOnConfirm = true;
let nextOcrPayload: { raw_text: string; confidence: number } | null = null;
const records: Record<string, CardScanRecord> = {};

const DEFAULT_PARSED: CardScanParsed = {
  name: 'Kapil Sahu',
  phone: '+919876543210',
  email: 'kapil@example.com',
  organisation: 'Warmup Ventures',
  designation: 'Principal',
  linkedin_url: null,
  raw_text: 'Kapil Sahu\nPrincipal, Warmup Ventures\n+91-9876543210\nkapil@example.com',
};

export function resetMswOnboardingState() {
  scanCounter = 0;
  nextParseError = null;
  nextConfirmError = null;
  nextGetError = null;
  nextOcrError = null;
  parsedOverride = null;
  createUserOnConfirm = true;
  nextOcrPayload = null;
  for (const k of Object.keys(records)) delete records[k];
}

resetMswOnboardingState();

export function setMswCardScanParsed(next: Partial<CardScanParsed> | null) {
  parsedOverride = next;
}

export function setMswCardScanCreatesUser(value: boolean) {
  createUserOnConfirm = value;
}

export function queueCardScanParseError(err: ErrorEnvelope) {
  nextParseError = err;
}

export function queueCardScanConfirmError(err: ErrorEnvelope) {
  nextConfirmError = err;
}

export function queueCardScanGetError(err: ErrorEnvelope) {
  nextGetError = err;
}

export function queueOcrError(err: ErrorEnvelope) {
  nextOcrError = err;
}

export function setMswOcrPayload(payload: { raw_text: string; confidence: number } | null) {
  nextOcrPayload = payload;
}

export function getMswCardScanRecords() {
  return Object.values(records);
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

function nextScanId() {
  scanCounter += 1;
  return `1a2b3c4d-0000-4000-8000-${scanCounter.toString(16).padStart(12, '0')}`;
}

export const onboardingHandlers: HttpHandler[] = [
  // PRD §7.2.1 — card scan parse + confirm.
  http.post('*/api/v1/onboarding/card-scan', async ({ request }) => {
    const body = (await request.json()) as {
      raw_text?: string;
      image_url?: string;
      parsed?: Partial<CardScanParsed>;
      category?: string;
    };

    const isConfirm = !!body.parsed || !!body.category;

    if (isConfirm) {
      if (nextConfirmError) {
        const err = nextConfirmError;
        nextConfirmError = null;
        return HttpResponse.json(errorBody(err), { status: err.status });
      }
    } else {
      if (nextParseError) {
        const err = nextParseError;
        nextParseError = null;
        return HttpResponse.json(errorBody(err), { status: err.status });
      }
    }

    if (!body.raw_text || body.raw_text.length < 10) {
      return HttpResponse.json(
        errorBody({
          status: 400,
          code: 'validation_error',
          message: 'Validation failed',
          detail: [
            {
              loc: ['body', 'raw_text'],
              msg: 'ensure this value has at least 10 characters',
              type: 'value_error',
            },
          ],
        }),
        { status: 400 },
      );
    }

    const scan_id = nextScanId();
    const parsed: CardScanParsed = {
      ...DEFAULT_PARSED,
      ...(parsedOverride ?? {}),
      ...(body.parsed ?? {}),
      raw_text: body.raw_text,
    };

    const user_created = isConfirm && createUserOnConfirm;
    const user_id = user_created ? '0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0' : null;

    const response: CardScanResponse = {
      scan_id,
      parsed,
      user_created,
      user_id,
      pending_approval: false,
    };
    records[scan_id] = {
      scan_id,
      user_id,
      image_url: body.image_url ?? null,
      ocr_raw: body.raw_text,
      extracted_data: parsed,
      status: 'processed',
      created_at: '2026-04-25T23:55:00.000Z',
    };

    return HttpResponse.json({ data: response, error: null });
  }),

  // PRD §7.2.2 — fetch a scan by id.
  http.get('*/api/v1/onboarding/card-scan/:id', ({ params }) => {
    if (nextGetError) {
      const err = nextGetError;
      nextGetError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const id = String(params.id);
    const row = records[id];
    if (!row) {
      return HttpResponse.json(
        errorBody({ status: 404, code: 'not_found', message: 'Card scan not found' }),
        { status: 404 },
      );
    }
    return HttpResponse.json({ data: row, error: null });
  }),

  // PRD §13.2 G2 flag-flip — server-side OCR. Only exercised when
  // VITE_OCR_SERVER_ENABLED=true; otherwise the frontend never hits it.
  http.post('*/api/v1/ocr', () => {
    if (nextOcrError) {
      const err = nextOcrError;
      nextOcrError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const payload = nextOcrPayload ?? {
      raw_text: 'Kapil Sahu\nPrincipal, Warmup Ventures\n+91-9876543210\nkapil@example.com',
      confidence: 0.92,
    };
    return HttpResponse.json({ data: payload, error: null });
  }),
];
