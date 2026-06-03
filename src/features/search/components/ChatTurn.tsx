import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResultCard } from '@/features/search/components/ResultCard';
import { SearchAnswerBlock } from '@/features/search/components/SearchAnswerBlock';
import { ProseAnswerBlock } from '@/features/search/components/ProseAnswerBlock';
import { SearchLoadingState } from '@/features/search/components/SearchLoadingState';
import type { ConversationResponse, StartupResultItem } from '@/features/search/schemas';

interface Props {
  userMessage: string;
  // null while the API call is in-flight (pending) or after a failure (isError).
  response: ConversationResponse | null;
  isError?: boolean | undefined;
  isMasked: boolean;
  onRetry?: (() => void) | undefined;
}

/**
 * One assistant reply in the conversation thread. Reuses SearchAnswerBlock
 * for the synth path and ResultCard for the card-grid fallback — same
 * affordances as the single-shot search page, just stacked into a thread.
 *
 * When `response` is null (pending turn), renders the user bubble plus a
 * loading skeleton in place of the assistant reply. This gives the
 * "optimistic message" UX: user message appears on screen immediately on
 * submit, response fills in once the API returns.
 */
// Shared user bubble — rendered identically across pending, error, and
// completed states so the message position never jumps.
function UserBubble({ message }: { message: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl bg-brand/10 px-4 py-2 text-[15px] text-ink-heading sm:text-base">
        {message}
      </div>
    </div>
  );
}

export function ChatTurn({ userMessage, response, isError, isMasked, onRetry }: Props) {
  // ── Error state: user message + inline error + Retry button ─────────────
  if (response === null && isError) {
    return (
      <div className="flex flex-col gap-4" data-testid="chat-turn-error">
        <UserBubble message={userMessage} />
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2 text-[14px] text-ink-muted">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
            <span>Something went wrong. Please try again.</span>
          </div>
          {onRetry ? (
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={onRetry}
              data-testid="chat-turn-retry"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  // ── Pending state: user message + loading skeleton ──────────────────────
  if (response === null) {
    return (
      <div className="flex flex-col gap-4" data-testid="chat-turn-pending">
        <UserBubble message={userMessage} />
        <SearchLoadingState />
      </div>
    );
  }

  const isClarify = response.action === 'clarify';
  const hasResults = response.results.length > 0;
  const resultsByUserId: Record<string, StartupResultItem> = Object.fromEntries(
    response.results.map((r) => [r.user_id, r]),
  );

  return (
    <div className="flex flex-col gap-4">
      <UserBubble message={userMessage} />

      {/* Assistant reply — flows as prose, no outer container */}
      {isClarify ? (
        <p
          className="max-w-[90%] text-[15px] leading-relaxed text-ink-body"
          data-testid="chat-turn-clarification"
        >
          {response.clarification ?? 'Could you clarify what you’re looking for?'}
        </p>
      ) : response.answer_markdown ? (
        /* v5: conversational prose rendered from Markdown */
        <ProseAnswerBlock markdown={response.answer_markdown} />
      ) : response.answer ? (
        /* v4: structured envelope rendered as before (backward compat) */
        <SearchAnswerBlock answer={response.answer} resultsByUserId={resultsByUserId} />
      ) : (
        <div className="flex flex-col gap-3" data-testid="search-results">
          {response.text ? (
            <div className="rounded-md border border-brand/20 bg-brand/5 p-3 text-sm text-ink-body">
              {response.text}
            </div>
          ) : null}
          {!response.stage3_applied && response.intent !== 'entity_lookup' && hasResults ? (
            <div
              className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-sm text-ink-body"
              data-testid="stage3-fallback-banner"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" aria-hidden />
              <span>AI ranking temporarily unavailable — showing vector similarity only.</span>
            </div>
          ) : null}
          {hasResults ? (
            <div className="grid gap-3 md:grid-cols-2">
              {response.results.map((item) => (
                <ResultCard
                  key={item.user_id}
                  item={item}
                  targetType="startup"
                  query={response.resolved_query}
                  isMasked={isMasked}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-border bg-surface-muted p-4 text-sm text-ink-muted">
              No matches for &ldquo;{response.resolved_query}&rdquo;. Try a broader term or a
              different sector.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
