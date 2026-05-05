import { useMemo, useState, useRef } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/data-table/DataTable';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { ErrorState } from '@/components/error-state/ErrorState';
import { RoleBadge } from '@/components/role-badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useBookings } from '@/features/schedule/hooks/use-bookings';
import { useCancelBooking } from '@/features/schedule/hooks/use-cancel-booking';
import { fmtBookingDateTime } from '@/features/schedule/lib/format-tz';
import type { Booking, BookingStatus } from '@/features/schedule/schemas';
import { toast } from 'sonner';
import type { ApiError } from '@/api/errors';

function statusVariant(status: BookingStatus): 'success' | 'default' | 'secondary' {
  if (status === 'confirmed') return 'success';
  if (status === 'cancelled') return 'secondary';
  return 'default';
}

function CancelDialog({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  const cancel = useCancelBooking();
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  const onConfirm = () => {
    if (!booking) return;
    const reason = reasonRef.current?.value.trim() || undefined;
    cancel.mutate(
      { booking_id: booking.booking_id, reason },
      {
        onSuccess: () => {
          toast.success('Meeting cancelled');
          onClose();
        },
        onError: (err: ApiError) => {
          if (err.code === 'conflict') {
            toast.error('This meeting was already cancelled');
            onClose();
            return;
          }
          toast.error(err.userMessage);
        },
      },
    );
  };

  const open = booking !== null;

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this meeting?</DialogTitle>
        </DialogHeader>
        {booking ? (
          <div className="flex flex-col gap-3 text-sm text-ink-body">
            <p>
              <span className="font-medium text-ink-heading">{booking.counterpart.name}</span>
              {' · '}
              {fmtBookingDateTime(booking.scheduled_at)}
            </p>
            <div className="flex flex-col gap-1">
              <label htmlFor="cancel-reason" className="text-xs font-medium text-ink-muted">
                Reason (optional) — sent to the other participant
              </label>
              <textarea
                id="cancel-reason"
                ref={reasonRef}
                rows={3}
                maxLength={500}
                placeholder="e.g. Schedule conflict, will reschedule soon…"
                className="rounded-md border border-border bg-surface p-3 text-sm text-ink-heading focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={cancel.isPending}>
            Keep meeting
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={cancel.isPending}>
            {cancel.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span>Cancelling…</span>
              </>
            ) : (
              'Cancel meeting'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// PRD §7.10.3 — caller's bookings, cursor-paginated. Cancel button opens a
// confirm dialog (PRD §7.10.4 UI flow). Disabled rows = already cancelled.
export function BookingsList() {
  const list = useBookings();
  const [pendingCancel, setPendingCancel] = useState<Booking | null>(null);

  const items = useMemo(
    () =>
      (list.data?.pages ?? [])
        .flatMap((page) => page.items)
        .slice()
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    [list.data?.pages],
  );

  const columns = useMemo<ColumnDef<Booking>[]>(
    () => [
      {
        id: 'when',
        header: 'When',
        cell: ({ row }) => (
          <span className="font-medium text-ink-heading">
            {fmtBookingDateTime(row.original.scheduled_at)}
          </span>
        ),
      },
      {
        id: 'duration',
        header: 'Duration',
        cell: ({ row }) => (
          <span className="text-xs text-ink-muted">{row.original.duration_minutes} min</span>
        ),
      },
      {
        id: 'counterpart',
        header: 'With',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span className="font-medium text-ink-heading">{row.original.counterpart.name}</span>
            <span className="text-xs text-ink-muted">
              {row.original.counterpart.organisation ?? '—'}
            </span>
            <RoleBadge role={row.original.counterpart.role} className="self-start" />
          </div>
        ),
      },
      {
        id: 'direction',
        header: 'Direction',
        cell: ({ row }) => (
          <Badge variant={row.original.direction === 'outgoing' ? 'default' : 'success'}>
            {row.original.direction === 'outgoing' ? 'Organising' : 'Invited'}
          </Badge>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>{row.original.status}</Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          if (row.original.status === 'cancelled') {
            return <span className="text-xs text-ink-muted">—</span>;
          }
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPendingCancel(row.original)}
              data-testid={`cancel-${row.original.booking_id}`}
            >
              Cancel
            </Button>
          );
        },
      },
    ],
    [],
  );

  if (list.isLoading) {
    return (
      <div className="flex flex-col gap-3" data-testid="bookings-loading">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
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

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        getRowId={(row) => row.booking_id}
        emptyState={
          <EmptyState
            title="No upcoming meetings"
            description="When you book or are invited, it will show up here."
          />
        }
      />
      {list.hasNextPage ? (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            disabled={list.isFetchingNextPage}
            onClick={() => list.fetchNextPage()}
          >
            {list.isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span>Loading…</span>
              </>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      ) : null}
      <CancelDialog booking={pendingCancel} onClose={() => setPendingCancel(null)} />
    </>
  );
}
