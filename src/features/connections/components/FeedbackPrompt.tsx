import { useState } from 'react';
import { Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFeedback } from '@/features/connections/hooks/use-feedback';
import type { ApiError } from '@/api/errors';
import type { FeedbackResponseValue } from '@/features/connections/schemas';

interface Props {
  introId: string;
  counterpartName: string;
}

// PRD §7.7.2 — 48h post-accept feedback prompt rendered on `/connections` rows.
// On 200: collapse. On 409 (already submitted): collapse silently. On 404:
// collapse silently (intro vanished). On other errors: keep the prompt up
// with a toast so the user can retry.
export function FeedbackPrompt({ introId, counterpartName }: Props) {
  const [hidden, setHidden] = useState(false);
  const mutation = useFeedback();

  if (hidden) return null;

  const submit = (response: FeedbackResponseValue) => {
    mutation.mutate(
      { intro_id: introId, response },
      {
        onSuccess: () => {
          toast.success('Thanks for the feedback');
          setHidden(true);
        },
        onError: (err: ApiError) => {
          if (err.code === 'conflict' || err.code === 'not_found') {
            // Either it's already submitted (409) or the intro disappeared (404).
            // Silently dismiss — there's no value in surfacing this to the user.
            setHidden(true);
            return;
          }
          toast.error(err.userMessage);
        },
      },
    );
  };

  return (
    <Card
      className="border-brand/20 bg-brand/5"
      data-testid={`feedback-prompt-${introId}`}
      role="region"
      aria-label="Connection feedback"
    >
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-body">
          Did your intro to <span className="font-medium text-ink-heading">{counterpartName}</span>{' '}
          feel useful?
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={mutation.isPending}
            onClick={() => submit('yes')}
            data-testid={`feedback-yes-${introId}`}
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
            )}
            <span>Yes</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => submit('no')}
            data-testid={`feedback-no-${introId}`}
          >
            <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
            <span>No</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
