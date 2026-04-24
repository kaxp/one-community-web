import { useForm, type DefaultValues, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { toast } from 'sonner';
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
import { ErrorState } from '@/components/error-state/ErrorState';
import type { ExecutionPanelProps, FormRenderProps } from './types';

interface Props<TInput extends Record<string, unknown>, TOutput> extends ExecutionPanelProps<
  TInput,
  TOutput
> {
  open: boolean;
  onOpenChange(open: boolean): void;
}

export function ExecutionDialog<TInput extends Record<string, unknown>, TOutput>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  defaultValues,
  renderForm,
  mutation,
  onSuccessToast,
  submitLabel = 'Confirm',
}: Props<TInput, TOutput>) {
  const form = useForm<TInput>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as DefaultValues<TInput>,
  });

  useEffect(() => {
    if (mutation.isSuccess) {
      if (onSuccessToast && mutation.data !== undefined) {
        toast.success(onSuccessToast(mutation.data));
      }
      onOpenChange(false);
      mutation.reset();
      form.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation.isSuccess]);

  const onSubmit: SubmitHandler<TInput> = (values) => mutation.mutate(values);

  const rhfProps: FormRenderProps<TInput> = {
    register: form.register,
    control: form.control,
    formState: form.formState,
    watch: form.watch,
    setValue: form.setValue,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <fieldset disabled={mutation.isPending} className="contents">
            {renderForm(rhfProps)}
          </fieldset>
          {mutation.isError ? (
            <ErrorState error={mutation.error} onRetry={() => mutation.reset()} compact />
          ) : null}
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
                  <span>Working…</span>
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
