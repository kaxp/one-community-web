import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ExecutionPanel } from '@/components/execution-panel';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/input';
import { useSubmitDeck } from '@/features/pitch/hooks/use-submit-deck';
import { getDeckJob } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import { registerJob } from '@/lib/debug/use-job-registry';
import { AIEvaluationCard } from '@/features/pitch/components/AIEvaluationCard';
import {
  zDeckUploadRequest,
  type AIEvaluationResult,
  type DeckJobStatus,
  type DeckUploadAck,
  type DeckUploadRequest,
} from '@/features/pitch/schemas';

interface Props {
  // The active user id — used to tag the registered job so the debug dock
  // can show "submitted by" alongside `task_name`.
  userId: string | null;
  // Bubble up the latest successful evaluation so the parent page can show
  // it on a dedicated "AI Evaluation" tab without re-running the panel.
  onEvaluation?: (result: AIEvaluationResult) => void;
}

// PRD §7.3.3 + §7.3.4 — submit deck (202 + job_id), then poll the job every
// 3s until SUCCESS / FAILURE / 30-poll cap. Polling, retry, and timeout UI
// all live inside <ExecutionPanel jobPoll>.
export function DeckUploadPanel({ userId, onEvaluation }: Props) {
  const navigate = useNavigate();
  const mutation = useSubmitDeck();

  // PRD §7.3.3 — on 404 the caller has no profile yet. Bounce to the
  // Profile tab so they can create one before resubmitting.
  useEffect(() => {
    if (mutation.error?.code === 'not_found') {
      navigate('/pitch?tab=profile', { replace: true });
    }
  }, [mutation.error, navigate]);

  // Mirror the panel's polling cache so we can fish out the latest SUCCESS
  // result and bubble it upward. Same query key as the panel ⇒ no extra
  // network calls.
  const ackJobId = mutation.data?.job_id ?? null;
  const jobMirror = useQuery<DeckJobStatus>({
    queryKey: ackJobId ? [...qk.pitch.deckJobAll, ackJobId] : ['idle-job-mirror'],
    queryFn: () => getDeckJob(ackJobId as string),
    enabled: false, // read-only: panel owns the network calls.
  });
  useEffect(() => {
    const result = jobMirror.data?.result ?? null;
    if (jobMirror.data?.ready && jobMirror.data.successful && result && onEvaluation) {
      onEvaluation(result);
    }
  }, [jobMirror.data, onEvaluation]);

  return (
    <ExecutionPanel<DeckUploadRequest, AIEvaluationResult, DeckUploadAck>
      title="Submit pitch deck"
      description="Paste a Google Drive share URL — make sure it's set to ‘Anyone with the link can view’. We'll run an AI evaluation in the background (typically under a minute)."
      schema={zDeckUploadRequest}
      defaultValues={{ deck_url: '' }}
      mutation={mutation}
      submitLabel="Submit deck"
      onSuccessToast={() => 'Evaluation complete'}
      jobPoll={{
        queryKey: qk.pitch.deckJobAll,
        queryFn: getDeckJob,
        intervalMs: 3000,
        maxPolls: 30,
      }}
      onJobAccepted={(_ack, jobId) =>
        registerJob({ job_id: jobId, task_name: 'pitch.deck_eval', submitted_by: userId })
      }
      renderForm={({ register, formState }) => (
        <FormField label="Deck URL" htmlFor="deck-url" error={formState.errors.deck_url?.message}>
          <Input
            id="deck-url"
            placeholder="https://drive.google.com/file/d/…"
            {...register('deck_url')}
          />
        </FormField>
      )}
      renderResult={(result) => <AIEvaluationCard result={result} />}
    />
  );
}
