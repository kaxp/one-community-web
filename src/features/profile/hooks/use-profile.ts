import { useQuery } from '@tanstack/react-query';
import { getProfileById } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { ProfileView } from '@/features/profile/schemas';

// PRD §7.5.1 — `GET /profile/{id}` (gap-flagged via §13.2 G1). The endpoint
// function in `@/api/endpoints` branches on `VITE_PROFILE_V1_ENABLED`; this
// hook is unaware of which path serves the response.
export function useProfile(id: string | undefined) {
  return useQuery<ProfileView, ApiError>({
    queryKey: id ? qk.profile.byId(id) : ['profile', 'byId', 'noop'],
    queryFn: () => getProfileById(id as string),
    enabled: !!id,
    staleTime: 30_000,
  });
}
