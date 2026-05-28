import { http, HttpResponse, type HttpHandler } from 'msw';

// Phase 4 menu Phase C2 follow-up (2026-05-28) — admin WA onboarding queue.

type ErrorEnvelope = { status: number; code: string; message: string };

type OnboardingSource = 'public_signup' | 'wa_referral';
type OnboardingFixture = {
  id: string;
  source: OnboardingSource;
  source_channel: string | null;
  submitter_name: string | null;
  submitter_role: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_role_or_category: string | null;
  organisation: string | null;
  linkedin_url: string | null;
  designation: string | null;
  city: string | null;
  website: string | null;
  address: string | null;
  message: string | null;
  status: string;
  created_at: string;
  review_note: string | null;
};

const PENDING_SEED: OnboardingFixture[] = [
  {
    id: '00000000-0000-4000-8000-000000000c01',
    source: 'public_signup',
    source_channel: 'wa_join_community',
    submitter_name: null,
    submitter_role: null,
    contact_name: 'Anand Mehta',
    contact_phone: '+919800000001',
    contact_email: 'anand@example.com',
    contact_role_or_category: 'investor',
    organisation: 'Aurora Capital',
    linkedin_url: 'https://linkedin.com/in/anand',
    designation: null,
    city: 'Bengaluru',
    website: null,
    address: null,
    message: 'Looking to back early-stage Indian SaaS.',
    status: 'pending',
    created_at: '2026-05-28T09:00:00Z',
    review_note: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000c02',
    source: 'wa_referral',
    source_channel: 'wa_refer',
    submitter_name: 'Priya Nair',
    submitter_role: 'lp',
    contact_name: 'Rohan Sharma',
    contact_phone: '+919800000002',
    contact_email: 'rohan@example.com',
    contact_role_or_category: 'vc',
    organisation: 'BlueAcre',
    linkedin_url: null,
    designation: 'Partner',
    city: null,
    website: 'https://blueacre.example',
    address: 'Mumbai',
    message: null,
    status: 'pending',
    created_at: '2026-05-27T14:30:00Z',
    review_note: null,
  },
];

const HISTORY_SEED: OnboardingFixture[] = [
  {
    ...PENDING_SEED[0]!,
    id: '00000000-0000-4000-8000-000000000c03',
    contact_name: 'Already Approved Co',
    status: 'approved',
    review_note: null,
  },
  {
    ...PENDING_SEED[1]!,
    id: '00000000-0000-4000-8000-000000000c04',
    contact_name: 'Was Rejected',
    status: 'rejected',
    review_note: 'Wrong profile fit.',
  },
];

let nextListError: ErrorEnvelope | null = null;
let nextApproveError: ErrorEnvelope | null = null;
let nextRejectError: ErrorEnvelope | null = null;
let lastApproveCall: { source: string; row_id: string } | null = null;
let lastRejectCall: { source: string; row_id: string; note: string | null } | null = null;

export function resetMswAdminWaOnboardingState() {
  nextListError = null;
  nextApproveError = null;
  nextRejectError = null;
  lastApproveCall = null;
  lastRejectCall = null;
}

export function queueAdminWaOnboardingListError(err: ErrorEnvelope) {
  nextListError = err;
}

export function queueAdminWaOnboardingApproveError(err: ErrorEnvelope) {
  nextApproveError = err;
}

export function queueAdminWaOnboardingRejectError(err: ErrorEnvelope) {
  nextRejectError = err;
}

export function getLastAdminWaOnboardingApprove() {
  return lastApproveCall;
}

export function getLastAdminWaOnboardingReject() {
  return lastRejectCall;
}

resetMswAdminWaOnboardingState();

function errorBody(err: ErrorEnvelope) {
  return { data: null, error: { code: err.code, message: err.message } };
}

export const adminWaOnboardingHandlers: HttpHandler[] = [
  http.get('*/api/v1/admin/onboarding/whatsapp', ({ request }) => {
    if (nextListError) {
      const err = nextListError;
      nextListError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const url = new URL(request.url);
    const view = url.searchParams.get('view') ?? 'pending';
    const items = view === 'history' ? HISTORY_SEED : PENDING_SEED;
    return HttpResponse.json({ data: { items }, error: null });
  }),

  http.post('*/api/v1/admin/onboarding/whatsapp/:source/:row_id/approve', ({ params }) => {
    if (nextApproveError) {
      const err = nextApproveError;
      nextApproveError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    lastApproveCall = {
      source: String(params['source']),
      row_id: String(params['row_id']),
    };
    const source = String(params['source']);
    return HttpResponse.json({
      data: {
        row_id: String(params['row_id']),
        source,
        status: source === 'wa_referral' ? 'converted' : 'approved',
        user_id: '00000000-0000-4000-8000-000000000d01',
        role: 'potential_lp',
      },
      error: null,
    });
  }),

  http.post(
    '*/api/v1/admin/onboarding/whatsapp/:source/:row_id/reject',
    async ({ params, request }) => {
      if (nextRejectError) {
        const err = nextRejectError;
        nextRejectError = null;
        return HttpResponse.json(errorBody(err), { status: err.status });
      }
      const body = (await request.json().catch(() => ({}))) as { note?: string | null };
      lastRejectCall = {
        source: String(params['source']),
        row_id: String(params['row_id']),
        note: body?.note ?? null,
      };
      return HttpResponse.json({
        data: {
          row_id: String(params['row_id']),
          source: String(params['source']),
          status: 'rejected',
        },
        error: null,
      });
    },
  ),
];
