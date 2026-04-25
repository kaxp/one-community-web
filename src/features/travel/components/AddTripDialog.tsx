import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
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
import { FormField } from '@/components/forms/FormField';
import { ErrorState } from '@/components/error-state/ErrorState';
import { useCreateTravelPlan } from '@/features/travel/hooks/use-create-travel-plan';
import { zTripForm, type TripForm } from '@/features/travel/schemas';
import { toast } from 'sonner';
import type { ApiError } from '@/api/errors';

interface Props {
  open: boolean;
  onClose(): void;
}

// PRD §7.11.1 — "Add trip" modal. Date inputs use `type="date"` (which already
// emits `yyyy-MM-dd`); we still seed via date-fns to keep the conversion path
// authoritative (PRD §8.12.1).
export function AddTripDialog({ open, onClose }: Props) {
  const mutation = useCreateTravelPlan();
  const today = format(new Date(), 'yyyy-MM-dd');

  const form = useForm<TripForm>({
    resolver: zodResolver(zTripForm),
    defaultValues: {
      destination_city: '',
      travel_start: today,
      travel_end: today,
      purpose: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        destination_city: '',
        travel_start: today,
        travel_end: today,
        purpose: '',
      });
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = (values: TripForm) => {
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success('Trip added');
        onClose();
      },
      onError: (err: ApiError) => {
        // 422 validation errors render inline below; toast not needed.
        if (err.code !== 'validation_error') {
          toast.error(err.userMessage);
        }
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="max-w-[95vw] md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a trip</DialogTitle>
          <DialogDescription>
            We&apos;ll use this for travel-based matchmaking alerts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <fieldset disabled={mutation.isPending} className="contents">
            <FormField
              label="Destination city"
              htmlFor="trip-city"
              error={form.formState.errors.destination_city?.message}
            >
              <Input
                id="trip-city"
                placeholder="Bengaluru"
                autoComplete="off"
                {...form.register('destination_city')}
              />
            </FormField>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Start date"
                htmlFor="trip-start"
                error={form.formState.errors.travel_start?.message}
              >
                <Input id="trip-start" type="date" {...form.register('travel_start')} />
              </FormField>
              <FormField
                label="End date"
                htmlFor="trip-end"
                error={form.formState.errors.travel_end?.message}
              >
                <Input id="trip-end" type="date" {...form.register('travel_end')} />
              </FormField>
            </div>

            <FormField
              label="Purpose (optional)"
              htmlFor="trip-purpose"
              error={form.formState.errors.purpose?.message}
              hint="Up to 500 characters"
            >
              <textarea
                id="trip-purpose"
                rows={3}
                maxLength={500}
                className="rounded-md border border-border bg-surface p-3 text-sm text-ink-heading focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="Investor meetings, demo day, founder syncs…"
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
                  <span>Saving…</span>
                </>
              ) : (
                'Add trip'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
