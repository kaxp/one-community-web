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

export interface ExecutionPanelProps<TInput extends Record<string, unknown>, TOutput> {
  title: string;
  description?: string;
  schema: ZodSchema<TInput>;
  defaultValues: Partial<TInput>;
  renderForm: (rhf: FormRenderProps<TInput>) => ReactNode;
  mutation: UseMutationResult<TOutput, ApiError, TInput, unknown>;
  renderResult?: (data: TOutput) => ReactNode;
  onSuccessToast?: (data: TOutput) => string;
  renderError?: (err: ApiError, retry: () => void) => ReactNode;
  submitLabel?: string;
  secondaryActions?: ReactNode;
  jobPoll?: JobPollConfig<TOutput>;
  debug?: boolean;
}
