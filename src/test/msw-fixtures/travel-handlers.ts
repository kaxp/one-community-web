import { http, HttpResponse, type HttpHandler } from 'msw';
import type { TravelPlan } from '@/features/travel/schemas';

// PRD §7.11 fixtures. Stateful — POST appends to the in-memory list,
// DELETE flips status to 'cancelled', and the GET handler honours
// `active_only` (status='active' AND travel_end >= today) per §7.11.2.

type ErrorEnvelope = { status: number; code: string; message: string; detail?: unknown };

const OWNER_USER_ID = '00000000-0000-4000-8000-000000000004';

// Today fixture used by active_only filtering. Tests can override via
// `setMswTravelToday(...)` to exercise the past/future boundary.
let today = '2026-04-25';

const SEED_PLANS: TravelPlan[] = [
  {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    user_id: OWNER_USER_ID,
    destination_city: 'Bengaluru',
    travel_start: '2026-05-10',
    travel_end: '2026-05-12',
    purpose: 'Investor meetings',
    status: 'active',
    alerts_sent: false,
  },
  {
    id: 'a1b2c3d4-0000-4000-8000-000000000002',
    user_id: OWNER_USER_ID,
    destination_city: 'Mumbai',
    travel_start: '2026-06-01',
    travel_end: '2026-06-04',
    purpose: 'Founder syncs',
    status: 'active',
    alerts_sent: false,
  },
  {
    id: 'a1b2c3d4-0000-4000-8000-000000000003',
    user_id: OWNER_USER_ID,
    destination_city: 'Delhi',
    travel_start: '2026-01-10',
    travel_end: '2026-01-12',
    purpose: 'Past trip',
    status: 'active',
    alerts_sent: true,
  },
];

let plansFixture: TravelPlan[] = [];
let homeCityFixture = 'Mumbai';
let nextListError: ErrorEnvelope | null = null;
let nextCreateError: ErrorEnvelope | null = null;
let nextDeleteError: ErrorEnvelope | null = null;
let nextHomeCityError: ErrorEnvelope | null = null;
let createCounter = 100;

export function resetMswTravelState() {
  plansFixture = SEED_PLANS.map((p) => ({ ...p }));
  homeCityFixture = 'Mumbai';
  nextListError = null;
  nextCreateError = null;
  nextDeleteError = null;
  nextHomeCityError = null;
  createCounter = 100;
  today = '2026-04-25';
}

resetMswTravelState();

export function setMswTravelPlansFixture(next: TravelPlan[]) {
  plansFixture = next.map((p) => ({ ...p }));
}

export function setMswTravelToday(value: string) {
  today = value;
}

export function setMswHomeCityFixture(value: string) {
  homeCityFixture = value;
}

export function getMswTravelPlans() {
  return plansFixture.slice();
}

export function getMswHomeCity() {
  return homeCityFixture;
}

export function queueTravelListError(err: ErrorEnvelope) {
  nextListError = err;
}

export function queueTravelCreateError(err: ErrorEnvelope) {
  nextCreateError = err;
}

export function queueTravelDeleteError(err: ErrorEnvelope) {
  nextDeleteError = err;
}

export function queueHomeCityError(err: ErrorEnvelope) {
  nextHomeCityError = err;
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

export const travelHandlers: HttpHandler[] = [
  // PRD §7.11.2 — list. Default active_only=true.
  http.get('*/api/v1/travel/plans', ({ request }) => {
    if (nextListError) {
      const err = nextListError;
      nextListError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const url = new URL(request.url);
    const param = url.searchParams.get('active_only');
    const activeOnly = param === null ? true : param !== 'false';
    const out = activeOnly
      ? plansFixture.filter((p) => p.status === 'active' && p.travel_end >= today)
      : plansFixture.slice();
    return HttpResponse.json({ data: out, error: null });
  }),

  // PRD §7.11.1 — create. travel_end < travel_start → 422.
  http.post('*/api/v1/travel/plans', async ({ request }) => {
    if (nextCreateError) {
      const err = nextCreateError;
      nextCreateError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const body = (await request.json()) as {
      destination_city?: string;
      travel_start?: string;
      travel_end?: string;
      purpose?: string;
    };
    if (
      !body.destination_city ||
      !body.travel_start ||
      !body.travel_end ||
      body.travel_end < body.travel_start
    ) {
      return HttpResponse.json(
        errorBody({
          status: 422,
          code: 'validation_error',
          message: 'Validation failed',
          detail: [
            {
              loc: ['body', 'travel_end'],
              msg: 'travel_end must be on or after travel_start',
              type: 'value_error',
            },
          ],
        }),
        { status: 422 },
      );
    }
    createCounter += 1;
    const id = `a1b2c3d4-0000-4000-8000-${createCounter.toString(16).padStart(12, '0')}`;
    const plan: TravelPlan = {
      id,
      user_id: OWNER_USER_ID,
      destination_city: body.destination_city,
      travel_start: body.travel_start,
      travel_end: body.travel_end,
      purpose: body.purpose ?? null,
      status: 'active',
      alerts_sent: false,
    };
    plansFixture.unshift(plan);
    return HttpResponse.json({ data: plan, error: null });
  }),

  // PRD §7.11.3 — cancel.
  http.delete('*/api/v1/travel/plans/:id', ({ params }) => {
    if (nextDeleteError) {
      const err = nextDeleteError;
      nextDeleteError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const id = String(params.id);
    const idx = plansFixture.findIndex((p) => p.id === id);
    if (idx === -1) {
      return HttpResponse.json(
        errorBody({ status: 404, code: 'not_found', message: 'Travel plan not found' }),
        { status: 404 },
      );
    }
    const row = plansFixture[idx]!;
    plansFixture[idx] = { ...row, status: 'cancelled' };
    return HttpResponse.json({
      data: { id, status: 'cancelled' as const },
      error: null,
    });
  }),

  // PRD §7.11.4 — home city.
  http.put('*/api/v1/travel/home-city', async ({ request }) => {
    if (nextHomeCityError) {
      const err = nextHomeCityError;
      nextHomeCityError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const body = (await request.json()) as { home_city?: string };
    const value = (body.home_city ?? '').trim();
    if (!value) {
      return HttpResponse.json(
        errorBody({
          status: 422,
          code: 'validation_error',
          message: 'home_city must be 1-200 chars',
        }),
        { status: 422 },
      );
    }
    homeCityFixture = value;
    return HttpResponse.json({
      data: { user_id: OWNER_USER_ID, home_city: value },
      error: null,
    });
  }),
];
