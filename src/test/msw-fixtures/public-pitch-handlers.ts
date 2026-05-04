import { http, HttpResponse, type HttpHandler } from 'msw';

// Stage 6 S8 — POST /api/v1/public/pitch fixtures.

type Scenario = 'received' | 'duplicate' | 'rate_limited' | 'validation_error' | 'server_error';

let nextScenario: Scenario = 'received';
let lastRequestBody: unknown = null;

export function setPublicPitchScenario(s: Scenario) {
  nextScenario = s;
}

export function resetPublicPitchState() {
  nextScenario = 'received';
  lastRequestBody = null;
}

export function getLastPublicPitchBody() {
  return lastRequestBody;
}

resetPublicPitchState();

export const publicPitchHandlers: HttpHandler[] = [
  http.post('*/api/v1/public/pitch', async ({ request }) => {
    lastRequestBody = await request.json();

    if (nextScenario === 'rate_limited') {
      return HttpResponse.json(
        { data: null, error: { code: 'rate_limit_exceeded', message: 'Too many requests' } },
        { status: 429 },
      );
    }

    if (nextScenario === 'validation_error') {
      return HttpResponse.json(
        {
          detail: [
            {
              loc: ['body', 'email'],
              msg: 'value is not a valid email address',
              type: 'value_error',
            },
            { loc: ['body', 'company_name'], msg: 'field required', type: 'missing' },
          ],
        },
        { status: 422 },
      );
    }

    if (nextScenario === 'server_error') {
      return HttpResponse.json(
        { data: null, error: { code: 'internal_error', message: 'Internal server error' } },
        { status: 503 },
      );
    }

    const status = nextScenario === 'duplicate' ? 'duplicate' : 'received';
    return HttpResponse.json(
      {
        data: {
          pitch_id: 'pitch-fixture-uuid-1234',
          status,
          drive_folder_id: status === 'received' ? 'drive-folder-fixture' : null,
        },
        error: null,
      },
      { status: 202 },
    );
  }),
];
