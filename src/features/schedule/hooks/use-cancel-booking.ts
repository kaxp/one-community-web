import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteScheduleBooking } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { CancelResponse } from '@/features/schedule/schemas';

// PRD §7.10.4 + §8.12.4 — cancel a booking. Always refetch bookings + slots
// after settle, regardless of success/failure: GCal delete is best-effort
// (§13 G9), so we trust the server's view of the booking row over any
// optimistic local state.
export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation<CancelResponse, ApiError, { booking_id: string; reason?: string }>({
    mutationFn: ({ booking_id, reason }) => deleteScheduleBooking(booking_id, reason),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.meetings.bookingsAll });
      void qc.invalidateQueries({ queryKey: qk.meetings.slotsAll });
    },
  });
}
