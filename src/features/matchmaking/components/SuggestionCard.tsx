import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
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
import { colours, fonts, radius, shadow } from '@/design-system/tokens';
import { Tag } from '@/design-system/components';

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

const SCORE_COLORS: Record<string, { color: string; bg: string }> = {
  success: { color: colours.positive, bg: colours.positiveBg },
  warning: { color: colours.caution, bg: colours.cautionBg },
  secondary: { color: colours.info, bg: colours.infoBg },
};

// PRD §7.8.5 / §7.8.6
export function SuggestionCard({ suggestion, myUserId, onConflict }: Props) {
  const respond = useRespondToSuggestion();
  const perspective = perspectiveFor(suggestion, myUserId);
  const headerKind = counterpartLabel(perspective);
  const display = suggestion.company_name ?? `${headerKind} · ${suggestion.id.slice(0, 8)}`;
  const scoreVariant = scoreBadgeVariant(suggestion.score);
  const scoreStyle = SCORE_COLORS[scoreVariant] ?? { color: colours.text2, bg: colours.pageBg };

  const errorToast = (err: ApiError) => {
    if (err.code === 'conflict') {
      onConflict();
      return 'Already responded — refreshing list';
    }
    if (err.code === 'forbidden') return 'You cannot respond to this suggestion';
    return err.userMessage;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    <div
      data-testid={`suggestion-card-${suggestion.id}`}
      style={{
        background: colours.surface,
        border: `1px solid ${colours.border}`,
        borderRadius: radius.lg,
        boxShadow: shadow.card,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 10,
              fontWeight: 500,
              textTransform: 'uppercase' as const,
              letterSpacing: '.08em',
              color: colours.text3,
              marginBottom: 4,
            }}
          >
            {headerKind}
          </div>
          <Link
            to={`/search/profile/${suggestion.startup_user_id ?? suggestion.startup_id}`}
            style={{
              fontFamily: fonts.sans,
              fontSize: 15,
              fontWeight: 600,
              color: colours.text,
              textDecoration: 'none',
              display: 'block',
              marginBottom: 6,
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = colours.brand;
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = colours.text;
            }}
          >
            {display}
          </Link>
          {suggestion.sector ? (
            <Tag label={suggestion.sector} color={colours.info} bg={colours.infoBg} />
          ) : null}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 6,
            flexShrink: 0,
          }}
        >
          <Tag label={fmtScore(suggestion.score)} color={scoreStyle.color} bg={scoreStyle.bg} />
          <span style={{ fontFamily: fonts.sans, fontSize: 10, color: colours.text3 }}>
            Week of {weekOfLabel}
          </span>
        </div>
      </div>

      {/* One-liner */}
      {suggestion.one_liner ? (
        <p
          style={{
            fontFamily: fonts.sans,
            fontSize: 13,
            color: colours.text2,
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          {suggestion.one_liner}
        </p>
      ) : null}

      {/* TODO(kaxp): Remove Interest button */}
      {/* <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        {renderActionButton('accepted', 'default')}
        {renderActionButton('rejected', 'outline')}
        {renderActionButton('skipped', 'ghost')}
      </div> */}
    </div>
  );
}
