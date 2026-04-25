import type { UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import type { ApiError } from '@/api/errors';

interface Props<TInput, TOutput> extends Omit<ButtonProps, 'onClick'> {
  mutation: UseMutationResult<TOutput, ApiError, TInput, unknown>;
  input: TInput;
  onSuccessToast?: (data: TOutput) => string;
  onErrorToast?: (err: ApiError) => string;
  children: React.ReactNode;
}

// Toasts fire via the per-call `.mutate(input, { onSuccess, onError })` callbacks
// — NOT a useEffect on `mutation.isSuccess`. That matters because when multiple
// buttons share a single `useMutation` hook (e.g. a row's Approve + Reject pair,
// or many rows under one mutation), a useEffect would trigger on EVERY button's
// observation of the success state, producing a toast per observer. Per-call
// callbacks fire only for the specific click that initiated the mutation.
export function InlineExecutionButton<TInput, TOutput>({
  mutation,
  input,
  onSuccessToast,
  onErrorToast,
  disabled,
  children,
  ...rest
}: Props<TInput, TOutput>) {
  const onClick = () => {
    mutation.mutate(input, {
      onSuccess: (data) => {
        if (onSuccessToast) toast.success(onSuccessToast(data));
      },
      onError: (err) => {
        if (onErrorToast) toast.error(onErrorToast(err));
      },
    });
  };

  return (
    <Button {...rest} disabled={disabled || mutation.isPending} onClick={onClick}>
      {mutation.isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>Working…</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}
