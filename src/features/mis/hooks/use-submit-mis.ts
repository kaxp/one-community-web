import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { postMisUpload } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { MISUploadResponse } from '@/features/mis/schemas';

// PRD §7.9.2 — multipart MIS file upload.
// Accepts a pre-built FormData (use buildMISFormData from mis/schemas).
// Invalidates mis.form (so last_submission refreshes) and admin.summary.
export function useUploadMis() {
  const qc = useQueryClient();
  return useMutation<MISUploadResponse, ApiError, FormData>({
    mutationFn: postMisUpload,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.mis.form });
      void qc.invalidateQueries({ queryKey: qk.mis.history });
      void qc.invalidateQueries({ queryKey: qk.admin.summary });
    },
  });
}

/** @deprecated Use `useUploadMis` instead. The period parameter is now part of FormData. */
export function useSubmitMis(_period: string) {
  return useUploadMis();
}
