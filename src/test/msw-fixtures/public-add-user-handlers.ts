import { http, HttpResponse, type HttpHandler } from 'msw';

// Phase 4 menu Phase C1 (2026-05-28) — POST /api/v1/public/add-user fixtures.

type Scenario = 'received' | 'rate_limited' | 'invalid_email' | 'validation_error' | 'server_error';

let nextScenario: Scenario = 'received';
let lastRequestBody: unknown = null;

export function setPublicAddUserScenario(s: Scenario) {
  nextScenario = s;
}

export function resetPublicAddUserState() {
  nextScenario = 'received';
  lastRequestBody = null;
}

export function getLastPublicAddUserBody() {
  return lastRequestBody;
}

resetPublicAddUserState();

export const publicAddUserHandlers: HttpHandler[] = [
  http.post('*/api/v1/public/add-user', async ({ request }) => {
    lastRequestBody = await request.json();

    if (nextScenario === 'rate_limited') {
      return HttpResponse.json(
        { data: null, error: { code: 'rate_limit_exceeded', message: 'Too many requests' } },
        { status: 429 },
      );
    }

    if (nextScenario === 'invalid_email') {
      return HttpResponse.json(
        { data: null, error: { code: 'invalid_email', message: 'Email format is invalid' } },
        { status: 400 },
      );
    }

    if (nextScenario === 'validation_error') {
      return HttpResponse.json(
        {
          detail: [
            { loc: ['body', 'name'], msg: 'field required', type: 'missing' },
            { loc: ['body', 'role'], msg: 'field required', type: 'missing' },
          ],
        },
        { status: 422 },
      );
    }

    if (nextScenario === 'server_error') {
      return HttpResponse.json(
        {
          data: null,
          error: { code: 'submit_failed', message: 'Could not save your submission.' },
        },
        { status: 503 },
      );
    }

    return HttpResponse.json(
      {
        data: {
          signup_id: 'signup-fixture-uuid-1234',
          status: 'pending',
        },
        error: null,
      },
      { status: 202 },
    );
  }),
];
