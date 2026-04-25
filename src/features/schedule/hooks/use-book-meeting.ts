import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postScheduleBook } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { BookForm, BookRequest, BookResponse } from '@/features/schedule/schemas';

// PRD §7.10.2 + §8.12.4 — book a slot. The form input matches the wire body
// 1:1 (purpose may be `undefined`, which is stripped by the endpoint helper).
// On success: invalidate slots (the booked slot is now unavailable) and
// bookings (new row appears in upcoming list).
export function useBookMeeting() {
  const qc = useQueryClient();
  return useMutation<BookResponse, ApiError, BookForm>({
    mutationFn: (form) => {
      const body: BookRequest = {
        target_id: form.target_id,
        scheduled_at: form.scheduled_at,
        duration_minutes: form.duration_minutes,
        ...(form.purpose !== undefined ? { purpose: form.purpose } : {}),
      };
      return postScheduleBook(body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.meetings.slotsAll });
      void qc.invalidateQueries({ queryKey: qk.meetings.bookingsAll });
    },
    onError: (err) => {
      // PRD §7.10.2 UI flow #4 — on 409 the slot is now unavailable; refetch
      // slots so the grid greys it out before the user picks again.
      if (err.code === 'conflict') {
        void qc.invalidateQueries({ queryKey: qk.meetings.slotsAll });
      }
    },
  });
}
