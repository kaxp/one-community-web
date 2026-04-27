import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/errors';
import { postMisUpload } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import {
  buildMISFormData,
  validateMISFile,
  type MISUploadInput,
  type MISUploadResponse,
} from '@/features/mis/schemas';

// PRD §7.9.2 — wraps `useUploadMis` so the mutation accepts the structured
// `MISUploadInput` (period + comment) shape that <ExecutionPanel> drives,
// while transparently picking up the user-selected `File` from the calling
// component's state. Validates the file client-side and throws `ApiError`
// for the same UI surface as a 422 from the wire.
//
// The file pointer is read each render — `mutationFn` closes over the
// latest reference, so the page can swap files without resetting the form.
export function useUploadMisWithFile(file: File | null) {
  const qc = useQueryClient();
  return useMutation<MISUploadResponse, ApiError, MISUploadInput>({
    mutationFn: async (input) => {
      if (!file) {
        throw new ApiError('validation_error', 'Please select a file before uploading.', 422);
      }
      const fileError = validateMISFile(file);
      if (fileError) {
        throw new ApiError('validation_error', fileError, 422);
      }
      const fd = buildMISFormData(input, file);
      return postMisUpload(fd);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.mis.form });
      void qc.invalidateQueries({ queryKey: qk.mis.history });
      void qc.invalidateQueries({ queryKey: qk.admin.summary });
    },
  });
}
