import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/api/errors';
import { getStartupProfile } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { StartupProfileResult } from '@/features/pitch/schemas';

// PRD §7.3.2 — 404 is a domain signal ("no profile yet → show create form"),
// NOT an ErrorState surface. Catch the ApiError-with-`not_found` and fold it
// into the discriminated `{ status: 'missing' }` result so route code stays
// declarative.
export function useStartupProfile() {
  return useQuery<StartupProfileResult, ApiError>({
    queryKey: qk.pitch.profile,
    queryFn: async () => {
      try {
        const data = await getStartupProfile();
        return { status: 'present', data } satisfies StartupProfileResult;
      } catch (err) {
        if (err instanceof ApiError && err.code === 'not_found') {
          return { status: 'missing' } satisfies StartupProfileResult;
        }
        throw err;
      }
    },
    staleTime: 60_000,
  });
}
