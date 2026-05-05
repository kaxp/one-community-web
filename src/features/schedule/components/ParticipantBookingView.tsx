import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { useSlots } from '@/features/schedule/hooks/use-slots';
import { useBookings } from '@/features/schedule/hooks/use-bookings';
import { SlotGrid } from '@/features/schedule/components/SlotGrid';
import { BookingsList } from '@/features/schedule/components/BookingsList';
import { BookingDialog } from '@/features/schedule/components/BookingDialog';
import type { Slot } from '@/features/schedule/schemas';
import { viewerTimeZone } from '@/features/schedule/lib/format-tz';

const MIN_DAYS = 1;
const MAX_DAYS = 30;
const DEFAULT_DAYS = 7;

function clampDays(value: number | null): number {
  if (value === null || Number.isNaN(value)) return DEFAULT_DAYS;
  return Math.max(MIN_DAYS, Math.min(MAX_DAYS, value));
}

function todayLocal(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

// Extracted from SchedulePage — no behaviour change, just relocation.
export function ParticipantBookingView() {
  const [params, setParams] = useSearchParams();
  const fromDate = params.get('from_date') || todayLocal();
  const days = clampDays(Number.parseInt(params.get('days') ?? '', 10));

  const slotsQ = useSlots({ fromDate, days });
  const bookingsQ = useBookings();
  const [pickedSlot, setPickedSlot] = useState<Slot | null>(null);
  const tz = viewerTimeZone();

  const setDays = (next: number) => {
    const sp = new URLSearchParams(params);
    sp.set('days', String(clampDays(next)));
    setParams(sp, { replace: true });
  };

  const setFromDate = (next: string) => {
    const sp = new URLSearchParams(params);
    if (next) sp.set('from_date', next);
    else sp.delete('from_date');
    setParams(sp, { replace: true });
  };

  const slots = useMemo(() => slotsQ.data ?? [], [slotsQ.data]);

  const confirmedBookingStarts = useMemo(
    () =>
      (bookingsQ.data?.pages ?? [])
        .flatMap((p) => p.items)
        .filter((b) => b.status === 'confirmed')
        .map((b) => b.scheduled_at),
    [bookingsQ.data?.pages],
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">Schedule a meeting</h1>
        <p className="text-sm text-ink-muted">
          Pick an available slot to book a 30 or 60 min meeting. Times shown in your local timezone
          ({tz}).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Available slots</CardTitle>
          <CardDescription>
            Showing the next {days} day{days === 1 ? '' : 's'} from {fromDate}. Green tiles are
            free; greyed cells are unavailable.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="schedule-from-date">From</Label>
              <Input
                id="schedule-from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="schedule-days">Days</Label>
              <Input
                id="schedule-days"
                type="number"
                min={MIN_DAYS}
                max={MAX_DAYS}
                value={days}
                onChange={(e) => setDays(Number.parseInt(e.target.value, 10))}
                className="w-24"
              />
            </div>
            {days < MAX_DAYS ? (
              <Button variant="outline" size="sm" onClick={() => setDays(MAX_DAYS)}>
                Try 30 days
              </Button>
            ) : null}
          </div>

          {slotsQ.isLoading ? (
            <div className="flex flex-col gap-3" data-testid="slots-loading">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : slotsQ.isError ? (
            <ErrorState
              error={slotsQ.error}
              onRetry={() => {
                void slotsQ.refetch();
              }}
            />
          ) : slots.length === 0 ? (
            <EmptyState
              icon={CalendarX}
              title="No available slots"
              description={`No open slots in the next ${days} day${days === 1 ? '' : 's'}.`}
              {...(days < MAX_DAYS
                ? {
                    action: (
                      <Button variant="outline" size="sm" onClick={() => setDays(MAX_DAYS)}>
                        Try 30 days
                      </Button>
                    ),
                  }
                : {})}
            />
          ) : (
            <SlotGrid
              slots={slots}
              fromDate={fromDate}
              days={days}
              onSlotClick={setPickedSlot}
              confirmedBookingStarts={confirmedBookingStarts}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming meetings</CardTitle>
          <CardDescription>Meetings you organised or were invited to.</CardDescription>
        </CardHeader>
        <CardContent>
          <BookingsList />
        </CardContent>
      </Card>

      <BookingDialog slot={pickedSlot} onClose={() => setPickedSlot(null)} />
    </div>
  );
}
