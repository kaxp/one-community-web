import { useForm, type DefaultValues, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state/ErrorState';
import type { ExecutionPanelProps, FormRenderProps } from './types';

export function ExecutionPanel<TInput extends Record<string, unknown>, TOutput>({
  title,
  description,
  schema,
  defaultValues,
  renderForm,
  mutation,
  renderResult,
  onSuccessToast,
  submitLabel = 'Submit',
  secondaryActions,
}: ExecutionPanelProps<TInput, TOutput>) {
  const form = useForm<TInput>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as DefaultValues<TInput>,
  });

  useEffect(() => {
    if (mutation.isSuccess && onSuccessToast && mutation.data !== undefined) {
      toast.success(onSuccessToast(mutation.data));
    }
  }, [mutation.isSuccess, mutation.data, onSuccessToast]);

  const onSubmit: SubmitHandler<TInput> = (values) => {
    mutation.mutate(values);
  };

  const rhfProps: FormRenderProps<TInput> = {
    register: form.register,
    control: form.control,
    formState: form.formState,
    watch: form.watch,
    setValue: form.setValue,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <fieldset disabled={mutation.isPending} className="contents">
            {renderForm(rhfProps)}
          </fieldset>
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            {secondaryActions}
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
          </div>
        </form>

        {mutation.isSuccess && renderResult && mutation.data !== undefined ? (
          <div className="mt-6 border-t border-border pt-4">{renderResult(mutation.data)}</div>
        ) : null}

        {mutation.isError ? (
          <div className="mt-6">
            <ErrorState error={mutation.error} onRetry={() => mutation.reset()} compact />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
