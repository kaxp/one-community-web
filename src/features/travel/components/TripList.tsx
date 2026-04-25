import { useMemo, useState } from 'react';
import { Loader2, MapPin, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { useTravelPlans } from '@/features/travel/hooks/use-travel-plans';
import { useDeleteTravelPlan } from '@/features/travel/hooks/use-delete-travel-plan';
import type { TravelPlan } from '@/features/travel/schemas';
import type { ApiError } from '@/api/errors';

interface Props {
  activeOnly: boolean;
}

function fmtDateRange(plan: TravelPlan): string {
  const start = parseISO(plan.travel_start);
  const end = parseISO(plan.travel_end);
  if (plan.travel_start === plan.travel_end) {
    return format(start, 'PP');
  }
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${format(start, 'd')}–${format(end, 'PP')}`;
  }
  return `${format(start, 'PP')} → ${format(end, 'PP')}`;
}

function CancelDialog({ plan, onClose }: { plan: TravelPlan | null; onClose: () => void }) {
  const cancel = useDeleteTravelPlan();
  const open = plan !== null;

  const onConfirm = () => {
    if (!plan) return;
    cancel.mutate(
      { id: plan.id },
      {
        onSuccess: () => {
          toast.success('Trip cancelled');
          onClose();
        },
        onError: (err: ApiError) => {
          if (err.code === 'forbidden') {
            toast.error('You can only cancel your own trips');
            onClose();
            return;
          }
          if (err.code === 'not_found') {
            toast.error('Trip already removed — refreshing');
            onClose();
            return;
          }
          toast.error(err.userMessage);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this trip?</DialogTitle>
          <DialogDescription>
            We&apos;ll stop using it for travel-based matchmaking alerts.
          </DialogDescription>
        </DialogHeader>
        {plan ? (
          <div className="text-sm text-ink-body">
            <p className="font-medium text-ink-heading">{plan.destination_city}</p>
            <p className="text-xs text-ink-muted">{fmtDateRange(plan)}</p>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={cancel.isPending}>
            Keep trip
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={cancel.isPending}>
            {cancel.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span>Cancelling…</span>
              </>
            ) : (
              'Cancel trip'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// PRD §7.11.2 UI flow — list of trips. Sorted client-side by travel_start ASC
// since the backend doesn't guarantee order. When `activeOnly=false`, cancelled
// rows are shown with a "Cancelled" badge and no action button.
export function TripList({ activeOnly }: Props) {
  const list = useTravelPlans({ activeOnly });
  const [pendingCancel, setPendingCancel] = useState<TravelPlan | null>(null);

  const items = useMemo(() => {
    const rows = (list.data ?? []).slice();
    rows.sort((a, b) => a.travel_start.localeCompare(b.travel_start));
    return rows;
  }, [list.data]);

  if (list.isLoading) {
    return (
      <div className="flex flex-col gap-3" data-testid="trips-loading">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (list.isError) {
    return (
      <ErrorState
        error={list.error}
        onRetry={() => {
          void list.refetch();
        }}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title={activeOnly ? 'No upcoming trips' : 'No trips yet'}
        description={
          activeOnly
            ? 'Add a trip so we can introduce you to people travelling to the same city.'
            : 'Past trips will appear here once you cancel an upcoming one.'
        }
      />
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3" data-testid="trip-list">
        {items.map((plan) => {
          const isCancelled = plan.status === 'cancelled';
          return (
            <li key={plan.id}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink-heading">{plan.destination_city}</span>
                    {isCancelled ? (
                      <Badge variant="secondary">Cancelled</Badge>
                    ) : plan.alerts_sent ? (
                      <Badge variant="success">Alerts sent</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </div>
                  <span className="text-xs text-ink-muted">{fmtDateRange(plan)}</span>
                  {plan.purpose ? (
                    <p className="max-w-xl text-sm text-ink-body">{plan.purpose}</p>
                  ) : null}
                </div>
                {!isCancelled ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => setPendingCancel(plan)}
                    data-testid={`cancel-trip-${plan.id}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    <span>Cancel</span>
                  </Button>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
      <CancelDialog plan={pendingCancel} onClose={() => setPendingCancel(null)} />
    </>
  );
}
