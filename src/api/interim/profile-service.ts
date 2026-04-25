import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { ApiEnvelope } from '@/types/api';
import {
  zProfileView,
  zStartupBlock,
  zLPBlock,
  type ProfileView,
} from '@/features/profile/schemas';
import { zSearchResponse, type SearchResponse } from '@/features/search/schemas';

// PRD §13.2 G1 — interim composer for `GET /profile/{id}`. The backend
// hasn't shipped `modules/profile/router.py` yet; this assembles the same
// `ProfileView` shape from existing endpoints so the rest of the frontend
// can be built against the target contract today.
//
// Composition strategy:
//   1. POST /search { query: targetUserId, limit: 20 } — match by user_id.
//   2. GET /connections (limit=200)        — derive `has_connected` + contact.
//   3. GET /connections/pending (limit=200) — derive `has_requested`.
//
// The flip plan is a single env-var change (VITE_PROFILE_V1_ENABLED=true) and
// deleting this file — the public `getProfileById(id)` signature is preserved.

interface ConnectionsListItem {
  connection_id: string;
  status: string;
  counterpart: {
    user_id: string;
    name: string;
    role?: string;
    organisation?: string | null;
    avatar_url?: string | null;
    contact?: {
      email?: string | null;
      phone?: string | null;
      linkedin_url?: string | null;
    } | null;
  };
}

interface PendingListItem {
  connection_id: string;
  status: string;
  direction: 'outgoing' | 'incoming';
  counterpart: { user_id: string; name: string; role?: string };
}

async function fetchConnections(): Promise<ConnectionsListItem[]> {
  try {
    const resp =
      await apiClient.get<
        ApiEnvelope<{ items: ConnectionsListItem[]; next_cursor: string | null }>
      >('/connections?limit=200');
    return resp.data.data?.items ?? [];
  } catch {
    // Per PRD §13.2 G1: missing /connections shouldn't break profile rendering.
    // Treat as "no known connection" — viewer_interaction flags fall back to false.
    return [];
  }
}

async function fetchPendingConnections(): Promise<PendingListItem[]> {
  try {
    const resp = await apiClient.get<
      ApiEnvelope<{ items: PendingListItem[]; next_cursor: string | null }>
    >('/connections/pending?limit=200');
    return resp.data.data?.items ?? [];
  } catch {
    return [];
  }
}

async function searchByUserId(userId: string): Promise<SearchResponse | null> {
  try {
    const resp = await apiClient.post<ApiEnvelope<SearchResponse>>('/search', {
      query: userId,
      limit: 20,
    });
    if (!resp.data.data) return null;
    return zSearchResponse.parse(resp.data.data);
  } catch {
    return null;
  }
}

function buildView(args: {
  userId: string;
  search: SearchResponse | null;
  connections: ConnectionsListItem[];
  pending: PendingListItem[];
}): ProfileView {
  const { userId, search, connections, pending } = args;

  const accepted = connections.find((c) => c.counterpart.user_id === userId);
  const pendingItem = pending.find((p) => p.counterpart.user_id === userId);

  const hasConnected = !!accepted;
  const hasRequested = !!pendingItem;

  // 1) Try the search hit.
  const searchHit = search?.results.find((r) => r.user_id === userId);
  // 2) Fall back to the connections hit (we still know name/role/avatar).
  const connHit = accepted ?? pendingItem;

  if (!searchHit && !connHit) {
    throw new ApiError('not_found', 'User not found', 404);
  }

  const role =
    searchHit && search
      ? search.target_type === 'startup'
        ? 'startup_funded'
        : 'lp'
      : ((connHit?.counterpart.role as ProfileView['role'] | undefined) ?? 'lp');

  const name = searchHit?.name ?? connHit?.counterpart.name ?? '';
  const avatarUrl =
    (searchHit && 'avatar_url' in searchHit ? searchHit.avatar_url : null) ??
    accepted?.counterpart.avatar_url ??
    null;
  const organisation =
    (searchHit && 'organisation' in searchHit ? searchHit.organisation : null) ??
    accepted?.counterpart.organisation ??
    null;
  const designation =
    searchHit && 'designation' in searchHit ? (searchHit.designation ?? null) : null;

  let startup: ProfileView['startup'] = undefined;
  let lp_profile: ProfileView['lp_profile'] = undefined;
  if (searchHit && search?.target_type === 'startup') {
    startup = zStartupBlock.parse({
      company_name: 'company_name' in searchHit ? (searchHit.company_name ?? null) : null,
      sector: 'sector' in searchHit ? (searchHit.sector ?? null) : null,
      stage: 'stage' in searchHit ? (searchHit.stage ?? null) : null,
      description: 'description' in searchHit ? (searchHit.description ?? null) : null,
      traction: 'traction' in searchHit ? (searchHit.traction ?? null) : null,
      ask_amount_cr:
        'funding_target_cr' in searchHit ? (searchHit.funding_target_cr ?? null) : null,
    });
  } else if (searchHit && search?.target_type === 'lp') {
    lp_profile = zLPBlock.parse({
      fund_name: 'fund_name' in searchHit ? (searchHit.fund_name ?? null) : null,
      aum_cr: 'aum_cr' in searchHit ? (searchHit.aum_cr ?? null) : null,
      cheque_range_min:
        'cheque_range_min' in searchHit ? (searchHit.cheque_range_min ?? null) : null,
      cheque_range_max:
        'cheque_range_max' in searchHit ? (searchHit.cheque_range_max ?? null) : null,
      sectors: 'sectors' in searchHit ? (searchHit.sectors ?? []) : [],
      stages: 'stages' in searchHit ? (searchHit.stages ?? []) : [],
      geography: 'geography' in searchHit ? (searchHit.geography ?? []) : [],
      co_invest_interest:
        'co_invest_interest' in searchHit ? (searchHit.co_invest_interest ?? null) : null,
    });
  }

  const contact: ProfileView['contact'] = accepted?.counterpart.contact
    ? {
        email: accepted.counterpart.contact.email ?? null,
        phone: accepted.counterpart.contact.phone ?? null,
        linkedin_url: accepted.counterpart.contact.linkedin_url ?? null,
      }
    : null;

  return zProfileView.parse({
    user_id: userId,
    role,
    name,
    avatar_url: avatarUrl,
    organisation,
    designation,
    startup: startup ?? null,
    lp_profile: lp_profile ?? null,
    vc_profile: null,
    contact,
    can_request_connect: !hasRequested && !hasConnected,
    viewer_interaction: { has_requested: hasRequested, has_connected: hasConnected },
  });
}

export const ProfileServiceInterim = {
  async getById(id: string): Promise<ProfileView> {
    const [search, connections, pending] = await Promise.all([
      searchByUserId(id),
      fetchConnections(),
      fetchPendingConnections(),
    ]);
    return buildView({ userId: id, search, connections, pending });
  },
};
