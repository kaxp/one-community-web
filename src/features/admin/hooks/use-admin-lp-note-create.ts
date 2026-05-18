import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAdminLpNote } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { LpCrmNote, LpCrmNoteCreate } from '@/features/admin/schemas';

interface Args {
  userId: string;
  body: LpCrmNoteCreate;
}

export function useAdminLpNoteCreate() {
  const qc = useQueryClient();
  return useMutation<LpCrmNote, ApiError, Args>({
    mutationFn: ({ userId, body }) => createAdminLpNote(userId, body),
    onSuccess: (_data, { userId }) => {
      void qc.invalidateQueries({ queryKey: qk.admin.lpNotesAll(userId) });
      void qc.invalidateQueries({ queryKey: qk.admin.lpsAll });
    },
  });
}
