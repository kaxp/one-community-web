import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/features/search/components/SearchBar';
import { ChatTurn } from '@/features/search/components/ChatTurn';
import { ReadOnlyTurn } from '@/features/search/components/ReadOnlyTurn';
import { RecentChats } from '@/features/search/components/RecentChats';
import { useConversation } from '@/features/search/hooks/use-conversation';
import { type SearchTargetType } from '@/features/search/schemas';
import { useRole } from '@/auth/use-auth';
import { isMaskedSearchRole } from '@/lib/role-capabilities';
import { getConversationHistory, type ConversationHistoryTurn } from '@/api/endpoints';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const role = useRole();
  const isMasked = isMaskedSearchRole(role);

  // ── State ──────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const targetType: SearchTargetType = 'startup';

  const conversation = useConversation({ targetType });
  const threadRef = useRef<HTMLDivElement | null>(null);

  // ── WA → web continuity: ?c=<conversation_id> ─────────────────────────
  // When a user taps "Explore more on your dashboard" from WhatsApp, the magic
  // link includes ?c=<id>. We fetch the stored turns, seed them as read-only
  // history, then clear the param so it doesn't re-trigger on navigations.
  const [preloadedTurns, setPreloadedTurns] = useState<ConversationHistoryTurn[]>([]);
  const [preloadLoading, setPreloadLoading] = useState(false);
  const preloadedRef = useRef<string | null>(null);
  const continuationId = params.get('c')?.trim() ?? '';

  useEffect(() => {
    if (!continuationId || preloadedRef.current === continuationId) return;
    if (conversation.turns.length > 0) return; // active session — don't overwrite
    preloadedRef.current = continuationId;
    setPreloadLoading(true);
    getConversationHistory(continuationId)
      .then((history) => {
        setPreloadedTurns(history.turns);
        // Clean the param without a history push
        const sp = new URLSearchParams(params);
        sp.delete('c');
        setParams(sp, { replace: true });
      })
      .catch(() => {
        // Silently ignore — expired / not found; user just sees the empty state
      })
      .finally(() => setPreloadLoading(false));
  }, [continuationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to the latest turn on every visible state change:
  //  - user just submitted (isPending flips true → show pending spinner at bottom)
  //  - assistant replied (turns.length grows → show the new turn at bottom)
  //
  // requestAnimationFrame defers the scroll one frame so the newly-rendered
  // turn / spinner is laid out before we measure — otherwise smooth-scroll
  // lands on the previous bottom and the user has to scroll manually.
  //
  // JSDOM (used by Vitest) doesn't implement scrollIntoView, so guard it —
  // otherwise tests throw before assertions can run.
  useEffect(() => {
    const el = threadRef.current;
    if (!el || typeof el.scrollIntoView !== 'function') return;
    const id = window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [conversation.turns.length, conversation.isPending]);

  // Auto-submit a ?q= deep link as the first turn. Keep the param URL-only
  // for sharing; we don't echo it back on subsequent edits.
  const autoQ = params.get('q')?.trim() ?? '';
  const autoSubmittedRef = useRef<string | null>(null);
  useEffect(() => {
    if (autoQ && autoSubmittedRef.current !== autoQ && conversation.turns.length === 0) {
      autoSubmittedRef.current = autoQ;
      conversation.submit(autoQ);
    }
  }, [autoQ, conversation]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const onSubmit = () => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    conversation.submit(trimmed);
    setQuery('');
  };

  const onNewChat = () => {
    conversation.reset();
    setQuery('');
    const sp = new URLSearchParams(params);
    sp.delete('q');
    if (sp.toString() !== params.toString()) setParams(sp, { replace: true });
  };

  const hasPreloaded = preloadedTurns.length > 0;
  const hasThread =
    conversation.turns.length > 0 || conversation.isPending || hasPreloaded || preloadLoading;

  const searchControls = (
    <div className="flex flex-col gap-3">
      <SearchBar
        value={query}
        onChange={setQuery}
        onSubmit={onSubmit}
        isPending={conversation.isPending}
      />
      {/* Errors are now displayed inline on the failing turn — no separate
          full-width error card. The ErrorState block that used to live here
          has been removed as part of the ChatGPT-style error UX update. */}
    </div>
  );

  // ── Pristine state: centred hero card + recent conversations ─────────────
  if (!hasThread) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="sr-only">Search</h1>
        <Card>
          <CardHeader>
            <CardTitle>Search the community</CardTitle>
            <CardDescription>
              Conversational search across startups. Ask anything — follow up to refine.
            </CardDescription>
          </CardHeader>
          <CardContent>{searchControls}</CardContent>
        </Card>
        <RecentChats />
      </div>
    );
  }

  // ── Thread state: chat transcript + sticky bottom input ──────────────────
  return (
    <div className="flex flex-col gap-5 pb-36" data-testid="search-thread">
      <h1 className="sr-only">Search</h1>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-muted">
          {conversation.turns.length} {conversation.turns.length === 1 ? 'turn' : 'turns'} in this
          conversation
        </p>
        <Button variant="outline" size="sm" onClick={onNewChat} data-testid="new-chat-button">
          <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden />
          New chat
        </Button>
      </div>

      {/* Pre-loaded history from WhatsApp — read-only, shown before the live thread */}
      {preloadLoading ? (
        <div className="text-sm text-ink-muted" data-testid="preload-loading">
          Loading your WhatsApp conversation…
        </div>
      ) : hasPreloaded ? (
        <div
          className="flex flex-col gap-6 rounded-md border border-border/50 bg-surface-muted/40 p-4"
          data-testid="preloaded-turns"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Continued from WhatsApp
          </p>
          {preloadedTurns.map((t) => (
            <ReadOnlyTurn
              key={t.turn}
              userMessage={t.user_message}
              answerMarkdown={t.answer_markdown}
            />
          ))}
        </div>
      ) : null}

      {/* Thread — each ChatTurn handles its own loading state.
          A pending turn (response === null) shows the user bubble immediately
          plus a SearchLoadingState skeleton below it. No separate outer
          isPending block is needed; it was removed in Phase H.1. */}
      <div className="flex flex-col gap-6" data-testid="chat-thread-turns">
        {conversation.turns.map((t) => (
          <ChatTurn
            key={t.id}
            userMessage={t.userMessage}
            response={t.response}
            isError={t.isError === true}
            isMasked={isMasked}
            onRetry={t.isError ? () => conversation.retry(t.id) : undefined}
          />
        ))}
        <div ref={threadRef} aria-hidden />
      </div>

      {/* Sticky bottom input — same anchor pattern as Phase 1 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur md:left-64 md:px-8 md:py-4">
        <div className="mx-auto max-w-4xl">{searchControls}</div>
      </div>
    </div>
  );
}
