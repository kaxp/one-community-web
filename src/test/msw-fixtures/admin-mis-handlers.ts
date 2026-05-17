import { http, HttpResponse, type HttpHandler } from 'msw';
import type { MISOverviewItem } from '@/features/admin/schemas';

// Phase 7.2.g fixtures — admin MIS overview.

type ErrorEnvelope = { status: number; code: string; message: string };

const SEED: MISOverviewItem[] = [
  {
    id: '00000000-0000-4000-8000-000000000b01',
    startup_id: '00000000-0000-4000-8000-000000000c01',
    user_id: '00000000-0000-4000-8000-000000000d01',
    company_name: 'Greenleaf Agritech',
    period: '2026-04',
    submitted_at: '2026-04-30T10:00:00Z',
    file_url: 'https://drive.google.com/file/d/mis-file-1/view',
    file_name: 'greenleaf-apr-2026.pdf',
    comment: 'Strong month; new partnership signed.',
    revenue: 450000,
    burn: 200000,
    runway_months: 18,
    headcount: 12,
    notion_page_id: 'notion-mis-abc',
    drive_folder_id: 'drive-mis-abc',
  },
  {
    id: '00000000-0000-4000-8000-000000000b02',
    startup_id: '00000000-0000-4000-8000-000000000c02',
    user_id: '00000000-0000-4000-8000-000000000d02',
    company_name: 'PayKart',
    period: '2026-04',
    submitted_at: '2026-04-29T08:30:00Z',
    file_url: null,
    file_name: null,
    comment: null,
    revenue: 120000,
    burn: 95000,
    runway_months: 8,
    headcount: 6,
    notion_page_id: null,
    drive_folder_id: 'drive-mis-xyz',
  },
  {
    id: '00000000-0000-4000-8000-000000000b03',
    startup_id: '00000000-0000-4000-8000-000000000c03',
    user_id: null,
    company_name: 'NullMetrics Ltd',
    period: '2026-04',
    submitted_at: '2026-04-28T12:00:00Z',
    file_url: null,
    file_name: null,
    comment: null,
    revenue: null,
    burn: null,
    runway_months: null,
    headcount: null,
    notion_page_id: null,
    drive_folder_id: null,
  },
];

let nextListError: ErrorEnvelope | null = null;

export function resetMswAdminMisState() {
  nextListError = null;
}

resetMswAdminMisState();

export function queueAdminMisListError(err: ErrorEnvelope) {
  nextListError = err;
}

function errorBody(err: ErrorEnvelope) {
  return { data: null, error: { code: err.code, message: err.message } };
}

export const adminMisHandlers: HttpHandler[] = [
  http.get('*/api/v1/admin/mis-overview', ({ request }) => {
    if (nextListError) {
      const err = nextListError;
      nextListError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const url = new URL(request.url);
    const range = url.searchParams.get('range') ?? 'monthly';
    const cursor = url.searchParams.get('cursor');

    // Cursor passthrough: any cursor returns an empty second page.
    if (cursor) {
      return HttpResponse.json({
        data: { items: [], next_cursor: null, pending: [] },
        error: null,
      });
    }

    // yearly returns all, monthly/quarterly return 2 rows — allows range-filter tests.
    const count = range === 'yearly' ? SEED.length : 2;
    return HttpResponse.json({
      data: { items: SEED.slice(0, count), next_cursor: null, pending: [] },
      error: null,
    });
  }),
];
