import { useEffect, useRef, useState } from 'react';
import { useForm, type DefaultValues, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state/ErrorState';
import { ApiError } from '@/api/errors';
import type { ExecutionPanelProps, FormRenderProps, JobPollResult } from './types';

const DEFAULT_INTERVAL_MS = 3000;
const DEFAULT_MAX_POLLS = 30;

interface JobAckShape {
  job_id?: unknown;
}

function extractJobId(data: unknown): string | null {
  if (data && typeof data === 'object' && 'job_id' in (data as object)) {
    const id = (data as JobAckShape).job_id;
    return typeof id === 'string' && id.length > 0 ? id : null;
  }
  return null;
}

export function ExecutionPanel<TInput extends Record<string, unknown>, TOutput, TAck = TOutput>({
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
  jobPoll,
  onJobAccepted,
}: ExecutionPanelProps<TInput, TOutput, TAck>) {
  const form = useForm<TInput>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as DefaultValues<TInput>,
  });

  // PRD §6.7.3 — when `jobPoll` is set, transition through:
  //   submitting → polling-job → (success | failure | timeout)
  // The mutation's data carries `job_id`; we extract it and drive a
  // `useQuery` with refetchInterval until the job is `ready` or we hit the cap.
  const [pollCount, setPollCount] = useState(0);
  const isJobMode = !!jobPoll;
  const ack = mutation.data ?? null;
  const jobId = isJobMode && ack !== null ? extractJobId(ack) : null;
  const intervalMs = jobPoll?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const maxPolls = jobPoll?.maxPolls ?? DEFAULT_MAX_POLLS;

  // Reset poll counter whenever a fresh job_id appears.
  useEffect(() => {
    setPollCount(0);
  }, [jobId]);

  // PRD §6.8 — register the job in the debug dock exactly once per ack.
  const registeredJobId = useRef<string | null>(null);
  useEffect(() => {
    if (!jobId || !ack) return;
    if (registeredJobId.current === jobId) return;
    registeredJobId.current = jobId;
    onJobAccepted?.(ack, jobId);
  }, [jobId, ack, onJobAccepted]);

  const jobQuery = useQuery<JobPollResult<TOutput>, ApiError>({
    queryKey:
      jobPoll && jobId
        ? ([...jobPoll.queryKey, jobId] as readonly unknown[])
        : (['idle-job-poll'] as const),
    queryFn: async () => {
      if (!jobPoll || !jobId) throw new Error('jobPoll/jobId missing');
      setPollCount((c) => c + 1);
      return jobPoll.queryFn(jobId);
    },
    enabled: !!jobPoll && !!jobId,
    // Cap polls via refetchInterval per CLAUDE.md §5.7 — TanStack returns
    // `false` to stop, `number` to keep polling.
    refetchInterval: (query) => {
      const data = query.state.data as JobPollResult<TOutput> | undefined;
      if (data?.ready) return false;
      if (pollCount >= maxPolls) return false;
      return intervalMs;
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  const jobReady = jobQuery.data?.ready ?? false;
  const jobSuccessful = jobQuery.data?.successful === true;
  const jobResult = jobQuery.data?.result ?? null;
  const ackReady = mutation.isSuccess && ack !== null;
  const showJobSuccess = isJobMode && jobReady && jobSuccessful && jobResult !== null;
  const showNonJobSuccess = !isJobMode && ackReady;
  const showJobFailure = isJobMode && jobReady && !jobSuccessful;
  const timedOut = isJobMode && !jobReady && pollCount >= maxPolls && !!jobId;

  // Toast once per success transition (job-mode = on SUCCESS state, non-job = on 200 ack).
  useEffect(() => {
    if (!onSuccessToast) return;
    if (showJobSuccess && jobResult) {
      toast.success(onSuccessToast(jobResult));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showJobSuccess]);

  useEffect(() => {
    if (!onSuccessToast) return;
    if (!isJobMode && ackReady && ack !== null) {
      // Non-job mode — TAck === TOutput by the default generic.
      toast.success(onSuccessToast(ack as unknown as TOutput));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ackReady, isJobMode]);

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

  const isPolling = isJobMode && !!jobId && !jobReady && pollCount < maxPolls && !mutation.isError;
  const isPending = mutation.isPending || isPolling;
  const elapsedSeconds = Math.min(pollCount * (intervalMs / 1000), maxPolls * (intervalMs / 1000));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <fieldset disabled={isPending} className="contents">
            {renderForm(rhfProps)}
          </fieldset>
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            {secondaryActions}
            <Button type="submit" disabled={isPending}>
              {isPending ? (
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

        {isPolling ? (
          <div
            role="status"
            aria-live="polite"
            data-testid="execution-panel-polling"
            className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-surface-muted p-4 text-sm text-ink-body"
          >
            <Loader2 className="h-4 w-4 animate-spin text-brand" aria-hidden />
            <span>Working on it… ({Math.round(elapsedSeconds)}s elapsed)</span>
          </div>
        ) : null}

        {showJobSuccess && renderResult && jobResult ? (
          <div className="mt-6 border-t border-border pt-4">{renderResult(jobResult)}</div>
        ) : null}

        {showNonJobSuccess && renderResult && ack !== null ? (
          <div className="mt-6 border-t border-border pt-4">
            {renderResult(ack as unknown as TOutput)}
          </div>
        ) : null}

        {showJobFailure ? (
          <div
            role="alert"
            className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-error/30 bg-error/5 p-4 text-center"
          >
            <p className="font-semibold text-ink-heading">Evaluation failed</p>
            <p className="text-sm text-ink-body">
              The background job did not finish successfully. You can retry the submission below.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                mutation.reset();
                setPollCount(0);
              }}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              <span>Retry</span>
            </Button>
          </div>
        ) : null}

        {timedOut ? (
          <div
            role="status"
            data-testid="execution-panel-timeout"
            className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4 text-center"
          >
            <p className="font-semibold text-ink-heading">Still running</p>
            <p className="text-sm text-ink-body">
              We&apos;ve been waiting for {maxPolls * (intervalMs / 1000)}s — the job is still
              processing. Refresh manually to check again, or come back later.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPollCount(0);
                void jobQuery.refetch();
              }}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              <span>Refresh</span>
            </Button>
          </div>
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
