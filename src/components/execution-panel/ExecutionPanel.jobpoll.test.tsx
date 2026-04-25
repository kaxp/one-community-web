import { describe, expect, it, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { ExecutionPanel } from './ExecutionPanel';
import { ApiError } from '@/api/errors';
import type { JobPollResult } from './types';

interface AckShape {
  job_id: string;
}

interface OutputShape {
  message: string;
}

const FormSchema = z.object({ note: z.string() });
type FormShape = z.infer<typeof FormSchema>;

interface HarnessProps {
  ackJobId: string;
  pollSequence: JobPollResult<OutputShape>[];
  onJobAccepted?: (ack: AckShape, jobId: string) => void;
  intervalMs?: number;
  maxPolls?: number;
}

function PanelHarness({
  ackJobId,
  pollSequence,
  onJobAccepted,
  intervalMs = 5,
  maxPolls = 30,
}: HarnessProps) {
  const queryFn = vi.fn(async () => {
    const next = pollSequence.shift();
    if (!next) throw new Error('No more poll responses');
    return next;
  });

  const mutation = useMutation<AckShape, ApiError, FormShape>({
    mutationFn: async () => ({ job_id: ackJobId }),
  });

  const result = (
    <ExecutionPanel<FormShape, OutputShape, AckShape>
      title="Test panel"
      schema={FormSchema}
      defaultValues={{ note: '' }}
      mutation={mutation}
      submitLabel="Run"
      jobPoll={{
        queryKey: ['test', 'job'],
        queryFn,
        intervalMs,
        maxPolls,
      }}
      onJobAccepted={onJobAccepted}
      renderForm={() => <input aria-label="note" />}
      renderResult={(out) => <p data-testid="result">{out.message}</p>}
    />
  );
  // Stash queryFn in DOM so test can read call count via vi.fn directly.
  (window as unknown as { __jobQueryFn: typeof queryFn }).__jobQueryFn = queryFn;
  return result;
}

beforeEach(() => {
  vi.useRealTimers();
});

describe('ExecutionPanel jobPoll branch', () => {
  it('polls until SUCCESS, then renders the result via renderResult', async () => {
    const polls: JobPollResult<OutputShape>[] = [
      { job_id: 'j1', state: 'STARTED', ready: false, successful: null, result: null },
      { job_id: 'j1', state: 'STARTED', ready: false, successful: null, result: null },
      {
        job_id: 'j1',
        state: 'SUCCESS',
        ready: true,
        successful: true,
        result: { message: 'all good' },
      },
    ];

    const user = userEvent.setup();
    renderWithProviders(<PanelHarness ackJobId="j1" pollSequence={polls} intervalMs={5} />);

    await user.click(screen.getByRole('button', { name: /run/i }));

    await waitFor(
      () => {
        expect(screen.getByTestId('result')).toHaveTextContent('all good');
      },
      { timeout: 2000 },
    );

    const queryFn = (window as unknown as { __jobQueryFn: ReturnType<typeof vi.fn> }).__jobQueryFn;
    expect(queryFn.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('renders the failure block when state=FAILURE', async () => {
    const polls: JobPollResult<OutputShape>[] = [
      { job_id: 'j2', state: 'FAILURE', ready: true, successful: false, result: null },
    ];
    const user = userEvent.setup();
    renderWithProviders(<PanelHarness ackJobId="j2" pollSequence={polls} intervalMs={5} />);
    await user.click(screen.getByRole('button', { name: /run/i }));
    await waitFor(() => expect(screen.getByText(/evaluation failed/i)).toBeInTheDocument());
    expect(screen.queryByTestId('result')).not.toBeInTheDocument();
  });

  it('fires onJobAccepted exactly once with the extracted job_id', async () => {
    const onJobAccepted = vi.fn();
    const polls: JobPollResult<OutputShape>[] = [
      {
        job_id: 'j3',
        state: 'SUCCESS',
        ready: true,
        successful: true,
        result: { message: 'ok' },
      },
    ];
    const user = userEvent.setup();
    renderWithProviders(
      <PanelHarness
        ackJobId="j3"
        pollSequence={polls}
        intervalMs={5}
        onJobAccepted={onJobAccepted}
      />,
    );
    await user.click(screen.getByRole('button', { name: /run/i }));
    await waitFor(() => expect(onJobAccepted).toHaveBeenCalledTimes(1));
    expect(onJobAccepted).toHaveBeenCalledWith({ job_id: 'j3' }, 'j3');
  });
});
