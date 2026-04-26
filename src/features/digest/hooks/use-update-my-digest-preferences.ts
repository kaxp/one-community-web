import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMyDigestPreferences } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type {
  MyDigestPreferences,
  MyDigestPreferencesUpdate,
  PreferencesForm,
} from '@/features/digest/me-schemas';

interface RollbackContext {
  previous: MyDigestPreferences | undefined;
}

// PRD §7.13.7 + §8.12.4 — update preferences. Optimistic update of the
// cached preferences object with rollback on error. Invalidation rules:
//   - qk.me.digest.preferences — always (server is the authority after save).
//   - qk.me.digest.recentAll — only when user sets `frequency: 'paused'`,
//     because a paused user won't receive future digests; keeping the list
//     cache fresh reflects the empty-state projection visually.
export function useUpdateMyDigestPreferences() {
  const qc = useQueryClient();
  return useMutation<MyDigestPreferences, ApiError, PreferencesForm, RollbackContext>({
    mutationFn: (form) => {
      // Submit the full form state as the PUT body — backend treats it as
      // PATCH-style (partial keys are fine) but sending the full set is safe
      // and simpler than diff-ing against the cached value.
      const body: MyDigestPreferencesUpdate = {
        frequency: form.frequency,
        interest_tags: form.interest_tags,
        opted_in_wa: form.opted_in_wa,
      };
      return updateMyDigestPreferences(body);
    },
    onMutate: async (form) => {
      await qc.cancelQueries({ queryKey: qk.me.digest.preferences });
      const previous = qc.getQueryData<MyDigestPreferences>(qk.me.digest.preferences);
      if (previous) {
        qc.setQueryData<MyDigestPreferences>(qk.me.digest.preferences, {
          ...previous,
          frequency: form.frequency,
          interest_tags: form.interest_tags,
          opted_in_wa: form.opted_in_wa,
        });
      }
      return { previous };
    },
    onError: (_err, _form, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(qk.me.digest.preferences, ctx.previous);
      }
    },
    onSuccess: (_data, form) => {
      void qc.invalidateQueries({ queryKey: qk.me.digest.preferences });
      if (form.frequency === 'paused') {
        void qc.invalidateQueries({ queryKey: qk.me.digest.recentAll });
      }
    },
  });
}
