import { delay, http, HttpResponse } from 'msw';

// PRD §7.9.1 / §7.9.2 / §7.9.3 — MIS file upload redesign (decisions.md [P-23]).
// The old structured-form handlers are replaced by the file upload contract.

// ── Fixtures ─────────────────────────────────────────────────────────────────

const NOT_SUBMITTED = {
  company_name: 'Acme Technologies',
  current_period: '2026-04',
  last_submission: null,
};

const ALREADY_SUBMITTED = {
  company_name: 'Acme Technologies',
  current_period: '2026-04',
  last_submission: {
    submission_id: 'aa11bb22-cc33-dd44-ee55-ff6677889900',
    period: '2026-04',
    file_url: 'https://drive.google.com/file/d/stub/view',
    file_name: 'MIS-Apr-2026.xlsx',
    comment: 'Q1 final numbers',
    submitted_at: '2026-04-23T10:00:00Z',
  },
};

const UPLOAD_SUCCESS = {
  submission_id: 'dd11ee22-ff33-aa44-bb55-cc6677889900',
  period: '2026-04',
  startup_id: '3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12',
  file_url: 'https://drive.google.com/file/d/stub-upload/view',
  file_name: 'MIS-Apr-2026.xlsx',
  submitted_at: '2026-04-27T15:45:00Z',
};

const HISTORY_ITEMS = [
  {
    submission_id: 'aa11bb22-cc33-dd44-ee55-ff6677889900',
    period: '2026-04',
    file_url: 'https://drive.google.com/file/d/stub/view',
    file_name: 'MIS-Apr-2026.xlsx',
    comment: 'Q1 final numbers',
    submitted_at: '2026-04-23T10:00:00Z',
  },
  {
    submission_id: 'bb22cc33-dd44-ee55-ff66-aa7788990011',
    period: '2026-03',
    file_url: 'https://drive.google.com/file/d/stub2/view',
    file_name: 'MIS-Mar-2026.xlsx',
    comment: null,
    submitted_at: '2026-03-20T09:00:00Z',
  },
];

// ── Scenario control ──────────────────────────────────────────────────────────

type MISGetScenario = 'not_submitted' | 'already_submitted' | 'error_404' | 'error_500';
type MISUploadScenario = 'success' | 'conflict_409' | 'bad_mime_422' | 'too_large_422';

let getScenario: MISGetScenario = 'not_submitted';
let uploadScenario: MISUploadScenario = 'success';

export function setMisMswScenario(s: MISGetScenario) {
  getScenario = s;
}
export function setMisUploadMswScenario(s: MISUploadScenario) {
  uploadScenario = s;
}
export function resetMisMswState() {
  getScenario = 'not_submitted';
  uploadScenario = 'success';
}

// ── Handlers ──────────────────────────────────────────────────────────────────

export const misHandlers = [
  // GET /portfolio/mis — current period + last submission info
  http.get('*/api/v1/portfolio/mis', async ({ request }) => {
    // Ignore the history sub-path handled below
    const url = new URL(request.url);
    if (url.pathname.endsWith('/history')) return;
    await delay(80);
    if (getScenario === 'error_404')
      return HttpResponse.json(
        {
          data: null,
          error: { code: 'not_found', message: 'No startup profile found for caller' },
        },
        { status: 404 },
      );
    if (getScenario === 'error_500')
      return HttpResponse.json(
        { data: null, error: { code: 'internal_error', message: 'An unexpected error occurred' } },
        { status: 500 },
      );
    const data = getScenario === 'already_submitted' ? ALREADY_SUBMITTED : NOT_SUBMITTED;
    return HttpResponse.json({ data, error: null });
  }),

  // GET /portfolio/mis/history
  http.get('*/api/v1/portfolio/mis/history', async () => {
    await delay(80);
    return HttpResponse.json({ data: { items: HISTORY_ITEMS }, error: null });
  }),

  // POST /portfolio/mis — multipart file upload
  http.post('*/api/v1/portfolio/mis', async () => {
    await delay(300);
    if (uploadScenario === 'conflict_409')
      return HttpResponse.json(
        {
          data: null,
          error: {
            code: 'mis_already_submitted',
            message: 'MIS already submitted for this period',
          },
        },
        { status: 409 },
      );
    if (uploadScenario === 'bad_mime_422')
      return HttpResponse.json(
        {
          data: null,
          error: {
            code: 'validation_error',
            message:
              "Unsupported file type 'image/png'. Allowed: Excel, CSV, PDF, or generic binary.",
          },
        },
        { status: 422 },
      );
    if (uploadScenario === 'too_large_422')
      return HttpResponse.json(
        {
          data: null,
          error: { code: 'validation_error', message: 'File too large (21504 KB). Max 20 MB.' },
        },
        { status: 422 },
      );
    return HttpResponse.json({ data: UPLOAD_SUCCESS, error: null });
  }),
];
