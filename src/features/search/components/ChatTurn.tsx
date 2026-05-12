import { AlertTriangle } from 'lucide-react';
import { ResultCard } from '@/features/search/components/ResultCard';
import { SearchAnswerBlock } from '@/features/search/components/SearchAnswerBlock';
import type { ConversationResponse, StartupResultItem } from '@/features/search/schemas';

interface Props {
  userMessage: string;
  response: ConversationResponse;
  isMasked: boolean;
}

/**
 * One assistant reply in the conversation thread. Reuses SearchAnswerBlock
 * for the synth path and ResultCard for the card-grid fallback — same
 * affordances as the single-shot search page, just stacked into a thread.
 */
export function ChatTurn({ userMessage, response, isMasked }: Props) {
  const isClarify = response.action === 'clarify';
  const hasResults = response.results.length > 0;
  const resultsByUserId: Record<string, StartupResultItem> = Object.fromEntries(
    response.results.map((r) => [r.user_id, r]),
  );

  return (
    <div className="flex flex-col gap-4">
      {/* User bubble — minimal tinted pill, right-aligned */}
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-brand/10 px-4 py-2 text-[15px] text-ink-heading sm:text-base">
          {userMessage}
        </div>
      </div>

      {/* Assistant reply — flows as prose, no outer container */}
      {isClarify ? (
        <p
          className="max-w-[90%] text-[15px] leading-relaxed text-ink-body"
          data-testid="chat-turn-clarification"
        >
          {response.clarification ?? 'Could you clarify what you’re looking for?'}
        </p>
      ) : response.answer ? (
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
