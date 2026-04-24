import { useEffect } from 'react';
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

export function InlineExecutionButton<TInput, TOutput>({
  mutation,
  input,
  onSuccessToast,
  onErrorToast,
  disabled,
  children,
  ...rest
}: Props<TInput, TOutput>) {
  useEffect(() => {
    if (mutation.isSuccess && onSuccessToast && mutation.data !== undefined) {
      toast.success(onSuccessToast(mutation.data));
    }
    if (mutation.isError && onErrorToast && mutation.error) {
      toast.error(onErrorToast(mutation.error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation.isSuccess, mutation.isError]);

  return (
    <Button
      {...rest}
      disabled={disabled || mutation.isPending}
      onClick={() => mutation.mutate(input)}
    >
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
