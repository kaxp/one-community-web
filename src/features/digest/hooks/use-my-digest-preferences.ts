import { useQuery } from '@tanstack/react-query';
import { getMyDigestPreferences } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { MyDigestPreferences } from '@/features/digest/me-schemas';

// PRD §7.13.6 — caller's digest preferences. Cached 5 min + refetch on focus
// (PRD §7.13.6 data transformation note).
export function useMyDigestPreferences() {
  return useQuery<MyDigestPreferences, ApiError>({
    queryKey: qk.me.digest.preferences,
    queryFn: () => getMyDigestPreferences(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
}
