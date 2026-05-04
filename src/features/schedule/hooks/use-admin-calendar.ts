import { useQuery } from '@tanstack/react-query';
import { getAdminCalendar } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { AdminCalendarResponse } from '@/features/schedule/schemas';

const MAX_DAYS = 60;

// Stage 6 S5 — admin calendar view. days silently clamped to [1, 60].
export function useAdminCalendar(from: string, days: number) {
  const clampedDays = Math.max(1, Math.min(MAX_DAYS, days));
  return useQuery<AdminCalendarResponse, ApiError>({
    queryKey: qk.admin.calendar(from, clampedDays),
    queryFn: () => getAdminCalendar({ from, days: clampedDays }),
    staleTime: 60_000,
  });
}
