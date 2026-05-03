import { http, HttpResponse, type HttpHandler } from 'msw';
import type { InboundPitch, InboundPitchDetail } from '@/features/admin/schemas';

// Phase 7.2.f fixtures — inbound pitches list + drawer.

type ErrorEnvelope = { status: number; code: string; message: string };

const INBOUND_SEED: InboundPitch[] = [
  {
    id: '00000000-0000-4000-8000-000000000aa1',
    company_name: 'Greenleaf Agritech',
    ai_pitch_score: 82,
    ai_pitch_summary: 'Strong agritech play with solid traction in tier-2 markets.',
    ai_signal: 'strong',
    created_at: '2026-04-28T09:00:00Z',
    notion_page_id: 'notion-abc123',
    drive_folder_id: 'drive-folder-abc',
    source_channel: 'web_form',
  },
  {
    id: '00000000-0000-4000-8000-000000000aa2',
    company_name: 'PayKart',
    ai_pitch_score: 61,
    ai_pitch_summary: 'Fintech in crowded space; differentiation unclear.',
    ai_signal: 'moderate',
    created_at: '2026-04-25T14:30:00Z',
    notion_page_id: null,
    drive_folder_id: 'drive-folder-xyz',
    source_channel: 'email',
  },
  {
    id: '00000000-0000-4000-8000-000000000aa3',
    company_name: 'Brickly',
    ai_pitch_score: 34,
    ai_pitch_summary: null,
    ai_signal: 'weak',
    created_at: '2026-04-20T10:00:00Z',
    notion_page_id: null,
    drive_folder_id: null,
    source_channel: 'email',
  },
  {
    id: '00000000-0000-4000-8000-000000000aa4',
    company_name: 'NullScore Co',
    ai_pitch_score: null,
    ai_pitch_summary: null,
    ai_signal: null,
    created_at: '2026-04-15T08:00:00Z',
    notion_page_id: null,
    drive_folder_id: null,
    source_channel: 'web_form',
  },
];

const DETAIL_SEED: InboundPitchDetail = {
  id: '00000000-0000-4000-8000-000000000aa1',
  company_name: 'Greenleaf Agritech',
  ai_pitch_score: 82,
  ai_pitch_summary: 'Strong agritech play with solid traction in tier-2 markets.',
  ai_signal: 'strong',
  created_at: '2026-04-28T09:00:00Z',
  notion_page_id: 'notion-abc123',
  drive_folder_id: 'drive-folder-abc',
  source_channel: 'web_form',
  founder_name: 'Priya Nair',
  founder_email: 'priya@greenleaf.in',
  founder_phone: '+919876543210',
  founder_linkedin: 'https://linkedin.com/in/priyanair',
  sector: 'agritech',
  stage: 'seed',
  founding_year: 2022,
  team_size: 12,
  website_url: 'https://greenleaf.in',
  description: 'We connect tier-2 farmers to premium buyers via mobile-first supply chain tech.',
  one_liner: 'Connecting farmers to buyers, cutting the middleman.',
  revenue_model: 'SaaS + transaction fee',
  revenue_monthly: 450000,
  burn_monthly: 200000,
  runway_months: 18,
  current_balance_inr: 3600000,
  growth_pct: 22,
  gross_margin_pct: 58,
  customer_count: 320,
  funding_target_cr: 3,
  pitch_deck_url: 'https://drive.google.com/file/d/deck123/view',
  evaluation: {
    signal: 'strong',
    summary: 'Strong agritech play with solid traction in tier-2 markets.',
    strengths: ['Proven traction with 320 customers', 'Asset-light model'],
    concerns: ['High competition from established players'],
    recommended_lp_types: ['Agri-focused VC', 'Impact investor'],
    financial_health: 'Healthy burn rate with 18 months runway.',
    market_position: 'Well-positioned in underserved tier-2 markets.',
    competitive_landscape: 'Competing with Ninjacart, DeHaat; differentiated by mobile-first UX.',
    team_assessment: 'Strong founding team with domain expertise.',
    key_risks: ['Regulatory risk in direct procurement', 'Monsoon-dependent revenue'],
    indian_ecosystem_signals: 'PM-KISAN alignment; eligible for NABARD grants.',
    recommendation_rationale: 'Recommend introduction to agri-focused LPs for seed round.',
  },
};

// Separate detail seed with a null evaluation to test empty-eval state.
const DETAIL_SEED_NO_EVAL: InboundPitchDetail = {
  ...DETAIL_SEED,
  id: '00000000-0000-4000-8000-000000000aa2',
  company_name: 'PayKart',
  evaluation: null,
};

let nextListError: ErrorEnvelope | null = null;
let nextDetailError: ErrorEnvelope | null = null;

export function resetMswAdminPitchesState() {
  nextListError = null;
  nextDetailError = null;
}

resetMswAdminPitchesState();

export function queueAdminPitchesListError(err: ErrorEnvelope) {
  nextListError = err;
}

export function queueAdminPitchDetailError(err: ErrorEnvelope) {
  nextDetailError = err;
}

function errorBody(err: ErrorEnvelope) {
  return { data: null, error: { code: err.code, message: err.message } };
}

export const adminPitchesHandlers: HttpHandler[] = [
  http.get('*/api/v1/admin/pitches/inbound', ({ request }) => {
    if (nextListError) {
      const err = nextListError;
      nextListError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const url = new URL(request.url);
    const range = url.searchParams.get('range') ?? 'weekly';
    const cursor = url.searchParams.get('cursor');
    if (cursor) {
      return HttpResponse.json({ data: { items: [], next_cursor: null }, error: null });
    }
    // Return a subset per range so tests can verify the URL param flows.
    const count = range === 'weekly' ? 2 : range === 'monthly' ? 3 : INBOUND_SEED.length;
    return HttpResponse.json({
      data: { items: INBOUND_SEED.slice(0, count), next_cursor: null },
      error: null,
    });
  }),

  http.get('*/api/v1/admin/pitches/:startupId', ({ params }) => {
    if (nextDetailError) {
      const err = nextDetailError;
      nextDetailError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const id = params['startupId'];
    if (id === DETAIL_SEED.id) {
      return HttpResponse.json({ data: DETAIL_SEED, error: null });
    }
    if (id === DETAIL_SEED_NO_EVAL.id) {
      return HttpResponse.json({ data: DETAIL_SEED_NO_EVAL, error: null });
    }
    return HttpResponse.json(
      errorBody({ status: 404, code: 'not_found', message: 'Startup not found or not inbound' }),
      { status: 404 },
    );
  }),
];
