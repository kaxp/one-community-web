import { useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import { FormField } from '@/components/forms/FormField';
import { ErrorState } from '@/components/error-state/ErrorState';
import { useBookMeeting } from '@/features/schedule/hooks/use-book-meeting';
import { fmtBookingDateTime } from '@/features/schedule/lib/format-tz';
import { zBookForm, type BookForm, type Slot, DURATION_OPTIONS } from '@/features/schedule/schemas';
import { toast } from 'sonner';
import type { ApiError } from '@/api/errors';

interface Props {
  slot: Slot | null;
  onClose(): void;
}

export function BookingDialog({ slot, onClose }: Props) {
  const open = slot !== null;
  const mutation = useBookMeeting();
  const form = useForm<BookForm>({
    resolver: zodResolver(zBookForm),
    defaultValues: {
      scheduled_at: slot?.start ?? '',
      duration_minutes: 30,
      purpose: '',
    },
  });

  // Re-prime the form whenever a fresh slot is opened.
  useEffect(() => {
    if (slot) {
      form.reset({
        scheduled_at: slot.start,
        duration_minutes: 30,
        purpose: '',
      });
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
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-ink-heading">Duration</legend>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map((d) => {
                  // Controlled `checked` binding so 30-min stays visually
                  // selected on first render — RHF's register() compared the
                  // numeric form value against the string DOM value and the
                  // radios rendered un-checked (issues.md [I-17]).
                  const checked = form.watch('duration_minutes') === d;
                  return (
                    <Label
                      key={d}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-muted"
                    >
                      <input
                        type="radio"
                        name="duration_minutes"
                        value={d}
                        checked={checked}
                        onChange={() =>
                          form.setValue('duration_minutes', d, { shouldValidate: true })
                        }
                      />
                      {d} min
                    </Label>
                  );
                })}
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
