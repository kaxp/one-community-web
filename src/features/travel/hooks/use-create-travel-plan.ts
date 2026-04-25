import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postTravelPlan } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { TravelPlan, TravelPlanCreateRequest, TripForm } from '@/features/travel/schemas';

// PRD §7.11.1 + §8.12.4 — create a travel plan. Form input maps 1:1 to the
// wire body; an undefined `purpose` is stripped by the endpoint helper.
export function useCreateTravelPlan() {
  const qc = useQueryClient();
  return useMutation<TravelPlan, ApiError, TripForm>({
    mutationFn: (form) => {
      const body: TravelPlanCreateRequest = {
        destination_city: form.destination_city,
        travel_start: form.travel_start,
        travel_end: form.travel_end,
        ...(form.purpose !== undefined ? { purpose: form.purpose } : {}),
      };
      return postTravelPlan(body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.travel.plansAll });
    },
  });
}
