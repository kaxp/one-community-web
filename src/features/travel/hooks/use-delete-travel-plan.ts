import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteTravelPlan } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { TravelPlanCancelResponse, TravelPlansResponse } from '@/features/travel/schemas';

interface RollbackContext {
  snapshots: { key: readonly unknown[]; data: TravelPlansResponse | undefined }[];
}

// PRD §7.11.3 + §8.12.4 + §8.12.5 — cancel a travel plan with optimistic
// remove from every cached `qk.travel.plans(*)` variant. On error, restore
// the snapshots so the row reappears. On settle, invalidate to reconcile
// with server truth (active_only=true should drop cancelled rows; the
// active_only=false view marks status="cancelled").
export function useDeleteTravelPlan() {
  const qc = useQueryClient();
  return useMutation<TravelPlanCancelResponse, ApiError, { id: string }, RollbackContext>({
    mutationFn: ({ id }) => deleteTravelPlan(id),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: qk.travel.plansAll });
      const entries = qc.getQueriesData<TravelPlansResponse>({ queryKey: qk.travel.plansAll });
      const snapshots = entries.map(([key, data]) => ({ key, data }));
      for (const [key, data] of entries) {
        if (!data) continue;
        qc.setQueryData<TravelPlansResponse>(
          key,
          data.filter((row) => row.id !== id),
        );
      }
      return { snapshots };
    },
    onError: (_err, _args, ctx) => {
      if (!ctx) return;
      for (const { key, data } of ctx.snapshots) {
        qc.setQueryData(key, data);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.travel.plansAll });
    },
  });
}
