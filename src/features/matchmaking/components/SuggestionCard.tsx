import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InlineExecutionButton } from '@/components/execution-panel';
import { useRespondToSuggestion } from '@/features/matchmaking/hooks/use-respond-to-suggestion';
import {
  counterpartLabel,
  fmtScore,
  perspectiveFor,
  scoreBadgeVariant,
} from '@/features/matchmaking/lib/labels';
import type { MatchSuggestion, RespondAction, RespondResult } from '@/features/matchmaking/schemas';
import type { ApiError } from '@/api/errors';

interface Props {
  suggestion: MatchSuggestion;
  myUserId: string | null;
  onConflict(): void;
}

const ACTION_LABEL: Record<RespondAction, string> = {
  accepted: 'Interested',
  rejected: 'Not a fit',
  skipped: 'Skip',
};

function successToast(action: RespondAction, data: RespondResult): string {
  if (action === 'accepted') {
    return data.connection_created
      ? 'Match! Connection request created — awaiting admin approval.'
      : "Noted. We'll let you know when the other side responds.";
  }
  if (action === 'rejected') return 'Marked as not a fit.';
  return 'Skipped.';
}

// PRD §7.8.5 / §7.8.6 — single suggestion row in the user-facing matchmaking
// list. The OTHER side's snapshot is rendered (company / sector / one_liner)
// regardless of perspective, since the backend hydrates those fields with
// the counterpart's data per §7.8.5 transformation note.
export function SuggestionCard({ suggestion, myUserId, onConflict }: Props) {
  const respond = useRespondToSuggestion();
  const perspective = perspectiveFor(suggestion, myUserId);
  const headerKind = counterpartLabel(perspective);
  const display = suggestion.company_name ?? `${headerKind} · ${suggestion.id.slice(0, 8)}`;

  const errorToast = (err: ApiError) => {
    if (err.code === 'conflict') {
      // PRD §7.8.6 UI flow: 409 means already responded — silent refetch.
      onConflict();
      return 'Already responded — refreshing list';
    }
    if (err.code === 'forbidden') return 'You cannot respond to this suggestion';
    return err.userMessage;
  };

  const renderActionButton = (action: RespondAction, variant: 'default' | 'outline' | 'ghost') => (
    <InlineExecutionButton
      size="sm"
      variant={variant}
      mutation={respond}
      input={{ suggestion_id: suggestion.id, action }}
      onSuccessToast={(data) => successToast(action, data)}
      onErrorToast={errorToast}
      data-testid={`respond-${action}-${suggestion.id}`}
    >
      {ACTION_LABEL[action]}
    </InlineExecutionButton>
  );

  const weekOfLabel = (() => {
    try {
      return format(parseISO(suggestion.week_of), 'PP');
    } catch {
      return suggestion.week_of;
    }
  })();

  return (
    <Card data-testid={`suggestion-card-${suggestion.id}`}>
      <CardContent className="flex flex-col gap-4 p-5">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {headerKind}
            </p>
            <Link
              to={`/search/profile/${suggestion.startup_id}`}
              className="text-base font-semibold text-ink-heading hover:underline hover:text-brand"
            >
              {display}
            </Link>
            {suggestion.sector ? (
              <Badge variant="secondary" className="mt-1">
                {suggestion.sector}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={scoreBadgeVariant(suggestion.score)}>
              {fmtScore(suggestion.score)}
            </Badge>
            <span className="text-[10px] text-ink-muted">Week of {weekOfLabel}</span>
          </div>
        </header>

        {suggestion.one_liner ? (
          <p className="text-sm text-ink-heading">{suggestion.one_liner}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {renderActionButton('accepted', 'default')}
          {renderActionButton('rejected', 'outline')}
          {renderActionButton('skipped', 'ghost')}
        </div>
      </CardContent>
    </Card>
  );
}
