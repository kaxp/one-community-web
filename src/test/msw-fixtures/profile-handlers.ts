import { http, HttpResponse, type HttpHandler } from 'msw';
import type { ProfileView } from '@/features/profile/schemas';

// Three viewer states from PRD §7.5.1, scenario-switchable like search-handlers.ts.
//   - 'no_connection'         — viewer has never interacted (default).
//   - 'pending'               — request created, awaiting admin approval.
//   - 'accepted_with_contact' — connection accepted, contact unlocked.
//   - 'forbidden'             — backend returned 403 (e.g. partner viewing admin).
//   - 'not_found'             — 404.
//   - 'error_500'             — generic 500.
type ProfileScenario =
  | 'no_connection'
  | 'pending'
  | 'accepted_with_contact'
  | 'forbidden'
  | 'not_found'
  | 'error_500';

let scenario: ProfileScenario = 'no_connection';

export function setMswProfileScenario(s: ProfileScenario) {
  scenario = s;
}

export function resetMswProfileState() {
  scenario = 'no_connection';
}

const STARTUP_FIXTURE_ID = '11111111-1111-4000-8000-000000000001';
const STARTUP_FIXTURE_BASE: Pick<
  ProfileView,
  'user_id' | 'role' | 'name' | 'avatar_url' | 'organisation' | 'designation' | 'startup'
> = {
  user_id: STARTUP_FIXTURE_ID,
  role: 'startup_funded',
  name: 'Kapil Sahu',
  avatar_url: null,
  organisation: 'Acme Technologies',
  designation: 'Founder',
  startup: {
    company_name: 'Acme Technologies',
    sector: 'fintech',
    stage: 'seed',
    description: 'We help banks automate KYC via agentic LLM workflows.',
    founding_year: 2024,
    team_size: 12,
    traction: '3 pilot banks, ₹2Cr ARR',
    ask_amount_cr: 10.0,
    website_url: 'https://acme.ai',
  },
};

const NO_CONNECTION: ProfileView = {
  ...STARTUP_FIXTURE_BASE,
  contact: null,
  can_request_connect: true,
  viewer_interaction: { has_requested: false, has_connected: false },
};

const PENDING: ProfileView = {
  ...STARTUP_FIXTURE_BASE,
  contact: null,
  can_request_connect: false,
  viewer_interaction: { has_requested: true, has_connected: false },
};

const ACCEPTED_WITH_CONTACT: ProfileView = {
  ...STARTUP_FIXTURE_BASE,
  contact: {
    email: 'kapil@acme.ai',
    phone: '+919876543210',
    linkedin_url: 'https://linkedin.com/in/kapilsahu',
  },
  can_request_connect: false,
  viewer_interaction: { has_requested: true, has_connected: true },
};

const FIXTURES: Record<
  Exclude<ProfileScenario, 'forbidden' | 'not_found' | 'error_500'>,
  ProfileView
> = {
  no_connection: NO_CONNECTION,
  pending: PENDING,
  accepted_with_contact: ACCEPTED_WITH_CONTACT,
};

// Helpers for tests that exercise the §13 G1 interim path. Both connections
// endpoints return scenario-driven fixtures so the composer derives the right
// `viewer_interaction` flags + `contact`. POST /search is unchanged — its
// catalogue (search-fixtures.ts) is augmented to include user_ids in the
// haystack so passing the UUID as the `query` returns the matching item.
const ACCEPTED_CONNECTIONS_ITEM = {
  connection_id: 'aa11bb22-cc33-dd44-ee55-ff6677889900',
  status: 'accepted',
  counterpart: {
    user_id: STARTUP_FIXTURE_ID,
    name: 'Kapil Sahu',
    role: 'startup_funded',
    organisation: 'Acme Technologies',
    avatar_url: null,
    contact: {
      email: 'kapil@acme.ai',
      phone: '+919876543210',
      linkedin_url: 'https://linkedin.com/in/kapilsahu',
    },
  },
  created_at: '2026-04-10T10:30:00Z',
  responded_at: '2026-04-11T08:01:00Z',
};

const PENDING_CONNECTION_ITEM = {
  connection_id: 'bb22cc33-dd44-ee55-ff66-001122334455',
  status: 'pending_admin' as const,
  direction: 'outgoing' as const,
  counterpart: {
    user_id: STARTUP_FIXTURE_ID,
    name: 'Kapil Sahu',
    role: 'startup_funded',
    organisation: 'Acme Technologies',
    avatar_url: null,
  },
  message: null as string | null,
  created_at: '2026-04-22T10:30:00Z',
  responded_at: null as string | null,
};

export const profileHandlers: HttpHandler[] = [
  // Real endpoint — exercised when VITE_PROFILE_V1_ENABLED=true.
  http.get('*/api/v1/profile/:id', ({ params }) => {
    if (scenario === 'error_500') {
      return HttpResponse.json(
        { data: null, error: { code: 'internal_error', message: 'Server error' } },
        { status: 500 },
      );
    }
    if (scenario === 'forbidden') {
      return HttpResponse.json(
        { data: null, error: { code: 'forbidden', message: 'You do not have access' } },
        { status: 403 },
      );
    }
    if (scenario === 'not_found') {
      return HttpResponse.json(
        { data: null, error: { code: 'not_found', message: 'User not found' } },
        { status: 404 },
      );
    }
    const fixture = FIXTURES[scenario];
    return HttpResponse.json({
      data: { ...fixture, user_id: String(params.id) },
      error: null,
    });
  }),

  // Connections list — used by the §13 G1 interim composer to derive
  // `contact` + `has_connected`. Returns the fixture row only when the
  // accepted scenario is active.
  http.get('*/api/v1/connections', () => {
    if (scenario === 'accepted_with_contact') {
      return HttpResponse.json({
        data: { items: [ACCEPTED_CONNECTIONS_ITEM], next_cursor: null },
        error: null,
      });
    }
    return HttpResponse.json({ data: { items: [], next_cursor: null }, error: null });
  }),

  // Pending connections — drives `has_requested`.
  http.get('*/api/v1/connections/pending', () => {
    if (scenario === 'pending') {
      return HttpResponse.json({
        data: { items: [PENDING_CONNECTION_ITEM], next_cursor: null },
        error: null,
      });
    }
    return HttpResponse.json({ data: { items: [], next_cursor: null }, error: null });
  }),
];
