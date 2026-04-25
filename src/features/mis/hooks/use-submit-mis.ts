import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { postMisSubmit } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import { buildMISRequest, type MISFormInput, type MISSubmitResponse } from '@/features/mis/schemas';

// PRD §7.9.2 + §8.12.4 — accepts the local form input, builds the wire body
// (with strict raw_data) inside the mutation, then POSTs. Invalidates
// `qk.mis.form` (so already_submitted flips true) and `qk.admin.summary`
// (admin's mis_status badge updates).
export function useSubmitMis(period: string) {
  const qc = useQueryClient();
  return useMutation<MISSubmitResponse, ApiError, MISFormInput>({
    mutationFn: (form) => postMisSubmit(buildMISRequest(period, form)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.mis.form });
      void qc.invalidateQueries({ queryKey: qk.admin.summary });
    },
  });
}
