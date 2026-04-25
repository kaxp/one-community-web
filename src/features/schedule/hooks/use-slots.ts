import { useQuery } from '@tanstack/react-query';
import { getScheduleSlots } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { SlotsResponse } from '@/features/schedule/schemas';

interface Args {
  fromDate: string;
  days: number;
}

// PRD §7.10.1 — `GET /schedule/slots`. Short staleTime so a recent book/cancel
// triggers a fresh fetch quickly; the mutations also invalidate qk.meetings.slotsAll.
export function useSlots({ fromDate, days }: Args) {
  return useQuery<SlotsResponse, ApiError>({
    queryKey: qk.meetings.slots(fromDate, days),
    queryFn: () => getScheduleSlots({ fromDate, days }),
    staleTime: 30_000,
  });
}
