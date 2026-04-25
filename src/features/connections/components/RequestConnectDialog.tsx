import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { ErrorState } from '@/components/error-state/ErrorState';
import { useRequestConnection } from '@/features/connections/hooks/use-request-connection';
import { zRequestConnectForm, type RequestConnectForm } from '@/features/connections/schemas';

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
  targetId: string;
  targetName: string;
}

const MAX_MESSAGE = 200;

// PRD §7.6.1 — Request Connect modal. Optional 200-char message textarea.
// 200: close + toast + cache invalidation handled by the hook.
// 409: toast "already exists", close.
// 404: toast "user not found", close — caller can decide to navigate away.
// 422: surface inline form error (let RHF render).
export function RequestConnectDialog({ open, onOpenChange, targetId, targetName }: Props) {
  const mutation = useRequestConnection();
  const form = useForm<RequestConnectForm>({
    resolver: zodResolver(zRequestConnectForm),
    defaultValues: { message: '' },
  });
  const [submittedSuccessfully, setSubmittedSuccessfully] = useState(false);

  useEffect(() => {
    if (!open) {
      form.reset({ message: '' });
      mutation.reset();
      setSubmittedSuccessfully(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const message = form.watch('message') ?? '';

  const onSubmit = form.handleSubmit((values) => {
    const trimmed = values.message?.trim();
    mutation.mutate(
      {
        target_id: targetId,
        ...(trimmed ? { message: trimmed } : {}),
      },
      {
        onSuccess: () => {
          toast.success('Request sent — awaiting admin approval');
          setSubmittedSuccessfully(true);
          onOpenChange(false);
        },
        onError: (err) => {
          if (err.code === 'conflict') {
            toast.error('You already have a connection request with this user');
            onOpenChange(false);
            return;
          }
          if (err.code === 'not_found') {
            toast.error('User not found');
            onOpenChange(false);
            return;
          }
          // 422 is rendered inline via the form; 401/403/429/500 fall through to ErrorState below.
        },
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a connection</DialogTitle>
          <DialogDescription>
            We&apos;ll forward your request to the admin team. Once they approve it,{' '}
            <span className="font-medium text-ink-heading">{targetName}</span> can accept and unlock
            contact details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <fieldset disabled={mutation.isPending} className="contents">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="connect-message">Message (optional)</Label>
              <textarea
                id="connect-message"
                rows={4}
                maxLength={MAX_MESSAGE}
                placeholder={`Hi ${targetName.split(' ')[0] ?? targetName}, …`}
                className="rounded-md border border-border bg-surface p-3 text-sm text-ink-heading focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                {...form.register('message')}
              />
              <div className="flex items-center justify-between text-xs">
                {form.formState.errors.message ? (
                  <span className="text-error">{form.formState.errors.message.message}</span>
                ) : (
                  <span className="text-ink-muted">Up to {MAX_MESSAGE} characters.</span>
                )}
                <span className="text-ink-muted">
                  {message.length}/{MAX_MESSAGE}
                </span>
              </div>
            </div>
            {mutation.isError && !submittedSuccessfully ? (
              <ErrorState error={mutation.error} onRetry={() => mutation.reset()} compact />
            ) : null}
          </fieldset>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span>Sending…</span>
                </>
              ) : (
                'Send request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
