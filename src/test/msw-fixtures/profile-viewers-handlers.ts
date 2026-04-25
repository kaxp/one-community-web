import { http, HttpResponse, type HttpHandler } from 'msw';
import type { ProfileViewerItem } from '@/features/profile-viewers/schemas';

// PRD §7.7.3 fixtures. Cursor-paginated. The default fixture mirrors the
// dedupe behaviour (one row per viewer). The handler also splices an
// `email` + `phone` field into one viewer payload as a deliberate PII
// fixture — the Zod schema in `src/features/profile-viewers/schemas.ts`
// strips them at parse time, so this fixture proves the firewall.

type ErrorEnvelope = { status: number; code: string; message: string; detail?: unknown };

const SEED_ITEMS: ProfileViewerItem[] = [
  {
    viewer: {
      user_id: '3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12',
      name: 'Kapil Sahu',
      role: 'lp',
      organisation: 'Warmup Ventures',
      avatar_url: null,
    },
    viewed_at: '2026-04-25T14:00:10.000Z',
  },
  {
    viewer: {
      user_id: 'a7b3d500-3f21-4a99-9e2f-8a1b3c4d5e6f',
      name: 'Priya Rao',
      role: 'vc',
      organisation: 'NeoVC',
      avatar_url: null,
    },
    viewed_at: '2026-04-24T09:12:45.000Z',
  },
  {
    viewer: {
      user_id: 'c5d6e7f8-1a2b-4c3d-8e4f-5a6b7c8d9e01',
      name: 'Anita Verma',
      role: 'potential_lp',
      organisation: 'Family Office',
      avatar_url: null,
    },
    viewed_at: '2026-04-22T18:45:00.000Z',
  },
  {
    viewer: {
      user_id: 'd1e2f3a4-5b6c-4d7e-8f9a-0b1c2d3e4f50',
      name: 'Rohan Mehra',
      role: 'startup_funded',
      organisation: 'Boltline Robotics',
      avatar_url: null,
    },
    viewed_at: '2026-04-21T11:22:33.000Z',
  },
  {
    viewer: {
      user_id: 'e2f3a4b5-6c7d-4e8f-9a0b-1c2d3e4f5061',
      name: 'Sneha Iyer',
      role: 'partner',
      organisation: 'Channel Partner',
      avatar_url: null,
    },
    viewed_at: '2026-04-20T08:00:00.000Z',
  },
];

let itemsFixture: ProfileViewerItem[] = [];
let leakPiiOnFirstRow = false;
let nextListError: ErrorEnvelope | null = null;

export function resetMswProfileViewersState() {
  itemsFixture = SEED_ITEMS.map((i) => ({
    ...i,
    viewer: { ...i.viewer },
  }));
  leakPiiOnFirstRow = false;
  nextListError = null;
}

resetMswProfileViewersState();

export function setMswProfileViewersFixture(next: ProfileViewerItem[]) {
  itemsFixture = next.map((i) => ({ ...i, viewer: { ...i.viewer } }));
}

// Generates `count` viewers — used by the paginated test scenario.
export function setMswProfileViewersGenerated(count: number) {
  const out: ProfileViewerItem[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = i + 1;
    out.push({
      viewer: {
        user_id: `00000000-0000-4ccc-9999-${idx.toString(16).padStart(12, '0')}`,
        name: `Viewer ${idx}`,
        role: 'lp',
        organisation: `Fund ${idx}`,
        avatar_url: null,
      },
      // 1-minute spacing per row so the relative-time UI varies.
      viewed_at: new Date(Date.UTC(2026, 3, 25, 12, 0, 0) - idx * 60_000).toISOString(),
    });
  }
  itemsFixture = out;
}

export function setMswProfileViewersLeakPii(value: boolean) {
  leakPiiOnFirstRow = value;
}

export function getMswProfileViewers() {
  return itemsFixture.slice();
}

export function queueProfileViewersError(err: ErrorEnvelope) {
  nextListError = err;
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

export const profileViewersHandlers: HttpHandler[] = [
  http.get('*/api/v1/interactions/profile-viewers', ({ request }) => {
    if (nextListError) {
      const err = nextListError;
      nextListError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const url = new URL(request.url);
    const limit = Math.max(
      1,
      Math.min(200, Number.parseInt(url.searchParams.get('limit') ?? '50', 10) || 50),
    );
    const cursor = url.searchParams.get('cursor');
    const startIdx = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
    const endIdx = startIdx + limit;
    const slice = itemsFixture.slice(startIdx, endIdx);
    // Deliberately splice email/phone into the first row when the leak
    // toggle is on, to prove the Zod parser strips them.
    // When the leak toggle is on, splice rogue PII fields onto the first
    // row to prove the Zod parser strips them. Cast through `unknown` so
    // TS doesn't complain about the rogue keys (the schema strips them at
    // parse time anyway).
    const items =
      leakPiiOnFirstRow && slice[0]
        ? [
            {
              ...slice[0],
              viewer: {
                ...slice[0].viewer,
                email: 'should-not-render@example.com',
                phone: '+919999999999',
              } as unknown as ProfileViewerItem['viewer'],
            },
            ...slice.slice(1),
          ]
        : slice;
    const next_cursor = endIdx < itemsFixture.length ? String(endIdx) : null;
    return HttpResponse.json({
      data: { items, next_cursor },
      error: null,
    });
  }),
];
