import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormField } from '@/components/forms/FormField';
import { ErrorState } from '@/components/error-state/ErrorState';
import { useConnections } from '@/features/connections/hooks/use-connections';
import { useBookMeeting } from '@/features/schedule/hooks/use-book-meeting';
import { fmtBookingDateTime } from '@/features/schedule/lib/format-tz';
import { zBookForm, type BookForm, type Slot, DURATION_OPTIONS } from '@/features/schedule/schemas';
import { toast } from 'sonner';
import type { ApiError } from '@/api/errors';

interface Props {
  slot: Slot | null;
  onClose(): void;
}

// PRD §7.10.2 — booking modal opened by clicking a slot in <SlotGrid>. The
// `scheduled_at` is fixed by the slot's `start` (already ISO+TZ, no client-side
// transformation needed). Target picker reads from the user's accepted
// connections — meetings outside the connection graph are an edge case the
// product can address later (paste-UUID is the escape hatch).
export function BookingDialog({ slot, onClose }: Props) {
  const open = slot !== null;
  const connections = useConnections();
  const acceptedItems = useMemo(
    () => (connections.data?.pages ?? []).flatMap((p) => p.items),
    [connections.data?.pages],
  );

  const [filter, setFilter] = useState('');
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return acceptedItems;
    return acceptedItems.filter(
      (c) =>
        c.counterpart.name.toLowerCase().includes(q) ||
        (c.counterpart.organisation ?? '').toLowerCase().includes(q),
    );
  }, [acceptedItems, filter]);

  const mutation = useBookMeeting();
  const form = useForm<BookForm>({
    resolver: zodResolver(zBookForm),
    defaultValues: {
      target_id: '',
      scheduled_at: slot?.start ?? '',
      duration_minutes: 30,
      purpose: '',
    },
  });

  // Re-prime the form whenever a fresh slot is opened.
  useEffect(() => {
    if (slot) {
      form.reset({
        target_id: '',
        scheduled_at: slot.start,
        duration_minutes: 30,
        purpose: '',
      });
      setFilter('');
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  const onSubmit = (values: BookForm) => {
    mutation.mutate(values, {
      onSuccess: (data) => {
        toast.success(`Booked for ${fmtBookingDateTime(data.scheduled_at)}`);
        onClose();
      },
      onError: (err: ApiError) => {
        // PRD §7.10.2 UI flow #4 — 409 conflict means the slot was just taken.
        if (err.code === 'conflict') {
          toast.error('That slot just filled up — pick another');
          onClose();
          return;
        }
        if (err.code === 'not_found') {
          toast.error('User not found');
          return;
        }
        // Other errors render inline below; toast not needed.
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="max-w-[95vw] md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Book a meeting</DialogTitle>
          {slot ? <DialogDescription>{fmtBookingDateTime(slot.start)}</DialogDescription> : null}
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <fieldset disabled={mutation.isPending} className="contents">
            <FormField
              label="Search your connections"
              htmlFor="booking-target-search"
              hint="Type a name or organisation"
            >
              <Input
                id="booking-target-search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="e.g. Kapil"
              />
            </FormField>

            <FormField
              label="Target"
              htmlFor="booking-target"
              error={form.formState.errors.target_id?.message}
            >
              {connections.isLoading ? (
                <p className="text-xs text-ink-muted">Loading your connections…</p>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-ink-muted">
                  No matches. You can paste a user_id below if you have one.
                </p>
              ) : (
                <ul
                  id="booking-target"
                  className="max-h-44 overflow-y-auto rounded-md border border-border"
                  role="listbox"
                  aria-label="Pick a target"
                >
                  {filtered.map((c) => {
                    const checked = form.watch('target_id') === c.counterpart.user_id;
                    return (
                      <li key={c.connection_id}>
                        <label
                          className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2 text-sm last:border-b-0 hover:bg-surface-muted"
                          data-testid={`target-${c.counterpart.user_id}`}
                        >
                          <input
                            type="radio"
                            value={c.counterpart.user_id}
                            checked={checked}
                            onChange={() =>
                              form.setValue('target_id', c.counterpart.user_id, {
                                shouldValidate: true,
                              })
                            }
                          />
                          <div className="flex flex-col">
                            <span className="font-medium text-ink-heading">
                              {c.counterpart.name}
                            </span>
                            {c.counterpart.organisation ? (
                              <span className="text-xs text-ink-muted">
                                {c.counterpart.organisation}
                              </span>
                            ) : null}
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </FormField>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-ink-heading">Duration</legend>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map((d) => (
                  <Label
                    key={d}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-muted"
                  >
                    <input
                      type="radio"
                      value={d}
                      {...form.register('duration_minutes', { valueAsNumber: true })}
                    />
                    {d} min
                  </Label>
                ))}
              </div>
              {form.formState.errors.duration_minutes ? (
                <p className="text-xs text-error" role="alert">
                  {form.formState.errors.duration_minutes.message}
                </p>
              ) : null}
            </fieldset>

            <FormField
              label="Purpose (optional)"
              htmlFor="booking-purpose"
              error={form.formState.errors.purpose?.message}
              hint="Up to 500 characters"
            >
              <textarea
                id="booking-purpose"
                rows={3}
                maxLength={500}
                className="rounded-md border border-border bg-surface p-3 text-sm text-ink-heading focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="Exploratory chat about your thesis…"
                {...form.register('purpose')}
              />
            </FormField>
          </fieldset>

          {mutation.isError ? <ErrorState error={mutation.error} compact /> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span>Booking…</span>
                </>
              ) : (
                'Confirm booking'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
