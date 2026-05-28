import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAdminLpNote } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';

interface Args {
  userId: string;
  noteId: string;
}

export function useAdminLpNoteDelete() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, Args>({
    mutationFn: ({ userId, noteId }) => deleteAdminLpNote(userId, noteId),
    onSuccess: (_data, { userId }) => {
      void qc.invalidateQueries({ queryKey: qk.admin.lpNotesAll(userId) });
      void qc.invalidateQueries({ queryKey: qk.admin.lpsAll });
    },
  });
}
