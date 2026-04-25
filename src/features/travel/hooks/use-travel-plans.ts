import { useQuery } from '@tanstack/react-query';
import { getTravelPlans } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { TravelPlansResponse } from '@/features/travel/schemas';

interface Args {
  activeOnly: boolean;
}

// PRD §7.11.2 — `GET /travel/plans?active_only=...`. Short staleTime so a
// fresh add/cancel is reflected quickly; the mutations also invalidate
// `qk.travel.plansAll`.
export function useTravelPlans({ activeOnly }: Args) {
  return useQuery<TravelPlansResponse, ApiError>({
    queryKey: qk.travel.plans(activeOnly),
    queryFn: () => getTravelPlans({ active_only: activeOnly }),
    staleTime: 30_000,
  });
}
