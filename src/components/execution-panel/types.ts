import type { ReactNode } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import type { ZodSchema } from 'zod';
import type {
  Control,
  FormState,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';
import type { ApiError } from '@/api/errors';

export interface FormRenderProps<T extends Record<string, unknown>> {
  register: UseFormRegister<T>;
  control: Control<T>;
  formState: FormState<T>;
  watch: UseFormWatch<T>;
  setValue: UseFormSetValue<T>;
}

export interface JobPollResult<T> {
  job_id: string;
  state: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY' | 'REVOKED';
  ready: boolean;
  successful: boolean | null;
  result: T | null;
}

export interface JobPollConfig<TOutput> {
  queryKey: readonly unknown[];
  queryFn: (jobId: string) => Promise<JobPollResult<TOutput>>;
  maxPolls?: number;
  intervalMs?: number;
}

// `TAck` is the synchronous mutation response (e.g. a 202 ack with `job_id`).
// `TOutput` is the user-visible result type passed to `renderResult` — for a
// non-job panel `TAck === TOutput`; for a job panel `TOutput` is the final
// payload polled out of `JobPollResult.result`. PRD §6.7.2.
export interface ExecutionPanelProps<
  TInput extends Record<string, unknown>,
  TOutput,
  TAck = TOutput,
> {
  title: string;
  description?: string;
  schema: ZodSchema<TInput>;
  defaultValues: Partial<TInput>;
  renderForm: (rhf: FormRenderProps<TInput>) => ReactNode;
  mutation: UseMutationResult<TAck, ApiError, TInput, unknown>;
  renderResult?: (data: TOutput) => ReactNode;
  onSuccessToast?: (data: TOutput) => string;
  renderError?: (err: ApiError, retry: () => void) => ReactNode;
  submitLabel?: string;
  secondaryActions?: ReactNode;
  jobPoll?: JobPollConfig<TOutput> | undefined;
  /** Called when a 202 ack returns a job_id — used to register the job in the
   *  debug dock (PRD §6.8). Receives both the ack and the extracted job_id. */
  onJobAccepted?: ((ack: TAck, jobId: string) => void) | undefined;
  debug?: boolean | undefined;
}
