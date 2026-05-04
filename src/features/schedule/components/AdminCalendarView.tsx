import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, addDays, startOfDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { useAdminCalendar } from '@/features/schedule/hooks/use-admin-calendar';
import type { AdminCalendarItem } from '@/features/schedule/schemas';

const DAYS_PER_PAGE = 7;
const MAX_DAYS = 60;

function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function statusVariant(status: string | null): 'success' | 'warning' | 'secondary' {
  if (status === 'confirmed') return 'success';
  if (status === 'pending') return 'warning';
  return 'secondary';
}

function MeetingTile({ item }: { item: AdminCalendarItem }) {
  const time = format(parseISO(item.scheduled_at), 'h:mm a');
  return (
    <div
      className="flex flex-col gap-0.5 rounded-md border border-brand/20 bg-brand/5 px-3 py-2"
      data-testid={`meeting-${item.booking_id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-ink-heading">{time}</span>
        {item.duration_minutes ? (
          <span className="text-xs text-ink-muted">{item.duration_minutes} min</span>
        ) : null}
        <Badge variant={statusVariant(item.status)} className="text-xs">
          {item.status ?? '—'}
        </Badge>
      </div>
      <p className="truncate text-xs text-ink-body">
        {item.requester.name} → {item.target.name}
      </p>
    </div>
  );
}

function DayCard({ date, items }: { date: string; items: AdminCalendarItem[] }) {
  const label = format(parseISO(date), 'EEE, d MMM');
  const isToday = date === todayStr();
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
      data-testid={`day-${date}`}
    >
      <p
        className={`text-sm font-semibold ${isToday ? 'text-brand' : 'text-ink-heading'}`}
        aria-label={isToday ? `${label} (today)` : label}
      >
        {label}
        {isToday ? <span className="ml-1 text-xs font-normal text-brand">(today)</span> : null}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-ink-muted">No meetings</p>
      ) : (
        items.map((item) => <MeetingTile key={item.booking_id} item={item} />)
      )}
    </div>
  );
}

// Stage 6 S5 — admin read-only calendar showing all upcoming meetings.
export function AdminCalendarView() {
  const [params, setParams] = useSearchParams();
  const rawFrom = params.get('from');
  const from = rawFrom ?? todayStr();

  const { data, isLoading, isError, error, refetch } = useAdminCalendar(from, DAYS_PER_PAGE);

  const dayMap = useMemo(() => {
    const map = new Map<string, AdminCalendarItem[]>();
    for (let i = 0; i < DAYS_PER_PAGE; i++) {
      const d = format(addDays(startOfDay(parseISO(from)), i), 'yyyy-MM-dd');
      map.set(d, []);
    }
    for (const item of data?.items ?? []) {
      const d = item.scheduled_at.slice(0, 10);
      const existing = map.get(d);
      if (existing) existing.push(item);
    }
    return map;
  }, [data, from]);

  const goToWeek = (offset: number) => {
    const base = parseISO(from);
    const next = format(addDays(base, offset * DAYS_PER_PAGE), 'yyyy-MM-dd');
    // clamp: can't go before today; can't go more than MAX_DAYS ahead of today
    const today = todayStr();
    const maxFrom = format(addDays(parseISO(today), MAX_DAYS - DAYS_PER_PAGE), 'yyyy-MM-dd');
    const clamped = next < today ? today : next > maxFrom ? maxFrom : next;
    const sp = new URLSearchParams(params);
    sp.set('from', clamped);
    setParams(sp, { replace: true });
  };

  const goToThisWeek = () => {
    const sp = new URLSearchParams(params);
    sp.set('from', todayStr());
    setParams(sp, { replace: true });
  };

  const isAtToday = from === todayStr();
  const lastAllowedFrom = format(
    addDays(parseISO(todayStr()), MAX_DAYS - DAYS_PER_PAGE),
    'yyyy-MM-dd',
  );
  const isAtMax = from >= lastAllowedFrom;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">
          Calendar — all upcoming meetings
        </h1>
        <p className="text-sm text-ink-muted">
          Read-only view of all meetings across the community. Showing 7 days from {from}.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2" aria-label="Week navigation">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToWeek(-1)}
          disabled={isAtToday}
          aria-label="Previous week"
          data-testid="prev-week"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Prev week
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goToThisWeek}
          disabled={isAtToday}
          data-testid="this-week"
        >
          This week
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToWeek(1)}
          disabled={isAtMax}
          aria-label="Next week"
          data-testid="next-week"
        >
          Next week
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {format(parseISO(from), 'd MMM')} –{' '}
            {format(addDays(parseISO(from), DAYS_PER_PAGE - 1), 'd MMM yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-3" data-testid="admin-calendar-loading">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              error={error}
              onRetry={() => {
                void refetch();
              }}
            />
          ) : (data?.items ?? []).length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No meetings this week"
              description="No meetings scheduled in this 7-day window."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from(dayMap.entries()).map(([date, items]) => (
                <DayCard key={date} date={date} items={items} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
